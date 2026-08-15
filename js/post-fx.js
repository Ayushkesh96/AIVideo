/**
 * CINEMATIC POST-PROCESSING CHAIN
 *
 * Applies the film look — colour grade, atmosphere (fog/flare/vignette) and
 * grain — over whatever the active engine already drew on the canvas. This is
 * shared finishing, not a renderer: it composites on top, it never decides
 * what the scene contains.
 *
 * Previously this module also fetched AI-generated still frames from a hosted
 * image model and interpolated between them under a virtual camera, as a
 * higher-fidelity alternative to the on-device engine. That path depended on
 * a metered, paid upstream (Pollinations) and has been removed — the on-device
 * procedural engine (neural-engine.js) is now the only renderer, and this
 * module owns just the shared finishing pass on top of it.
 */

(function () {
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

  class CinemaPostFx {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.grainTile = null;
      this.grainPattern = null;
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

    /** Grade + atmosphere + grain over whatever is already on the canvas. */
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
  }

  window.CinemaPostFx = CinemaPostFx;
})();
