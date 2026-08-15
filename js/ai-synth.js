/**
 * AIVIDEO KEYFRAME SYNTHESIZER
 *
 * Turns real text-to-image model output into motion video.
 *
 * The studio requests a handful of seeded keyframes for the prompt, then this
 * module interpolates between them under a virtual camera move and a film
 * post-processing chain. That is what makes the exported clip actually depict
 * the prompt — the procedural engine in neural-engine.js is the offline
 * fallback for when the model service can't be reached.
 *
 * Keyframes arrive as data: URLs so the canvas stays un-tainted; a tainted
 * canvas cannot be recorded by MediaRecorder.
 */

(function () {
  const KEYFRAME_ENDPOINT = '/api/generate-video';

  // Colour grades, expressed as composite passes so grading stays GPU-side.
  // Per-pixel grading at 1080p x 150 frames is far too slow to record live.
  const LUTS = {
    cyber:  [{ mode: 'overlay',    color: 'rgba(0, 150, 190, 0.30)' },
             { mode: 'soft-light', color: 'rgba(255, 140, 40, 0.26)' }],
    matrix: [{ mode: 'overlay',    color: 'rgba(0, 190, 90, 0.30)' },
             { mode: 'soft-light', color: 'rgba(10, 40, 20, 0.34)' }],
    solar:  [{ mode: 'soft-light', color: 'rgba(255, 175, 40, 0.40)' },
             { mode: 'overlay',    color: 'rgba(120, 60, 0, 0.18)' }],
    biolum: [{ mode: 'overlay',    color: 'rgba(0, 200, 190, 0.34)' },
             { mode: 'soft-light', color: 'rgba(80, 0, 140, 0.24)' }],
    noir:   [{ mode: 'saturation', color: 'hsl(0, 0%, 50%)' },
             { mode: 'soft-light', color: 'rgba(180, 195, 220, 0.22)' }]
  };

  class AIKeyframeSynthesizer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.keyframes = [];
      this.prompt = '';
      this.grainTile = null;
      this.grainPattern = null;
    }

    hasKeyframes() {
      return this.keyframes.length > 0;
    }

    reset() {
      this.keyframes = [];
    }

    /**
     * Requests `count` seeded stills for the prompt and decodes them.
     * Resolves with however many succeeded — the caller decides whether that
     * is enough to synthesize with, so one dead request doesn't fail the run.
     */
    async fetchKeyframes(prompt, opts = {}) {
      const count = Math.max(1, opts.count || 4);
      const { width = 1280, height = 720 } = opts;
      const baseSeed = opts.seed || 1;
      const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : () => {};
      // Chaining trades wall-clock for continuity, so it is opt-out.
      const chain = opts.chain !== false;

      this.reset();
      this.prompt = prompt;

      if (!chain) return this._fetchParallel(prompt, count, width, height, baseSeed, onProgress, opts.signal);
      return this._fetchChained(prompt, count, width, height, baseSeed, onProgress, opts.signal);
    }

    /**
     * Independent frames, all at once. Fast, but each frame is a fresh roll of
     * the scene, so the result cross-dissolves between unrelated images.
     * Kept as the fallback for when chaining fails.
     */
    async _fetchParallel(prompt, count, width, height, baseSeed, onProgress, signal) {
      let done = 0;
      const requests = Array.from({ length: count }, (_, i) =>
        this._fetchOne({ prompt, seed: baseSeed + i * 7919, width, height, index: i, count, signal })
          .then(r => { onProgress(++done, count); return r; })
          .catch(() => { onProgress(++done, count); return null; })
      );

      const settled = await Promise.all(requests);
      this.keyframes = settled.filter(Boolean).map(r => r.image);
      return this.keyframes;
    }

    /**
     * Each frame is an image-to-image edit of the one before it, so the subject,
     * setting and lighting persist and only the moment advances. This is what
     * makes the fallback read as a continuous shot rather than a slideshow.
     *
     * Necessarily sequential — frame N needs frame N-1's URL — so it is slower
     * than the parallel path by roughly the frame count. Partial results are
     * kept: if frame 5 of 8 fails, the first four still make a clip.
     */
    async _fetchChained(prompt, count, width, height, baseSeed, onProgress, signal) {
      const frames = [];
      let previousUrl = null;

      for (let i = 0; i < count; i++) {
        try {
          const result = await this._fetchOne({
            prompt,
            seed: baseSeed + i * 7919,
            width,
            height,
            index: i,
            count,
            signal,
            // The first frame establishes the scene; the rest continue it.
            chainFrom: previousUrl
          });
          frames.push(result.image);
          previousUrl = result.sourceUrl || previousUrl;
        } catch (err) {
          if (err && err.name === 'AbortError') throw err;
          // Losing a link breaks the chain, so stop rather than splicing an
          // unrelated frame into the middle of a continuous shot.
          break;
        }
        onProgress(i + 1, count);
      }

      this.keyframes = frames;
      return this.keyframes;
    }

    async _fetchOne(opts) {
      const res = await fetch(KEYFRAME_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: opts.prompt,
          seed: opts.seed,
          width: opts.width,
          height: opts.height,
          chainFrom: opts.chainFrom || undefined,
          // Nudging each keyframe along the shot gives the interpolation
          // something to move through when chaining isn't available.
          shotProgress: opts.count > 1 ? opts.index / (opts.count - 1) : 0
        }),
        signal: opts.signal
      });

      if (!res.ok) throw new Error(`keyframe request failed: ${res.status}`);
      const data = await res.json();
      if (!data || !data.success || !data.dataUrl) {
        throw new Error(data && data.error ? data.error : 'keyframe unavailable');
      }
      return { image: await this._decode(data.dataUrl), sourceUrl: data.sourceUrl };
    }

    _decode(dataUrl) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('keyframe decode failed'));
        img.src = dataUrl;
      });
    }

    /**
     * Virtual camera. `p` runs 0..1 across the whole clip, so moves travel in
     * one direction over the shot instead of oscillating in place — that is
     * the difference between a camera move and a wobble.
     */
    _camera(mode, p, strength) {
      const s = strength / 75; // 75 is the UI default, so it maps to 1.0
      const ease = p * p * (3 - 2 * p); // smoothstep: ease in and out
      const t = { scale: 1.06, dx: 0, dy: 0, rot: 0 };

      switch (mode) {
        case 'Pan Left':
          t.dx = ease * 0.16 * s; t.scale = 1.18; break;
        case 'Pan Right':
          t.dx = -ease * 0.16 * s; t.scale = 1.18; break;
        case 'Tilt Up':
          t.dy = ease * 0.14 * s; t.scale = 1.18; break;
        case 'Tilt Down':
          t.dy = -ease * 0.14 * s; t.scale = 1.18; break;
        case 'Zoom In':
          t.scale = 1.02 + ease * 0.30 * s; break;
        case 'Zoom Out':
          t.scale = 1.34 - ease * 0.30 * s; break;
        case 'Orbit 360°':
          t.rot = Math.sin(p * Math.PI * 2) * 0.05 * s;
          t.dx = Math.sin(p * Math.PI * 2) * 0.06 * s;
          t.scale = 1.20 + Math.cos(p * Math.PI * 2) * 0.04;
          break;
        case 'Drone Overhead':
          t.dy = -ease * 0.18 * s;
          t.scale = 1.30 - ease * 0.18 * s;
          t.rot = ease * 0.03 * s;
          break;
        case 'Crane':
          // Rising boom: the frame lifts while easing back, the way a crane
          // reveals a scene.
          t.dy = ease * 0.15 * s;
          t.scale = 1.26 - ease * 0.14 * s;
          break;
        case 'FPV Dive':
          t.scale = 1.02 + Math.pow(ease, 1.7) * 0.55 * s;
          t.dy = -Math.pow(ease, 1.7) * 0.10 * s;
          t.rot = Math.sin(p * Math.PI * 3) * 0.02 * s;
          break;
        default:
          t.scale = 1.06 + ease * 0.10 * s;
      }
      return t;
    }

    /** Draws an image so it covers the frame, under the given camera transform. */
    _drawTransformed(img, cam, alpha) {
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;

      const cover = Math.max(w / img.width, h / img.height) * cam.scale;
      const dw = img.width * cover;
      const dh = img.height * cover;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(w / 2 + cam.dx * w, h / 2 + cam.dy * h);
      ctx.rotate(cam.rot);
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
    }

    _grain(amount) {
      if (amount <= 0) return;
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;

      if (!this.grainTile) {
        // One 128px noise tile, generated once and scattered per frame. Building
        // full-frame noise every frame cannot keep up with live recording.
        const tile = document.createElement('canvas');
        tile.width = tile.height = 128;
        const tctx = tile.getContext('2d');
        const img = tctx.createImageData(128, 128);
        for (let i = 0; i < img.data.length; i += 4) {
          const v = 110 + Math.random() * 90;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
          img.data[i + 3] = 255;
        }
        tctx.putImageData(img, 0, 0);
        this.grainTile = tile;
      }

      // Pattern object is reusable; rebuilding it every frame costs real time
      // at 1080p and drags the captured frame rate down.
      if (!this.grainPattern) {
        this.grainPattern = ctx.createPattern(this.grainTile, 'repeat');
      }

      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = Math.min(0.5, (amount / 100) * 0.42);
      // Random offset per frame keeps the grain from freezing into a pattern.
      ctx.translate(-Math.floor(Math.random() * 128), -Math.floor(Math.random() * 128));
      ctx.fillStyle = this.grainPattern;
      ctx.fillRect(0, 0, w + 128, h + 128);
      ctx.restore();
    }

    _grade(lut) {
      const passes = LUTS[lut];
      if (!passes) return;
      const ctx = this.ctx;
      ctx.save();
      passes.forEach(pass => {
        ctx.globalCompositeOperation = pass.mode;
        ctx.fillStyle = pass.color;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      });
      ctx.restore();
    }

    _atmosphere(fog, flare, p) {
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;

      if (fog > 0) {
        const g = ctx.createLinearGradient(0, h * 0.25, 0, h);
        g.addColorStop(0, `rgba(150, 175, 205, ${(fog / 100) * 0.16})`);
        g.addColorStop(1, 'rgba(150, 175, 205, 0)');
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      if (flare > 0) {
        const a = (flare / 100) * 0.5;
        const y = h * (0.40 + Math.sin(p * Math.PI * 2) * 0.05);
        const g = ctx.createLinearGradient(0, y, w, y);
        g.addColorStop(0, 'rgba(0, 220, 255, 0)');
        g.addColorStop(0.45, `rgba(0, 220, 255, ${a * 0.55})`);
        g.addColorStop(0.5, `rgba(255, 255, 255, ${a})`);
        g.addColorStop(0.55, `rgba(255, 70, 120, ${a * 0.55})`);
        g.addColorStop(1, 'rgba(255, 70, 120, 0)');
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = g;
        ctx.fillRect(0, y - h * 0.006, w, h * 0.012);
        ctx.restore();
      }

      // 35mm vignette, always on — it is what sells the frame as photographed.
      const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.34,
                                           w / 2, h / 2, Math.max(w, h) * 0.72);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.52)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    }

    /**
     * Grade + atmosphere + grain over whatever is already on the canvas.
     *
     * Exposed so the procedural fallback engine gets the same look and the
     * same live FX controls — it renders the scene, this owns the finish.
     */
    applyPostFx(opts = {}) {
      const p = Math.max(0, Math.min(1, (opts.time || 0) / (opts.duration || 5)));
      this._grade(opts.lut || 'cyber');
      this._atmosphere(
        opts.fog !== undefined ? opts.fog : 50,
        opts.flare !== undefined ? opts.flare : 80,
        p
      );
      this._grain(opts.grain !== undefined ? opts.grain : 35);
    }

    /**
     * Composites one frame. `t` is seconds into the clip.
     */
    renderFrame(t, opts = {}) {
      if (!this.hasKeyframes()) return false;

      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;
      const duration = opts.duration || 5;
      const p = Math.max(0, Math.min(1, t / duration));

      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);

      // Walk the keyframe strip and cross-dissolve between neighbours.
      const n = this.keyframes.length;
      const pos = p * (n - 1);
      const i = Math.min(Math.floor(pos), n - 1);
      // Ease the dissolve instead of ramping it linearly. A linear cross-fade
      // spends the middle of every transition showing two images at half
      // opacity, which is exactly when the ghosting is most visible;
      // smoothstep moves quickly through that midpoint.
      const raw = pos - i;
      const blend = raw * raw * (3 - 2 * raw);
      const cam = this._camera(opts.cameraMotion, p, opts.motionStrength || 75);

      this._drawTransformed(this.keyframes[i], cam, 1);
      if (blend > 0 && i + 1 < n) {
        // Give the incoming frame a slightly advanced camera so the dissolve
        // reads as continuous motion rather than a cut.
        const camNext = this._camera(opts.cameraMotion, Math.min(1, p + 0.02), opts.motionStrength || 75);
        this._drawTransformed(this.keyframes[i + 1], camNext, blend);
      }

      ctx.restore();

      this._grade(opts.lut || 'cyber');
      this._atmosphere(
        opts.fog !== undefined ? opts.fog : 50,
        opts.flare !== undefined ? opts.flare : 80,
        p
      );
      this._grain(opts.grain !== undefined ? opts.grain : 35);

      return true;
    }
  }

  window.AIKeyframeSynthesizer = AIKeyframeSynthesizer;
})();
