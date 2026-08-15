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
  let usedAiKeyframes = false;
  let recordingExtension = 'webm';

  // How many stills to request per clip. Enough to carry a shot without making
  // the user wait through a dozen model round-trips.
  // Chained keyframes are fetched sequentially — each one edits the previous —
  // so this is a direct trade of wait time against how continuous the clip
  // looks. Six is where the motion reads without the wait becoming absurd.
  const KEYFRAMES_PER_CLIP = 6;

  // MP4 first — it plays everywhere the user is likely to take the file.
  // WebM/VP9 is the fallback for browsers that can't mux H.264.
  const RECORDING_FORMATS = [
    { mimeType: 'video/mp4;codecs=avc1.42E01E', extension: 'mp4' },
    { mimeType: 'video/mp4', extension: 'mp4' },
    { mimeType: 'video/webm;codecs=vp9', extension: 'webm' },
    { mimeType: 'video/webm;codecs=vp8', extension: 'webm' },
    { mimeType: 'video/webm', extension: 'webm' }
  ];

  const ASPECT_RATIOS = { "16:9": 16 / 9, "9:16": 9 / 16, "1:1": 1, "21:9": 21 / 9 };
  const RESOLUTION_HEIGHTS = { "720p": 720, "1080p": 1080, "4k": 2160, "4K": 2160 };

  // Real text-to-video state. `resultVideo` is a <video> laid over the canvas:
  // when a model returns an actual clip we play the file itself rather than
  // re-rendering it, so what the user sees is what they downloaded.
  let resultVideo = null;
  let realVideoUrl = null;
  let realVideoExt = 'mp4';
  let activeProviderLabel = null;
  let generationAbort = null;
  let providerCaps = null;

  // Driven by the Output Quality / Clip Duration pickers. These feed both the
  // model request and the local canvas size, so the two engines agree on shape.
  let renderQuality = '1080p';
  let renderDuration = 5;

  // Last refusal from a video model, kept so the badge can explain itself
  // after the toast has gone.
  let lastModelError = null;

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
    updateProjectHeader();
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
    // Models that emit audio (Veo, Sora) would otherwise be blocked from
    // autoplaying; the user can unmute from the transport controls.
    resultVideo.muted = true;
    resultVideo.style.cssText =
      'position:absolute; inset:0; width:100%; height:100%; object-fit:contain; display:none; z-index:2; background:#000;';
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
   * UI. A deployment with no key still generates — it just falls back to the
   * local engine — and the badge says which one is answering.
   */
  /**
   * Compares the build stamped into this HTML against the one the running
   * deployment reports. A mismatch means the browser is holding a cached page
   * — which is indistinguishable from "the fix didn't work" unless you check.
   */
  async function checkDeployedBuild() {
    const meta = document.querySelector('meta[name="aivideo-build"]');
    const pageBuild = meta ? meta.getAttribute('content') : null;
    if (!pageBuild) return;

    try {
      const res = await fetch('/api/version', { cache: 'no-store' });
      if (!res.ok) return;
      const info = await res.json();

      console.info(
        `%cAIVideo build ${pageBuild}%c\n` +
        `deployment: ${info.commit} (${info.repo || 'unknown repo'} @ ${info.branch || '?'})\n` +
        `server expects build: ${info.expectedBuildId}`,
        'font-weight:bold', 'font-weight:normal'
      );

      if (info.expectedBuildId && info.expectedBuildId !== pageBuild) {
        console.warn(
          `This page is build ${pageBuild} but the server is serving ${info.expectedBuildId}. ` +
          'You are looking at a cached copy — hard-reload (Ctrl/Cmd+Shift+R).'
        );
        if (window.showToast) {
          window.showToast('⚠ Cached page detected — hard-reload to see the current version.');
        }
      }
    } catch (err) {
      // No /api/version means an old deployment; nothing to compare against.
    }
  }

  async function refreshProviderStatus() {
    checkDeployedBuild();
    if (!window.AIVideoEngine) return;
    try {
      providerCaps = await window.AIVideoEngine.capabilities();
    } catch (err) {
      providerCaps = null;
    }

    const badge = document.getElementById('studio-provider-badge');
    if (badge) {
      const active = providerCaps && (providerCaps.providers || []).find(p => p.id === providerCaps.active);
      if (active) {
        // Name the host as well as the model: "Veo 3" alone is ambiguous when
        // several providers can serve it.
        badge.textContent = `${active.label} · ${active.activeModelLabel || active.activeModel}`;
        // A keyless attempt can still be refused upstream, so it must not be
        // dressed up the same as a provisioned model.
        badge.classList.toggle('is-live', !providerCaps.keyless);
        badge.classList.toggle('is-besteffort', Boolean(providerCaps.keyless));
        badge.title = providerCaps.keyless
          ? 'No API key is set, so the studio tries a real video model anonymously. That can be refused or rate limited — ' +
            'if it is, the local keyframe engine renders instead. A free key from enter.pollinations.ai (POLLINATIONS_KEY) makes it reliable.'
          : `Real text-to-video is active: ${active.activeModelLabel} via ${active.label}. Max ${active.maxResolution}p.`;
      } else {
        badge.textContent = 'LOCAL ENGINE';
        badge.classList.remove('is-live', 'is-besteffort');
        badge.title =
          'No video model is reachable, so clips are synthesized locally from generated stills. ' +
          'Set POLLINATIONS_KEY, GEMINI_API_KEY, FAL_KEY, REPLICATE_API_TOKEN, RUNWAYML_API_SECRET or LUMAAI_API_KEY to enable a real model.';
      }
    }

    // Only offer a resolution some reachable model can deliver; the local
    // engine can always render it, so it is never fully disabled.
    const maxRes = providerCaps ? providerCaps.maxResolution || 0 : 0;
    document.querySelectorAll('.quality-btn').forEach(btn => {
      const needs = parseInt(btn.dataset.minHeight || '0', 10);
      const modelCanDoIt = needs <= maxRes;
      btn.classList.toggle('is-unavailable', !modelCanDoIt);
      btn.title = modelCanDoIt
        ? ''
        : `No reachable model renders above ${maxRes || 0}p — this falls back to the local engine at that size.`;
    });
  }

  function activeAspectRatio() {
    if (window.FilmOS && window.FilmOS.state && window.FilmOS.state.aspectRatio) {
      return window.FilmOS.state.aspectRatio;
    }
    return "16:9";
  }

  function activeDuration() {
    // The duration picker is the explicit choice, so it wins over whatever the
    // shot was last saved with.
    if (Number.isFinite(renderDuration) && renderDuration > 0) return renderDuration;
    const shot = window.FilmOS && window.FilmOS.getActiveShot ? window.FilmOS.getActiveShot() : null;
    return (shot && shot.duration) || 5;
  }

  // The canvas backing store IS the video frame — MediaRecorder captures it at
  // these exact pixel dimensions. It must come from the chosen format, never
  // from the container, or the export silently ships at whatever size the
  // layout happened to be.
  function frameSize() {
    const ratio = ASPECT_RATIOS[activeAspectRatio()] || ASPECT_RATIOS["16:9"];
    // Follows the quality picker rather than a fixed 1080p, so choosing 4K
    // actually changes the recorded frame and not just the label.
    const base = RESOLUTION_HEIGHTS[renderQuality] || RESOLUTION_HEIGHTS["1080p"];

    // "1080p" names the short edge, so portrait 9:16 is 1080x1920 rather than
    // a 607-pixel-wide sliver.
    let width, height;
    if (ratio >= 1) {
      height = base;
      width = Math.round(base * ratio);
    } else {
      width = base;
      height = Math.round(base / ratio);
    }

    // Even dimensions keep VP9/H.264 encoders happy.
    return { width: width - (width % 2), height: height - (height % 2) };
  }

  /**
   * Keeps the viewport HUD honest. The resolution pill was hardcoded markup,
   * so it read "1080p • 30 FPS" even while rendering a 4K portrait frame.
   */
  /**
   * Repaints every studio control from the current project state. Used after
   * swapping projects, where each panel would otherwise still be showing the
   * previous project's values.
   */
  function reloadStudioFromState() {
    releaseRealVideo();
    hideRealVideo();
    generatedBlob = null;
    generatedVideoUrl = null;
    if (aiSynth) aiSynth.reset();

    loadActiveShotData();
    resizeCanvas();
    renderGenerationReel();
    updateProjectHeader();

    const promptInput = document.getElementById('studio-prompt-input');
    const shot = window.FilmOS ? window.FilmOS.getActiveShot() : null;
    if (promptInput) promptInput.value = (shot && shot.prompt) || '';
  }

  /**
   * The project name and the "N Scenes • N Shots • N Elements" line were fixed
   * markup describing the demo film, so they stayed wrong for every real
   * project.
   */
  function updateProjectHeader() {
    if (!window.FilmOS || !window.FilmOS.state) return;
    const state = window.FilmOS.state;

    const nameEl = document.getElementById('filmos-project-name');
    if (nameEl) nameEl.textContent = state.name || 'Untitled Project';

    const statsEl = document.getElementById('filmos-project-stats');
    if (statsEl) {
      const scenes = (state.scenes || []).length;
      const shots = (state.scenes || []).reduce((n, s) => n + ((s.shots || []).length), 0);
      const elements = Object.keys(state.elements || {})
        .reduce((n, key) => n + ((state.elements[key] || []).length), 0);
      const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
      statsEl.textContent =
        `Filmmaking Production Operating System • ${plural(scenes, 'Scene')} • ${plural(shots, 'Shot')} • ${plural(elements, 'Element')}`;
    }
  }

  // film-ui.js also repaints this header after its own edits. Exposing the one
  // implementation stops the two from disagreeing — they previously wrote the
  // same line with different wording.
  window.updateProjectHeader = updateProjectHeader;

  function updateHud() {
    const resTag = document.getElementById('hud-res-tag');
    if (resTag && canvas) {
      resTag.textContent = `${canvas.width}×${canvas.height} • 30 FPS`;
    }
  }

  function resizeCanvas() {
    if (!canvas) return;
    const { width, height } = frameSize();
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    // Display size is independent of the backing store: letterbox into the
    // container so a 9:16 render doesn't stretch the desktop viewport.
    canvas.style.aspectRatio = `${width} / ${height}`;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.objectFit = 'contain';
    updateHud();
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

  // Prefers real model keyframes; falls back to the on-device procedural
  // engine whenever the studio has none (before the first generate, or when
  // the model service is unreachable).
  function renderSceneFrame(t) {
    const shot = window.FilmOS && window.FilmOS.getActiveShot ? window.FilmOS.getActiveShot() : null;
    const prompt = shot ? shot.prompt : "cinematic scene";
    const camera = shot ? shot.camera : "Orbit 360°";
    const motionSpeed = shot ? shot.motionSpeed : 75;

    if (aiSynth && aiSynth.hasKeyframes()) {
      const rendered = aiSynth.renderFrame(t, {
        duration: activeDuration(),
        cameraMotion: camera,
        motionStrength: motionSpeed,
        lut: activeLut,
        flare: flareStrength,
        grain: grainStrength,
        fog: fogStrength
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

      // The procedural engine draws the scene; the shared post chain grades it,
      // so the FX controls are live on this path too.
      if (aiSynth) {
        aiSynth.applyPostFx({
          time: t,
          duration: activeDuration(),
          lut: activeLut,
          flare: flareStrength,
          grain: grainStrength,
          fog: fogStrength
        });
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
    // Match on data-lens, not button text. Text matching also scanned the
    // motion-rig grid, so a rig button could steal the lens highlight.
    const grid = document.getElementById('lens-selector-grid');
    if (grid) {
      grid.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.lens === lens));
    }
  }

  /**
   * Motion rig is its own axis — "Dolly", "Crane", "Handheld" are not camera
   * moves. Feeding them into setCameraMode() used to blank the camera
   * selection, because no .camera-btn has data-camera="Crane".
   */
  function setRig(rig) {
    if (window.FilmOS) window.FilmOS.updateActiveShot({ motionRig: rig });
    const grid = document.getElementById('motion-rig-selector-grid');
    if (grid) {
      grid.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.rig === rig));
    }
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

  // 2.6 Generate Real Video (API or Simulation Mode)
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
    'FPV Dive': 'a fast FPV drone dive racing through the scene',
    // Crane is a data-camera on the choreography grid, so it needs an entry
    // here too — without one, picking it sent no motion language at all.
    'Crane': 'a sweeping crane shot rising over the scene'
  };

  // The rig is how the camera is physically carried, which reads differently
  // to a model than the move itself.
  const RIG_DIRECTION = {
    'Dolly': 'smooth dolly movement on tracks',
    'Truck': 'lateral trucking movement',
    'Crane': 'sweeping crane movement',
    'Handheld': 'handheld camera with natural shake',
    'FPV Drone': 'fast FPV drone flight',
    'Orbit 360°': 'orbiting camera movement'
  };

  function buildModelPrompt(basePrompt, camera, lens, rig) {
    const parts = [basePrompt];
    const move = CAMERA_DIRECTION[camera];
    if (move) parts.push(move);
    const carry = RIG_DIRECTION[rig];
    // Skip the rig when it just restates the move, so the prompt doesn't say
    // "orbits around the subject, orbiting camera movement".
    if (carry && rig !== camera) parts.push(carry);
    if (lens) parts.push(`shot on a ${lens} lens`);
    parts.push('cinematic, photorealistic, natural motion');
    return parts.join(', ');
  }

  /** Object URLs are only freed here; leaking them holds whole clips in memory. */
  function releaseRealVideo() {
    if (realVideoUrl && realVideoUrl.startsWith('blob:')) URL.revokeObjectURL(realVideoUrl);
    realVideoUrl = null;
    activeProviderLabel = null;
  }

  function setRenderProgress(fraction, text) {
    const progressFill = document.getElementById('render-progress-fill');
    const renderStatus = document.getElementById('render-status-text');
    if (progressFill) progressFill.style.width = `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`;
    if (renderStatus && text) renderStatus.textContent = text;
  }

  /**
   * Records a finished clip in the generation reel. Shared by both engines so
   * a model render and a local render land in the reel identically — only the
   * `model` label differs.
   */
  function addClipToReel(prompt) {
    if (!window.FilmOS) return;
    const shot = window.FilmOS.getActiveShot();
    window.FilmOS.addReelItem({
      id: `gen-${Date.now()}`,
      title: shot ? `Shot ${shot.code}: ${shot.title}` : 'Clip #' + Date.now(),
      prompt: prompt,
      model: activeProviderLabel || window.FilmOS.state.activeModel,
      camera: shot ? shot.camera : 'Orbit 360°',
      timestamp: Date.now(),
      url: generatedVideoUrl
    });
    renderGenerationReel();
  }

  function describeProgress(info) {
    const seconds = info.elapsedMs ? Math.round(info.elapsedMs / 1000) : 0;
    const suffix = seconds > 3 ? ` (${seconds}s)` : '';
    if (info.phase === 'succeeded') return info.detail || 'Complete';
    return `${info.detail || 'Rendering'}${suffix}`;
  }

  // 2.6 Generation pipeline.
  //
  // Two engines, tried in order:
  //   1. A real text-to-video model. This is the only path that can actually
  //      depict what the prompt describes, including motion.
  //   2. The local keyframe synthesizer, which animates generated stills. It
  //      always works and needs nothing configured, but it cannot invent
  //      motion — so it is a fallback, not an equal.
  async function startGeneration() {
    if (isGenerating || !canvas) return;
    isGenerating = true;
    isPlaying = false;
    recordedChunks = [];
    releaseRealVideo();
    hideRealVideo();
    resizeCanvas();

    const overlay = document.getElementById('studio-rendering-overlay');
    const progressFill = document.getElementById('render-progress-fill');
    const renderStatus = document.getElementById('render-status-text');

    const promptInput = document.getElementById('studio-prompt-input');
    let prompt = promptInput ? promptInput.value.trim() : '';

    // Checked before the overlay goes up. A new project now starts with an
    // empty prompt box, so this is the first thing an impatient click hits —
    // and generating from "" burns a model call to render nothing.
    if (!prompt) {
      isGenerating = false;
      isPlaying = true;
      if (promptInput) promptInput.focus();
      if (window.showToast) window.showToast('⚠ Describe the shot you want before generating.');
      return;
    }

    if (overlay) overlay.classList.add('active');

    if (window.FilmOS) {
      prompt = window.FilmOS.resolveMentions(prompt);
      window.FilmOS.updateActiveShot({ prompt: promptInput.value });
    }

    if (window.showToast) window.showToast(`⚡ Synthesizing Video for "${prompt.slice(0, 26)}..."`);

    // --- Path 1: real text-to-video model -----------------------------------
    if (window.AIVideoEngine) {
      const shot = window.FilmOS ? window.FilmOS.getActiveShot() : null;
      const camera = shot && shot.camera ? shot.camera : 'Orbit 360°';
      const lens = shot && shot.lens ? shot.lens : '';
      const rig = shot && shot.motionRig ? shot.motionRig : '';
      generationAbort = typeof AbortController !== 'undefined' ? new AbortController() : null;

      setRenderProgress(0.01, 'Submitting to video model...');
      let result;
      try {
        result = await window.AIVideoEngine.generate({
          prompt: buildModelPrompt(prompt, camera, lens, rig),
          aspectRatio: activeAspectRatio(),
          quality: renderQuality,
          durationSec: activeDuration(),
          signal: generationAbort ? generationAbort.signal : undefined,
          onProgress: info => setRenderProgress(info.progress, describeProgress(info))
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

        // Pull the file down once so playback and export share one local copy.
        const blob = result.blob || await window.AIVideoEngine.toBlob(result.videoUrl);
        if (blob) {
          if (generatedVideoUrl) URL.revokeObjectURL(generatedVideoUrl);
          generatedBlob = blob;
          realVideoUrl = URL.createObjectURL(blob);
          realVideoExt = (blob.type && blob.type.indexOf('webm') >= 0) ? 'webm' : 'mp4';
        } else {
          // CORS refused the read; the clip still plays straight from source.
          realVideoUrl = result.videoUrl;
          realVideoExt = 'mp4';
        }

        generatedVideoUrl = realVideoUrl;
        recordingExtension = realVideoExt;
        activeProviderLabel = result.modelLabel || result.provider;
        showRealVideo(realVideoUrl);

        if (overlay) overlay.classList.remove('active');
        isGenerating = false;
        isPlaying = true;
        addClipToReel(prompt);
        if (window.showToast) {
          window.showToast(`✓ Rendered by ${activeProviderLabel}. Click 'Export Video File' to download.`);
        }
        return;
      }

      if (result && result.error) {
        console.warn('Video model unavailable, using local engine:', result.error);
        lastModelError = result.error;
        // Show the provider's actual reason, not a generic line. "requires a
        // key" and "rate limited" need completely different responses from the
        // user, and hiding which one happened is how this stays unexplained.
        if (window.showToast) window.showToast(`⚠ ${result.error}`);
        const badge = document.getElementById('studio-provider-badge');
        if (badge) {
          badge.classList.remove('is-live', 'is-besteffort');
          badge.classList.add('is-error');
          badge.textContent = 'LOCAL ENGINE (model refused)';
          badge.title = `The video model declined this request:\n\n${result.error}\n\nThe clip below was rendered by the local keyframe engine instead.`;
        }
      }
      generationAbort = null;
    }

    // --- Path 2: local keyframe synthesizer ---------------------------------

    // Pull the model keyframes BEFORE recording starts, so the whole recorded
    // window is real footage rather than a loading screen.
    usedAiKeyframes = false;
    if (aiSynth) {
      try {
        if (progressFill) progressFill.style.width = '0%';
        if (renderStatus) renderStatus.textContent = 'Sampling latent keyframes from the model...';

        const frames = await aiSynth.fetchKeyframes(prompt, {
          count: KEYFRAMES_PER_CLIP,
          seed: 4829103,
          width: canvas.width,
          height: canvas.height,
          // Each frame continues the previous one instead of re-rolling the
          // scene, which is what stops the result looking like a slideshow.
          chain: true,
          onProgress: (done, total) => {
            // Keyframe fetching owns the first 30% of the progress bar.
            if (progressFill) progressFill.style.width = `${Math.round((done / total) * 30)}%`;
            if (renderStatus) {
              renderStatus.textContent = `Building continuous shot — frame ${done} of ${total}...`;
            }
          }
        });
        usedAiKeyframes = frames.length > 0;
      } catch (err) {
        console.warn('Keyframe synthesis unavailable, using on-device engine:', err);
      }

      if (!usedAiKeyframes) {
        aiSynth.reset();
        if (window.showToast) {
          window.showToast('⚠ Model service unreachable — rendering on-device instead.');
        }
      }
    }

    // Bail out cleanly if the user cancelled while keyframes were in flight.
    if (!isGenerating) return;

    if (generatedVideoUrl) URL.revokeObjectURL(generatedVideoUrl);
    generatedBlob = null;
    generatedVideoUrl = null;

    try {
      const stream = canvas.captureStream ? canvas.captureStream(30) : null;
      if (stream && typeof MediaRecorder !== 'undefined') {
        const codec = pickRecordingMimeType();
        recordingExtension = codec.extension;
        mediaRecorder = new MediaRecorder(stream, {
          mimeType: codec.mimeType,
          // Scale bitrate with frame area so 4K and 21:9 don't come out mushy.
          videoBitsPerSecond: bitrateFor(canvas.width, canvas.height)
        });
        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) recordedChunks.push(e.data);
        };
        mediaRecorder.onstop = () => {
          if (recordedChunks.length > 0) {
            generatedBlob = new Blob(recordedChunks, { type: codec.mimeType });
            generatedVideoUrl = URL.createObjectURL(generatedBlob);
          }
        };
        // Timeslice keeps chunks flowing, so a long render can't be lost to a
        // single end-of-stream flush.
        mediaRecorder.start(1000);
      }
    } catch (e) {
      console.warn("MediaRecorder setup:", e);
    }

    const totalDuration = activeDuration();
    const stages = [
      "Encoding 128-dim Latent Prompt Tokens...",
      "Diffusing Multi-Plane 3D Parallax...",
      "Simulating Realistic Motion & Lighting...",
      "Applying Hollywood Color Grade & FX...",
      "Hardware Muxing Master 1080p Video Stream..."
    ];

    // MediaRecorder timestamps frames by wall clock, so scene time has to track
    // wall clock too. Counting rendered frames instead would stretch a 5s clip
    // to however long the machine needed to draw 150 frames.
    const startedAt = performance.now();

    function step() {
      if (!isGenerating) return;
      const elapsed = (performance.now() - startedAt) / 1000;
      renderSceneFrame(Math.min(elapsed, totalDuration));

      // Frame rendering owns 30-100%; keyframe fetching already used 0-30%.
      const share = Math.min(elapsed / totalDuration, 1);
      const progress = Math.round(30 + share * 70);
      if (progressFill) progressFill.style.width = `${progress}%`;
      const stageIdx = Math.min(Math.floor(share * stages.length), stages.length - 1);
      if (renderStatus) renderStatus.textContent = `${stages[stageIdx]} (${progress}%)`;

      if (elapsed < totalDuration) {
        requestAnimationFrame(step);
      } else {
        finishRecording().then(() => {
          if (overlay) overlay.classList.remove('active');
          isGenerating = false;
          isPlaying = true;
          sceneTick = 0;

          addClipToReel(prompt);

          if (window.showToast) {
            const label = usedAiKeyframes ? 'Model-generated video' : 'On-device video';
            window.showToast(
              generatedBlob
                ? `✓ ${label} ready (${formatBytes(generatedBlob.size)}) — click 'Export Video File'.`
                : `✓ ${label} rendered. Recording unavailable in this browser.`
            );
          }
        });
      }
    }

    requestAnimationFrame(step);
  }

  function pickRecordingMimeType() {
    const supported = RECORDING_FORMATS.find(
      f => typeof MediaRecorder !== 'undefined' &&
           typeof MediaRecorder.isTypeSupported === 'function' &&
           MediaRecorder.isTypeSupported(f.mimeType)
    );
    return supported || { mimeType: 'video/webm', extension: 'webm' };
  }

  function bitrateFor(width, height) {
    // ~0.12 bits per pixel per frame at 30fps lands around 8 Mbps for 1080p.
    const perFrame = width * height * 0.12;
    return Math.round(Math.max(2.5e6, Math.min(40e6, perFrame * 30)));
  }

  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  // Resolves once MediaRecorder has actually flushed its final chunk. Reading
  // generatedBlob before this settles races the encoder and can hand back the
  // previous clip.
  function finishRecording() {
    return new Promise(resolve => {
      if (!mediaRecorder || mediaRecorder.state === 'inactive') return resolve();

      const done = () => resolve();
      mediaRecorder.addEventListener('stop', done, { once: true });
      // Don't hang the UI forever if the encoder never reports back.
      setTimeout(done, 4000);

      try {
        mediaRecorder.stop();
      } catch (err) {
        console.warn('MediaRecorder stop:', err);
        resolve();
      }
    });
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

    // Output Quality (720p / 1080p / 4K). Resizing immediately means the
    // viewport shows the real frame shape before generating.
    document.querySelectorAll('.quality-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        renderQuality = btn.dataset.quality || '1080p';
        document.querySelectorAll('.quality-btn').forEach(b => b.classList.toggle('active', b === btn));
        if (window.FilmOS) window.FilmOS.state.resolution = renderQuality;
        resizeCanvas();
      });
    });

    // Clip Duration
    document.querySelectorAll('.duration-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        renderDuration = parseInt(btn.dataset.duration, 10) || 5;
        document.querySelectorAll('.duration-btn').forEach(b => b.classList.toggle('active', b === btn));
        if (window.FilmOS) window.FilmOS.updateActiveShot({ duration: renderDuration });
      });
    });

    // New Project / Load Example. The studio used to open already filled with
    // a fictional demo film, with no way to clear it.
    const newProjectBtn = document.getElementById('filmos-new-project-btn');
    if (newProjectBtn) {
      newProjectBtn.addEventListener('click', () => {
        if (!window.FilmOS || !window.FilmOS.newProject) return;
        // Destructive and not undoable, so it asks first.
        const hasWork = (window.FilmOS.state.generationReel || []).length > 0 ||
          (window.FilmOS.getActiveShot() && window.FilmOS.getActiveShot().prompt);
        if (hasWork && !window.confirm('Clear this project and start from an empty shot?')) return;

        window.FilmOS.newProject();
        reloadStudioFromState();
        if (window.showToast) window.showToast('✓ New project — the studio is empty and ready.');
      });
    }

    const loadDemoBtn = document.getElementById('filmos-load-demo-btn');
    if (loadDemoBtn) {
      loadDemoBtn.addEventListener('click', () => {
        if (!window.FilmOS || !window.FilmOS.loadDemoProject) return;
        if (!window.confirm('Replace the current project with the bundled example?')) return;

        window.FilmOS.loadDemoProject();
        reloadStudioFromState();
        if (window.showToast) window.showToast('✓ Example project loaded.');
      });
    }

    // "+ Add @Element" — the modal and its save handler already existed, but
    // nothing opened it, so the button did nothing at all.
    const addElementBtn = document.getElementById('filmos-add-character-btn');
    if (addElementBtn) {
      addElementBtn.addEventListener('click', () => {
        if (window.FilmOSUI && window.FilmOSUI.openAddElementModal) {
          window.FilmOSUI.openAddElementModal();
        }
      });
    }

    // Audio toggle for the result player — model output (Veo, Sora) carries a
    // real soundtrack, so this only means anything once a clip exists.
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
  /**
   * Loads a preset, community project or showcase clip into the studio.
   *
   * The presets gallery, the projects explorer and the showcase strip all call
   * this, but nothing defined it — so every "use this" button on the page was
   * inert. Each caller passes a different subset of fields, so everything here
   * is optional.
   */
  window.loadPresetIntoStudio = function (preset) {
    if (!preset) return;

    const promptInput = document.getElementById('studio-prompt-input');
    if (promptInput && preset.prompt) {
      promptInput.value = preset.prompt;
      if (window.FilmOS) window.FilmOS.updateActiveShot({ prompt: preset.prompt });
    }

    if (preset.camera) setCameraMode(preset.camera);
    if (preset.lens) setLens(preset.lens);
    if (preset.rig) setRig(preset.rig);
    if (preset.lut) setLut(preset.lut);
    if (preset.aspectRatio) setAspectRatio(preset.aspectRatio);

    if (preset.model && window.FilmOS) setModel(preset.model);

    if (Number.isFinite(preset.motionSpeed)) {
      const slider = document.getElementById('motion-strength-slider');
      const val = document.getElementById('motion-strength-val');
      if (slider) slider.value = preset.motionSpeed;
      if (val) val.textContent = `${preset.motionSpeed}%`;
      if (window.FilmOS) window.FilmOS.updateActiveShot({ motionSpeed: preset.motionSpeed });
    }

    // Single-page layout: bring the studio into view so the user can see the
    // settings that were just applied.
    const studio = document.getElementById('studio');
    if (studio && studio.scrollIntoView) {
      studio.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (promptInput) {
      // Focus after the scroll so the caret lands where the user is looking.
      setTimeout(() => promptInput.focus(), 400);
    }

    if (window.showToast) {
      window.showToast(preset.title
        ? `✓ Loaded "${preset.title}" into the studio.`
        : '✓ Preset loaded into the studio.');
    }
  };

  window.downloadCurrentVideoFile = function () {
    if (generatedBlob) {
      const a = document.createElement('a');
      a.href = generatedVideoUrl;
      // Extension must match what MediaRecorder actually produced, or the file
      // won't open in the player the user hands it to.
      a.download = `aivideo-master-${Date.now()}.${recordingExtension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (window.showToast) {
        window.showToast(`✓ Exported ${formatBytes(generatedBlob.size)} ${recordingExtension.toUpperCase()}`);
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
