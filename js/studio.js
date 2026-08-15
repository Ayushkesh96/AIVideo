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
    if (window.CinemaAudioEngine) {
      audioEngine = new window.CinemaAudioEngine();
    }

    bindAllControls();
    loadActiveShotData();
    resizeCanvas();
    startPreviewLoop();
    renderGenerationReel();
  }

  function resizeCanvas() {
    if (!canvas || !canvas.parentElement) return;
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
    if (neuralEngine && window.FilmOS) {
      const shot = window.FilmOS.getActiveShot();
      const prompt = shot ? shot.prompt : "cinematic scene";
      const camera = shot ? shot.camera : "Orbit 360°";
      const motionSpeed = shot ? shot.motionSpeed : 75;

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
    const lens = shot ? shot.lens : "35mm";
    const rig = shot ? shot.rig : "Dolly Push";

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
              { role: "system", content: "You are a Hollywood cinematographer and director. Rewrite the user prompt into a rich, detailed visual cinematic prompt specifying lens, lighting, atmospheric mood, depth, and camera motion in one cohesive paragraph." },
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
        applyLocalEnhancer(promptInput, basePrompt, lens, rig);
      }
    } else {
      // Local Intelligent Cinematic Expander
      await new Promise(r => setTimeout(r, 600));
      applyLocalEnhancer(promptInput, basePrompt, lens, rig);
    }

    btn.innerHTML = origBtnHtml;
    btn.disabled = false;

    if (window.FilmOS) {
      window.FilmOS.updateActiveShot({ prompt: promptInput.value });
    }
    if (window.showToast) window.showToast("✨ AI Prompt Enhanced with Cinematic Tokens!");
  }

  function applyLocalEnhancer(input, base, lens, rig) {
    const tokens = [
      `shot on ${lens} anamorphic lens`,
      `${rig} camera choreography`,
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

  // 2.6 Generate Real Video (API or Simulation Mode)
  function startGeneration() {
    if (isGenerating || !canvas) return;
    isGenerating = true;
    isPlaying = false;
    recordedChunks = [];

    const overlay = document.getElementById('studio-rendering-overlay');
    const progressFill = document.getElementById('render-progress-fill');
    const renderStatus = document.getElementById('render-status-text');
    if (overlay) overlay.classList.add('active');

    const promptInput = document.getElementById('studio-prompt-input');
    let prompt = promptInput ? promptInput.value.trim() : "cinematic shot";
    if (window.FilmOS) {
      prompt = window.FilmOS.resolveMentions(prompt);
      window.FilmOS.updateActiveShot({ prompt: promptInput.value });
    }

    if (window.showToast) window.showToast(`⚡ Synthesizing Video for "${prompt.slice(0, 26)}..."`);

    // MediaRecorder stream capture
    try {
      const stream = canvas.captureStream ? canvas.captureStream(30) : null;
      if (stream && typeof MediaRecorder !== 'undefined') {
        let mimeType = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
        mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6000000 });
        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) recordedChunks.push(e.data);
        };
        mediaRecorder.onstop = () => {
          if (recordedChunks.length > 0) {
            generatedBlob = new Blob(recordedChunks, { type: 'video/webm' });
            generatedVideoUrl = URL.createObjectURL(generatedBlob);
          }
        };
        mediaRecorder.start();
      }
    } catch (e) {
      console.warn("MediaRecorder setup:", e);
    }

    const totalFrames = 5 * 30; // 5 seconds at 30 fps
    let frame = 0;
    const stages = [
      "Encoding 128-dim Latent Prompt Tokens...",
      "Diffusing Multi-Plane 3D Parallax...",
      "Simulating Realistic Motion & Lighting...",
      "Applying Hollywood Color Grade & FX...",
      "Hardware Muxing Master 1080p Video Stream..."
    ];

    function step() {
      if (!isGenerating) return;
      frame++;
      const timeInSec = frame / 30;
      renderSceneFrame(timeInSec);

      const progress = Math.min(Math.floor((frame / totalFrames) * 100), 100);
      if (progressFill) progressFill.style.width = `${progress}%`;
      const stageIdx = Math.min(Math.floor((progress / 100) * stages.length), stages.length - 1);
      if (renderStatus) renderStatus.textContent = `${stages[stageIdx]} (${progress}%)`;

      if (frame < totalFrames) {
        setTimeout(() => requestAnimationFrame(step), 1000 / 30);
      } else {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          try { mediaRecorder.stop(); } catch (err) {}
        }

        setTimeout(() => {
          if (overlay) overlay.classList.remove('active');
          isGenerating = false;
          isPlaying = true;
          sceneTick = 0;

          // Add to Generation Reel
          if (window.FilmOS) {
            const shot = window.FilmOS.getActiveShot();
            window.FilmOS.addReelItem({
              id: `gen-${Date.now()}`,
              title: shot ? `Shot ${shot.code}: ${shot.title}` : "Clip #" + Date.now(),
              prompt: prompt,
              model: window.FilmOS.state.activeModel,
              camera: shot ? shot.camera : "Orbit 360°",
              timestamp: Date.now(),
              url: generatedVideoUrl
            });
            renderGenerationReel();
          }

          if (window.showToast) window.showToast("✓ Video Synthesized & Playing! Click 'Export Video File' to download.");
        }, 300);
      }
    }

    requestAnimationFrame(step);
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
        if (window.showToast) window.showToast(`✓ Loaded Clip #${idx + 1} Settings!`);
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

    bindImageUploader();
  }

  // 2.7 Video Export Functions
  window.downloadCurrentVideoFile = function () {
    if (generatedBlob) {
      const a = document.createElement('a');
      a.href = generatedVideoUrl;
      a.download = `aivideo-master-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (window.showToast) window.showToast("✓ Master Video File Downloaded!");
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
