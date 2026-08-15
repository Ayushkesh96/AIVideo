/**
 * AIVIDEO CINEMA STUDIO 5.0 — MASTER CONTROLLER (PHASE 2 FULL FUNCTIONALITY)
 * Connects all controls: Model Tabs, AI Enhance, Camera Rig, Aspect Ratio,
 * Image Upload, Generation Pipeline (Live/Simulation), Reel, Color Grading & FX.
 */

(function () {
  let canvas = null;
  let neuralEngine = null;
  let audioEngine = null;
  let mediaRecorder = null;
  let recordedChunks = [];
  let animFrameId = null;
  let sceneTick = 0;
  let isPlaying = true;
  let isGenerating = false;
  let playbackSpeed = 1.0;
  let activeLut = "cyber";
  let flareStrength = 80;
  let grainStrength = 35;
  let fogStrength = 50;
  let generatedBlob = null;
  let generatedVideoUrl = null;
  let aiSynth = null;

  // Real text-to-video state. `resultVideo` is a <video> laid over the canvas:
  // when a model returns an actual clip we play the file itself rather than
  // re-rendering it, so what the user sees is what they downloaded.
  let resultVideo = null;
  let realVideoUrl = null;
  let realVideoExt = 'mp4';
  let activeProviderLabel = null;
  let generationAbort = null;
  let providerCaps = null;
  let renderQuality = '1080p';
  let renderDuration = 5;

  const LUT_FILTERS = {
    cyber: 'hue-rotate(-10deg) saturate(1.45) contrast(1.15)',
    matrix: 'hue-rotate(65deg) saturate(1.2) contrast(1.25) brightness(0.95)',
    solar: 'sepia(0.35) saturate(1.6) contrast(1.1) hue-rotate(5deg)',
    biolum: 'hue-rotate(140deg) saturate(1.5) contrast(1.2)',
    noir: 'grayscale(1.0) contrast(1.4) brightness(0.9)'
  };

  function initStudio() {
    canvas = document.getElementById('studio-viewport-canvas');
    if (canvas && window.NeuralVideoEngine) {
      neuralEngine = new window.NeuralVideoEngine(canvas);
    }
    if (canvas && window.AIKeyframeSynthesizer) {
      aiSynth = new window.AIKeyframeSynthesizer(canvas);
    }
    if (window.CinemaAudioEngine) {
      audioEngine = new window.CinemaAudioEngine();
    }

    ensureResultVideoElement();
    bindAllControls();
    loadActiveShotData();
    resizeCanvas();
    startPreviewLoop();
    renderGenerationReel();
    refreshProviderStatus();
  }

  /**
   * The <video> that plays a real model render, stacked over the canvas.
   * Created here rather than in markup so the studio degrades cleanly on a
   * page that predates it.
   */
  function ensureResultVideoElement() {
    if (!canvas || !canvas.parentElement) return;
    resultVideo = document.getElementById('studio-result-video');
    if (resultVideo) return;

    resultVideo = document.createElement('video');
    resultVideo.id = 'studio-result-video';
    resultVideo.className = 'viewport-canvas';
    resultVideo.setAttribute('playsinline', '');
    resultVideo.loop = true;
    resultVideo.controls = false;
    // Models that emit audio (Veo, Sora) would otherwise be blocked from
    // autoplaying; the user can unmute from the transport controls.
    resultVideo.muted = true;
    resultVideo.style.cssText =
      'position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:none; z-index:2; background:#000;';
    canvas.parentElement.appendChild(resultVideo);
  }

  function showRealVideo(url) {
    if (!resultVideo) return;
    resultVideo.src = url;
    resultVideo.style.display = 'block';
    if (canvas) canvas.style.visibility = 'hidden';
    const play = resultVideo.play();
    if (play && typeof play.catch === 'function') play.catch(() => {});
  }

  /** Returns the viewport to the live canvas engine. */
  function hideRealVideo() {
    if (resultVideo) {
      resultVideo.pause();
      resultVideo.removeAttribute('src');
      resultVideo.load();
      resultVideo.style.display = 'none';
    }
    if (canvas) canvas.style.visibility = 'visible';
  }

  /**
   * Asks the backend which real models are reachable and reflects that in the
   * UI. A deployment with no API key still works — it just runs the local
   * keyframe engine, and the badge says so instead of implying otherwise.
   */
  async function refreshProviderStatus() {
    if (!window.AIVideoEngine) return;
    try {
      providerCaps = await window.AIVideoEngine.capabilities();
    } catch (err) {
      providerCaps = null;
    }

    const badge = document.getElementById('studio-provider-badge');
    if (badge) {
      if (providerCaps && !providerCaps.fallbackOnly) {
        const active = (providerCaps.providers || []).find(p => p.id === providerCaps.active);
        // Name the host as well as the model: "Veo 3" alone is ambiguous when
        // three different providers can serve it.
        badge.textContent = active
          ? `${active.label} · ${active.activeModelLabel || active.activeModel}`
          : 'LIVE MODEL';
        // A keyless attempt may still be refused upstream, so it must not be
        // dressed up the same as a provisioned model.
        badge.classList.toggle('is-live', !providerCaps.keyless);
        badge.classList.toggle('is-besteffort', Boolean(providerCaps.keyless));
        badge.title = providerCaps.keyless
          ? 'No API key is set, so the studio will try a real video model anonymously. That can be refused or rate limited — ' +
            'if it is, the local keyframe engine renders instead. A free key from enter.pollinations.ai (POLLINATIONS_KEY) makes this reliable.'
          : (active
            ? `Real text-to-video is active: ${active.activeModelLabel} (${active.activeModel}) via ${active.label}. Max ${active.maxResolution}p.`
            : 'Real text-to-video is active.');
      } else {
        badge.textContent = 'LOCAL ENGINE';
        badge.classList.remove('is-live');
        badge.title =
          'No video model API key is configured, so clips are synthesized locally from generated stills. ' +
          'Add FAL_KEY, GEMINI_API_KEY, REPLICATE_API_TOKEN, RUNWAYML_API_SECRET or LUMAAI_API_KEY to enable a real video model.';
      }
    }

    // 4K is only offered when a configured model can actually deliver it;
    // otherwise the button would promise something the backend downgrades.
    const maxRes = providerCaps ? providerCaps.maxResolution || 0 : 0;
    document.querySelectorAll('.quality-btn').forEach(btn => {
      const needs = parseInt(btn.dataset.minHeight || '0', 10);
      const reachable = needs <= maxRes;
      btn.disabled = !reachable;
      btn.classList.toggle('is-unavailable', !reachable);
      if (!reachable) {
        btn.title = maxRes
          ? `The configured model tops out at ${maxRes}p.`
          : 'Configure a video model API key to render above the local engine.';
      } else {
        btn.title = '';
      }
    });
  }

  function resizeCanvas(customWidth, customHeight) {
    if (!canvas || !canvas.parentElement) return;
    if (customWidth && customHeight) {
      canvas.width = customWidth;
      canvas.height = customHeight;
      return;
    }
    const parentWidth = canvas.parentElement.clientWidth || 800;
    const parentHeight = canvas.parentElement.clientHeight || 450;
    canvas.width = Math.min(parentWidth, 1280);
    canvas.height = Math.min(parentHeight, 720);
  }

  function loadActiveShotData() {
    if (!window.FilmOS) return;
    const shot = window.FilmOS.getActiveShot();
    if (!shot) return;

    const promptInput = document.getElementById('studio-prompt-input');
    if (promptInput) promptInput.value = shot.prompt || "";

    // Aspect Ratio Container
    setAspectRatio(shot.aspectRatio || "16:9");

    // Camera Choreography
    setCameraMode(shot.camera || "Orbit 360°");

    // Motion Speed
    const motionSlider = document.getElementById('motion-strength-slider');
    const motionVal = document.getElementById('motion-strength-val');
    if (motionSlider && motionVal) {
      motionSlider.value = shot.motionSpeed || 75;
      motionVal.textContent = `${shot.motionSpeed || 75}%`;
    }

    // Model Selector
    setModel(shot.model || "Seedance 2.5 (1080p)");

    // Lens & Rig
    setLens(shot.lens || "35mm");
    setRig(shot.rig || "Orbit 360°");

    // FX Compositor
    if (shot.fx) {
      setLut(shot.fx.lut || "cyber");
      setSpeed(shot.fx.speed || 1.0);
    }
  }

  function renderSceneFrame(t) {
    if (window.FilmOS) {
      const shot = window.FilmOS.getActiveShot();
      const prompt = shot ? shot.prompt : "cinematic scene";
      const camera = shot ? shot.camera : "Orbit 360°";
      const motionSpeed = shot ? shot.motionSpeed : 75;

      if (aiSynth && aiSynth.hasKeyframes()) {
        // These key names must match AIKeyframeSynthesizer.renderFrame's
        // options exactly — it reads cameraMotion/motionStrength/lut, and
        // anything else silently falls through to its defaults, which is how
        // the camera rig and colour grade used to get dropped on this path.
        const rendered = aiSynth.renderFrame(t * playbackSpeed, {
          cameraMotion: camera,
          motionStrength: motionSpeed,
          lut: activeLut,
          flare: flareStrength,
          grain: grainStrength,
          fog: fogStrength,
          duration: renderDuration
        });
        if (rendered) return;
      }

      if (neuralEngine) {
        neuralEngine.renderFrame(
          t * playbackSpeed,
          prompt,
          camera,
          motionSpeed,
          4829103,
          activeLut,
          flareStrength,
          grainStrength,
          fogStrength
        );
      }
    }
  }

  function startPreviewLoop() {
    function loop() {
      if (isPlaying && !isGenerating) {
        sceneTick += (1 / 30) * playbackSpeed;
        const duration = 5.0;
        const curTime = sceneTick % duration;
        updateTimeHUD(curTime, duration);
        renderSceneFrame(curTime);
      }
      animFrameId = requestAnimationFrame(loop);
    }
    loop();
  }

  function updateTimeHUD(cur, total) {
    const timeDisplay = document.getElementById('studio-time-display');
    const timelineProgress = document.getElementById('studio-timeline-progress');
    if (!timeDisplay || !timelineProgress) return;

    const currentSec = cur.toFixed(1);
    const totalSec = total.toFixed(1);
    timeDisplay.textContent = `00:${currentSec.padStart(4, '0')} / 00:${totalSec.padStart(4, '0')}`;
    const pct = (cur / total) * 100;
    timelineProgress.style.width = `${pct}%`;
  }

  // 2.1 Model Engine
  function setModel(modelName) {
    if (window.FilmOS) {
      window.FilmOS.state.activeModel = modelName;
      window.FilmOS.updateActiveShot({ model: modelName });
    }

    document.querySelectorAll('.model-pill-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.model === modelName);
    });

    const badge = document.querySelector('.studio-panel-title .badge-lime');
    if (badge) badge.textContent = modelName.toUpperCase();

    const hudTag = document.getElementById('hud-model-tag');
    if (hudTag) hudTag.textContent = modelName;
  }

  // 2.2 Scene Prompt AI Enhancer
  async function enhancePrompt() {
    const promptInput = document.getElementById('studio-prompt-input');
    const btn = document.getElementById('ai-enhance-prompt-btn');
    if (!promptInput || !btn) return;

    const basePrompt = promptInput.value.trim();
    if (!basePrompt) return;

    const origBtnHtml = btn.innerHTML;
    btn.innerHTML = `<span class="render-spinner" style="width:12px; height:12px; border-width:1.5px; border-top-color:#000;"></span> <span>Enhancing...</span>`;
    btn.disabled = true;

    const config = window.FilmOS ? window.FilmOS.state.apiConfig : {};
    const shot = window.FilmOS ? window.FilmOS.getActiveShot() : null;
    const lens = shot && shot.lens ? shot.lens : "24mm";
    const rig = shot && shot.motionRig ? shot.motionRig : (shot && shot.camera ? shot.camera : "Dolly");
    const body = shot && shot.cameraBody ? shot.cameraBody : "ARRI Alexa Mini";

    if (config && config.llmEndpoint && config.llmKey) {
      try {
        const res = await fetch(config.llmEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.llmKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: `You are a Hollywood cinematographer and director. Rewrite the user prompt into a rich, detailed visual cinematic prompt specifying shot on ${body} with a ${lens} lens and ${rig} motion choreography.` },
              { role: "user", content: basePrompt }
            ]
          })
        });
        const data = await res.json();
        if (data.choices && data.choices[0] && data.choices[0].message) {
          promptInput.value = data.choices[0].message.content.trim();
        }
      } catch (err) {
        console.warn("LLM API failed, falling back to local rule enhancer:", err);
        applyLocalEnhancer(promptInput, basePrompt, lens, rig, body);
      }
    } else {
      // Local Intelligent Cinematic Expander
      await new Promise(r => setTimeout(r, 600));
      applyLocalEnhancer(promptInput, basePrompt, lens, rig, body);
    }

    btn.innerHTML = origBtnHtml;
    btn.disabled = false;

    if (window.FilmOS) {
      window.FilmOS.updateActiveShot({ prompt: promptInput.value });
    }
    if (window.showToast) window.showToast("✨ AI Prompt Enhanced with Cinematic Tokens!");
  }

  function applyLocalEnhancer(input, base, lens, rig, body) {
    const tokens = [
      `shot on ${body || 'ARRI Alexa Mini'} with a ${lens || '24mm'} lens`,
      `${rig || 'Dolly'} motion rig`,
      "volumetric God-rays & atmospheric mist",
      "shallow depth of field with 35mm Hollywood grain",
      "subsurface skin scattering and 8k hyper-detailed textures"
    ];
    input.value = `${base}, ${tokens.join(', ')}`;
  }

  // 2.3 Camera Choreography
  function setCameraMode(mode) {
    if (window.FilmOS) {
      window.FilmOS.updateActiveShot({ camera: mode });
    }
    document.querySelectorAll('.camera-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.camera === mode);
    });
    const hud = document.getElementById('hud-motion-tag');
    if (hud) hud.textContent = mode;
  }

  // 2.4 Aspect Ratio
  function setAspectRatio(ratio) {
    if (window.FilmOS) {
      window.FilmOS.state.aspectRatio = ratio;
      window.FilmOS.updateActiveShot({ aspectRatio: ratio });
    }
    document.querySelectorAll('.ratio-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.ratio === ratio);
    });
    const container = document.querySelector('.viewport-canvas-container');
    if (container) {
      container.className = `viewport-canvas-container aspect-${ratio.replace(':', '-')}`;
    }
    resizeCanvas();
  }

  // 2.11 Lens & Rig
  function setLens(lens) {
    if (window.FilmOS) window.FilmOS.updateActiveShot({ lens });
    document.querySelectorAll('.camera-rig-selector button').forEach(b => {
      if (b.textContent.includes(lens)) {
        b.parentElement.querySelectorAll('button').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
      }
    });
  }

  function setRig(rig) {
    if (window.FilmOS) window.FilmOS.updateActiveShot({ rig });
    setCameraMode(rig);
  }

  // 2.9 Color Grading & FX Compositor
  function setLut(lut) {
    activeLut = lut;
    document.querySelectorAll('.lut-btn').forEach(b => b.classList.toggle('active', b.dataset.lut === lut));
    const container = document.querySelector('.viewport-canvas-container');
    if (container) {
      container.style.filter = LUT_FILTERS[lut] || 'none';
    }
    if (window.FilmOS) window.FilmOS.updateActiveShot({ fx: { lut, flare: flareStrength, grain: grainStrength, fog: fogStrength, speed: playbackSpeed } });
  }

  function setSpeed(spd) {
    playbackSpeed = parseFloat(spd);
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.toggle('active', parseFloat(b.dataset.speed) === playbackSpeed));
  }

  /**
   * A real video model takes camera direction as language, not as a canvas
   * transform — "slow dolly in" belongs in the prompt, where the rig selector
   * only ever reached the local compositor before.
   */
  const CAMERA_DIRECTION = {
    'Pan Left': 'the camera pans smoothly to the left',
    'Pan Right': 'the camera pans smoothly to the right',
    'Tilt Up': 'the camera tilts upward',
    'Tilt Down': 'the camera tilts downward',
    'Zoom In': 'a slow push-in toward the subject',
    'Zoom Out': 'a slow pull-back revealing the wider scene',
    'Orbit 360°': 'the camera orbits around the subject in a smooth arc',
    'Drone Overhead': 'a rising aerial drone shot looking down over the scene',
    'FPV Dive': 'a fast FPV drone dive racing through the scene'
  };

  function buildModelPrompt(basePrompt, camera, lens) {
    const parts = [basePrompt];
    const move = CAMERA_DIRECTION[camera];
    if (move) parts.push(move);
    if (lens) parts.push(`shot on a ${lens} lens`);
    parts.push('cinematic, photorealistic, natural motion');
    return parts.join(', ');
  }

  /** Object URLs are only freed here; leaking them holds whole clips in memory. */
  function releaseRealVideo() {
    if (realVideoUrl && realVideoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(realVideoUrl);
    }
    realVideoUrl = null;
    activeProviderLabel = null;
  }

  function setRenderProgress(fraction, text) {
    const progressFill = document.getElementById('render-progress-fill');
    const renderStatus = document.getElementById('render-status-text');
    if (progressFill) progressFill.style.width = `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`;
    if (renderStatus && text) renderStatus.textContent = text;
  }

  // 2.6 Generation pipeline.
  //
  // Two engines, tried in order:
  //   1. A real text-to-video model, when a provider key is configured. This is
  //      the only path that can actually depict what the prompt describes.
  //   2. The local keyframe synthesizer, which animates generated stills. It
  //      always works and needs no key, but it cannot invent motion.
  async function startGeneration() {
    if (isGenerating || !canvas) return;
    isGenerating = true;
    isPlaying = false;
    recordedChunks = [];
    generatedBlob = null;
    releaseRealVideo();
    hideRealVideo();

    const overlay = document.getElementById('studio-rendering-overlay');
    if (overlay) overlay.classList.add('active');

    const promptInput = document.getElementById('studio-prompt-input');
    let prompt = promptInput ? promptInput.value.trim() : '';
    if (!prompt) {
      if (overlay) overlay.classList.remove('active');
      isGenerating = false;
      isPlaying = true;
      if (window.showToast) window.showToast('⚠ Describe the shot first — the prompt is empty.');
      return;
    }
    if (window.FilmOS) {
      prompt = window.FilmOS.resolveMentions(prompt);
      window.FilmOS.updateActiveShot({ prompt: promptInput.value });
    }

    const shot = window.FilmOS ? window.FilmOS.getActiveShot() : null;
    const camera = shot && shot.camera ? shot.camera : 'Orbit 360°';
    const lens = shot && shot.lens ? shot.lens : '';
    const ratio = window.FilmOS ? (window.FilmOS.state.aspectRatio || '16:9') : '16:9';

    if (window.showToast) window.showToast(`⚡ Generating video for "${prompt.slice(0, 26)}..."`);

    generationAbort = typeof AbortController !== 'undefined' ? new AbortController() : null;

    // --- Path 1: real text-to-video model -----------------------------------
    if (window.AIVideoEngine) {
      setRenderProgress(0.01, 'Submitting to video model...');
      let result;
      try {
        result = await window.AIVideoEngine.generate({
          prompt: buildModelPrompt(prompt, camera, lens),
          aspectRatio: ratio,
          quality: renderQuality,
          durationSec: renderDuration,
          signal: generationAbort ? generationAbort.signal : undefined,
          onProgress: info => {
            setRenderProgress(info.progress, describeProgress(info));
          }
        });
      } catch (err) {
        if (err && err.name === 'AbortError') {
          if (overlay) overlay.classList.remove('active');
          isGenerating = false;
          isPlaying = true;
          return;
        }
        result = { ok: false, fallback: true, error: err.message };
      }

      if (result && result.ok) {
        setRenderProgress(0.99, 'Downloading master file...');

        // Pulling the file down once means playback, scrubbing and export all
        // work from the same local copy, and the download is instant. A direct
        // (synchronous) provider already handed us the bytes.
        const blob = result.blob || await window.AIVideoEngine.toBlob(result.videoUrl);
        if (blob) {
          generatedBlob = blob;
          realVideoUrl = URL.createObjectURL(blob);
          realVideoExt = (blob.type && blob.type.indexOf('webm') >= 0) ? 'webm' : 'mp4';
        } else {
          // CORS refused the read; the clip still plays straight from source.
          realVideoUrl = result.videoUrl;
          realVideoExt = 'mp4';
        }

        generatedVideoUrl = realVideoUrl;
        activeProviderLabel = result.modelLabel || result.provider;
        showRealVideo(realVideoUrl);
        finishGeneration(prompt, camera, `✓ Rendered by ${activeProviderLabel}. Click 'Export Video File' to download.`);
        return;
      }

      // Falling through is normal on a keyless deployment; say why, once.
      if (result && result.error) {
        console.warn('Video model unavailable, using local engine:', result.error);
        if (window.showToast) {
          window.showToast(
            result.reason === 'no_provider_configured'
              ? 'ℹ No video model key configured — rendering with the local engine.'
              : `ℹ Video model unavailable (${result.error.slice(0, 60)}) — using local engine.`
          );
        }
      }
    }

    // --- Path 2: local keyframe synthesizer ---------------------------------
    await runLocalGeneration(prompt, camera, ratio);
  }

  function describeProgress(info) {
    const seconds = info.elapsedMs ? Math.round(info.elapsedMs / 1000) : 0;
    const suffix = seconds > 3 ? ` (${seconds}s)` : '';
    if (info.phase === 'queued') return `${info.detail || 'Queued'}${suffix}`;
    if (info.phase === 'succeeded') return info.detail || 'Complete';
    return `${info.detail || 'Rendering'}${suffix}`;
  }

  /**
   * The keyless path: request stills for the prompt, animate them under the
   * virtual camera, and capture the canvas to a real .webm file.
   */
  async function runLocalGeneration(prompt, camera, ratio) {
    const overlay = document.getElementById('studio-rendering-overlay');

    // Canvas backing resolution. MediaRecorder captures at whatever the canvas
    // is, so this is what actually determines export resolution here.
    const heights = { '720p': 720, '1080p': 1080, '4k': 2160 };
    const targetHeight = heights[renderQuality] || 1080;
    const ratios = { '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1, '21:9': 21 / 9 };
    const targetWidth = Math.round((targetHeight * (ratios[ratio] || ratios['16:9'])) / 2) * 2;
    resizeCanvas(targetWidth, targetHeight);

    if (aiSynth) {
      setRenderProgress(0.02, 'Generating diffusion keyframes...');
      try {
        await aiSynth.fetchKeyframes(prompt, {
          // More keyframes across the shot means less time held on any single
          // still, which is what makes the fallback read as motion at all.
          count: 6,
          width: Math.min(targetWidth, 1920),
          height: Math.min(targetHeight, 1080),
          seed: Math.floor(Math.random() * 899999 + 100000),
          signal: generationAbort ? generationAbort.signal : undefined,
          onProgress: (done, total) => {
            setRenderProgress((done / total) * 0.35, `Generating keyframe ${done}/${total}...`);
          }
        });
      } catch (err) {
        console.warn('Keyframe synthesis failed, using procedural engine:', err);
      }
    }

    try {
      const stream = canvas.captureStream ? canvas.captureStream(30) : null;
      if (stream && typeof MediaRecorder !== 'undefined') {
        let mimeType = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
        // 4K needs far more headroom than 1080p or the encoder smears motion.
        const bitrate = targetHeight >= 2160 ? 40000000 : (targetHeight >= 1080 ? 16000000 : 8000000);
        mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
        mediaRecorder.ondataavailable = e => {
          if (e.data && e.data.size > 0) recordedChunks.push(e.data);
        };
        mediaRecorder.onstop = () => {
          if (recordedChunks.length > 0) {
            generatedBlob = new Blob(recordedChunks, { type: 'video/webm' });
            generatedVideoUrl = URL.createObjectURL(generatedBlob);
            realVideoExt = 'webm';
          }
        };
        mediaRecorder.start();
      }
    } catch (e) {
      console.warn('MediaRecorder setup:', e);
    }

    await new Promise(resolve => {
      const fps = 30;
      const totalFrames = renderDuration * fps;
      let frame = 0;

      function step() {
        if (!isGenerating) return resolve();
        frame++;
        renderSceneFrame(frame / fps);

        const progress = 0.35 + (frame / totalFrames) * 0.65;
        setRenderProgress(progress, `Compositing frame ${frame}/${totalFrames}...`);

        if (frame < totalFrames) {
          setTimeout(() => requestAnimationFrame(step), 1000 / fps);
        } else {
          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            try { mediaRecorder.stop(); } catch (err) {}
          }
          // onstop fires asynchronously; the blob is not ready before it does.
          setTimeout(resolve, 350);
        }
      }
      requestAnimationFrame(step);
    });

    if (overlay) overlay.classList.remove('active');
    finishGeneration(prompt, camera, "✓ Video synthesized locally. Click 'Export Video File' to download.");
  }

  /** Shared completion: close the overlay, log the clip, tell the user. */
  function finishGeneration(prompt, camera, message) {
    const overlay = document.getElementById('studio-rendering-overlay');
    if (overlay) overlay.classList.remove('active');
    isGenerating = false;
    isPlaying = true;
    sceneTick = 0;
    generationAbort = null;

    if (window.FilmOS) {
      const shot = window.FilmOS.getActiveShot();
      window.FilmOS.addReelItem({
        id: `gen-${Date.now()}`,
        title: shot ? `Shot ${shot.code}: ${shot.title}` : 'Clip #' + Date.now(),
        prompt: prompt,
        model: activeProviderLabel || (window.FilmOS.state.activeModel),
        camera: camera,
        timestamp: Date.now(),
        url: generatedVideoUrl
      });
      renderGenerationReel();
    }

    if (window.showToast && message) window.showToast(message);
  }

  // 2.8 Recent Generation Reel Renderer
  function renderGenerationReel() {
    const strip = document.getElementById('studio-history-strip');
    if (!strip || !window.FilmOS) return;
    strip.innerHTML = '';

    const reel = window.FilmOS.state.generationReel || [];
    reel.forEach((item, idx) => {
      const div = document.createElement('div');
      div.className = `history-thumb-item ${idx === 0 ? 'active' : ''}`;
      div.title = `${item.title}\n${item.prompt}\n(Click to reload | Right-click to Add to Timeline)`;
      div.innerHTML = `
        <div style="background:linear-gradient(135deg, #1c1c28, #ff0055); width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:0.65rem; color:#fff; font-weight:800; text-align:center; padding:2px;">
          CLIP #${idx + 1}
        </div>
      `;

      // Left Click = Reload clip settings
      div.addEventListener('click', () => {
        document.querySelectorAll('.history-thumb-item').forEach(d => d.classList.remove('active'));
        div.classList.add('active');
        const promptInput = document.getElementById('studio-prompt-input');
        if (promptInput) promptInput.value = item.prompt;
        setCameraMode(item.camera || 'Orbit 360°');

        // Reel entries from this session still hold a playable URL; replay the
        // clip itself rather than only restoring the settings that made it.
        if (item.url) {
          generatedVideoUrl = item.url;
          activeProviderLabel = item.model || null;
          showRealVideo(item.url);
        } else {
          hideRealVideo();
        }

        if (window.showToast) window.showToast(`✓ Loaded Clip #${idx + 1}.`);
      });

      // Right Click = Add to NLE Timeline
      div.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        window.FilmOS.state.timeline.tracks.video.push({
          id: `clip-v-${Date.now()}`,
          shotId: item.id,
          start: 0,
          duration: 4,
          label: item.title || `Clip #${idx + 1}`
        });
        window.FilmOS.save();
        if (window.showToast) window.showToast(`✓ Added Clip #${idx + 1} to Video Timeline!`);
      });

      strip.appendChild(div);
    });
  }

  // 2.5 Image-to-Video Upload Handler
  function bindImageUploader() {
    const dropzone = document.querySelector('.ref-uploader');
    if (!dropzone) return;

    let fileInput = document.getElementById('hidden-ref-image-input');
    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.id = 'hidden-ref-image-input';
      fileInput.accept = 'image/png,image/jpeg,image/webp';
      fileInput.style.display = 'none';
      dropzone.parentElement.appendChild(fileInput);
    }

    dropzone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleImageFile(file, dropzone);
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = 'var(--accent-lime)';
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.style.borderColor = 'var(--border-subtle)';
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = 'var(--border-subtle)';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleImageFile(e.dataTransfer.files[0], dropzone);
      }
    });
  }

  function handleImageFile(file, dropzone) {
    if (file.size > 10 * 1024 * 1024) {
      alert("File is too large. Maximum size is 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      dropzone.innerHTML = `
        <div style="position:relative; width:100%; display:flex; align-items:center; justify-content:center; gap:8px;">
          <img src="${dataUrl}" style="height:36px; border-radius:4px; object-fit:cover;">
          <span style="font-size:0.72rem; color:#fff; font-weight:700;">${file.name.slice(0, 16)}...</span>
          <button id="remove-ref-img-btn" class="btn btn-icon btn-sm" style="color:#ff4444;">×</button>
        </div>
      `;
      document.getElementById('remove-ref-img-btn').onclick = (ev) => {
        ev.stopPropagation();
        dropzone.innerHTML = `
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 4px; color:var(--text-muted);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <div class="ref-text">Upload / Drop local image for Image-to-Video</div>
        `;
        if (window.FilmOS) window.FilmOS.updateActiveShot({ referenceImage: null });
      };
      if (window.FilmOS) window.FilmOS.updateActiveShot({ referenceImage: dataUrl });
      if (window.showToast) window.showToast("✓ Reference Image Loaded for Image-to-Video!");
    };
    reader.readAsDataURL(file);
  }

  // Bind All Interactive Controls
  function bindAllControls() {
    // Generate Button
    const generateBtn = document.getElementById('studio-generate-btn');
    if (generateBtn) generateBtn.addEventListener('click', startGeneration);

    // AI Enhance Button
    const aiEnhanceBtn = document.getElementById('ai-enhance-prompt-btn');
    if (aiEnhanceBtn) aiEnhanceBtn.addEventListener('click', enhancePrompt);

    // Play / Pause Button
    const playPauseBtn = document.getElementById('playback-play-pause');
    const playPauseIcon = document.getElementById('play-pause-icon');
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        isPlaying = !isPlaying;
        // With a model render on screen the transport drives the <video>; the
        // canvas loop is not what the user is watching.
        if (resultVideo && resultVideo.style.display !== 'none') {
          if (isPlaying) {
            const p = resultVideo.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
          } else {
            resultVideo.pause();
          }
        }
        if (playPauseIcon) {
          playPauseIcon.innerHTML = isPlaying
            ? `<path d="M6 4h4v16H6zm8 0h4v16h-4z" fill="currentColor"/>`
            : `<path d="M8 5v14l11-7z" fill="currentColor"/>`;
        }
      });
    }

    // Timeline Scrubber
    const scrubber = document.getElementById('studio-timeline-scrubber');
    if (scrubber) {
      scrubber.addEventListener('click', (e) => {
        const rect = scrubber.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        sceneTick = pos * 5.0;
      });
    }

    // Model Buttons
    document.querySelectorAll('.model-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => setModel(btn.dataset.model || btn.textContent.trim()));
    });

    // Camera Buttons
    document.querySelectorAll('.camera-btn').forEach(btn => {
      btn.addEventListener('click', () => setCameraMode(btn.dataset.camera || btn.textContent.trim()));
    });

    // Ratio Buttons
    document.querySelectorAll('.ratio-btn').forEach(btn => {
      btn.addEventListener('click', () => setAspectRatio(btn.dataset.ratio || btn.textContent.trim()));
    });

    // Motion Dynamics Slider
    const motionSlider = document.getElementById('motion-strength-slider');
    const motionVal = document.getElementById('motion-strength-val');
    if (motionSlider && motionVal) {
      motionSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        motionVal.textContent = `${val}%`;
        if (window.FilmOS) window.FilmOS.updateActiveShot({ motionSpeed: val });
      });
    }

    // Style Preset Chips (Toggle highlight + append/remove from prompt)
    document.querySelectorAll('.template-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const promptInput = document.getElementById('studio-prompt-input');
        if (!promptInput) return;
        const text = chip.dataset.prompt || chip.textContent.trim();
        const isSelected = chip.classList.toggle('active');

        if (isSelected) {
          chip.style.borderColor = 'var(--accent-lime)';
          chip.style.background = 'rgba(204, 255, 0, 0.15)';
          chip.style.color = 'var(--accent-lime)';
          promptInput.value = promptInput.value ? `${promptInput.value}, in ${chip.textContent.trim()} style` : text;
        } else {
          chip.style.borderColor = '';
          chip.style.background = '';
          chip.style.color = '';
          promptInput.value = promptInput.value.replace(new RegExp(`, in ${chip.textContent.trim()} style`, 'gi'), '');
        }

        if (window.FilmOS) window.FilmOS.updateActiveShot({ prompt: promptInput.value });
      });
    });

    // LUT Color Grading Buttons
    document.querySelectorAll('.lut-btn').forEach(btn => {
      btn.addEventListener('click', () => setLut(btn.dataset.lut || 'cyber'));
    });

    // Speed Buttons
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => setSpeed(btn.dataset.speed || '1.0'));
    });

    // FX Sliders
    const flareSlider = document.getElementById('flare-slider');
    if (flareSlider) {
      flareSlider.addEventListener('input', (e) => {
        flareStrength = parseInt(e.target.value, 10);
        const val = document.getElementById('flare-strength-val');
        if (val) val.textContent = `${flareStrength}%`;
      });
    }

    const grainSlider = document.getElementById('grain-slider');
    if (grainSlider) {
      grainSlider.addEventListener('input', (e) => {
        grainStrength = parseInt(e.target.value, 10);
        const val = document.getElementById('grain-strength-val');
        if (val) val.textContent = `${grainStrength}%`;
      });
    }

    const fogSlider = document.getElementById('fog-slider');
    if (fogSlider) {
      fogSlider.addEventListener('input', (e) => {
        fogStrength = parseInt(e.target.value, 10);
        const val = document.getElementById('fog-strength-val');
        if (val) val.textContent = `${fogStrength}%`;
      });
    }

    // Output Quality (720p / 1080p / 4K)
    document.querySelectorAll('.quality-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        renderQuality = btn.dataset.quality || '1080p';
        document.querySelectorAll('.quality-btn').forEach(b =>
          b.classList.toggle('active', b === btn));
        if (window.FilmOS) window.FilmOS.state.resolution = renderQuality;
      });
    });

    // Clip Duration
    document.querySelectorAll('.duration-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        renderDuration = parseInt(btn.dataset.duration, 10) || 5;
        document.querySelectorAll('.duration-btn').forEach(b =>
          b.classList.toggle('active', b === btn));
      });
    });

    // Audio toggle on the result player. Model output (Veo, Sora) carries a
    // real soundtrack, so this is only meaningful once a clip exists.
    const muteBtn = document.getElementById('studio-mute-toggle');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        if (!resultVideo) return;
        resultVideo.muted = !resultVideo.muted;
        muteBtn.classList.toggle('is-muted', resultVideo.muted);
        muteBtn.textContent = resultVideo.muted ? '🔇' : '🔊';
      });
    }

    bindImageUploader();
  }

  // 2.7 Video Export Functions
  window.downloadCurrentVideoFile = function () {
    if (generatedVideoUrl) {
      const a = document.createElement('a');
      a.href = generatedVideoUrl;
      // A model render is .mp4 and a local capture is .webm; naming the file
      // after whichever produced it keeps players from choking on it.
      a.download = `aivideo-master-${Date.now()}.${realVideoExt}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (window.showToast) {
        window.showToast(activeProviderLabel
          ? `✓ Master file downloaded (${activeProviderLabel}).`
          : '✓ Master video file downloaded!');
      }
    } else {
      if (!canvas) return;
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `aivideo-frame-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (window.showToast) window.showToast("✓ Video Frame Downloaded!");
    }
  };

  // 2.13 Export Master Timeline Film (JSON EDL / Merged Video)
  window.renderFullStoryboardFilm = function () {
    if (!window.FilmOS) return;
    const timeline = window.FilmOS.state.timeline;
    const project = window.FilmOS.state;

    const edl = {
      title: project.name,
      fps: project.fps,
      resolution: project.resolution,
      tracks: timeline.tracks,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(edl, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${project.name.toLowerCase().replace(/\s+/g, '-')}-timeline-edl.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (window.showToast) {
      window.showToast("🎬 Master Timeline Edit Decision List (EDL) Exported!");
    }
  };

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('DOMContentLoaded', initStudio);
})();
