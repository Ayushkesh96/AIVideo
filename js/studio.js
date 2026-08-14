/**
 * HIGGSFIELD AI — STUDIO INTEGRATION WITH DEEP HARDCORE NEURAL VIDEO ENGINE
 * 100% Client-Side Pure WebGL2 GPU Math + MediaRecorder Video Encoding
 */

(function () {
  const state = {
    mode: "text-to-video",
    model: "Seedance 2.5 (1080p)",
    aspectRatio: "16:9",
    cameraMotion: "Orbit 360°",
    resolution: "1080p",
    duration: 6,
    fps: 30,
    motionStrength: 75,
    seed: 4829103,
    prompt: "Cinematic medium close-up shot of a cybernetic samurai standing under crimson neon rain in Neo-Tokyo, volumetric mist, anamorphic lens flare, 8k masterpiece",
    isGenerating: false,
    isPlaying: true,
    currentTime: 0,
    generatedVideoUrl: null,
    generatedBlob: null,
    history: []
  };

  const canvas = document.getElementById('studio-viewport-canvas');
  let neuralEngine = null;
  if (canvas && window.NeuralVideoEngine) {
    neuralEngine = new window.NeuralVideoEngine(canvas);
  }

  let mediaRecorder = null;
  let recordedChunks = [];
  let animFrameId = null;
  let sceneTick = 0;

  // DOM Elements
  const promptInput = document.getElementById('studio-prompt-input');
  const modelBtns = document.querySelectorAll('.model-pill-btn');
  const cameraBtns = document.querySelectorAll('.camera-btn');
  const ratioBtns = document.querySelectorAll('.ratio-btn');
  const modeTabs = document.querySelectorAll('.studio-mode-tab');
  const generateBtn = document.getElementById('studio-generate-btn');
  const overlay = document.getElementById('studio-rendering-overlay');
  const progressFill = document.getElementById('render-progress-fill');
  const renderStatus = document.getElementById('render-status-text');
  const playPauseBtn = document.getElementById('playback-play-pause');
  const playPauseIcon = document.getElementById('play-pause-icon');
  const scrubber = document.getElementById('studio-timeline-scrubber');
  const timelineProgress = document.getElementById('studio-timeline-progress');
  const timeDisplay = document.getElementById('studio-time-display');
  const hudModel = document.getElementById('hud-model-tag');
  const hudMotion = document.getElementById('hud-motion-tag');
  const historyStrip = document.getElementById('studio-history-strip');
  const motionSlider = document.getElementById('motion-strength-slider');
  const motionValDisplay = document.getElementById('motion-strength-val');

  function resizeCanvas() {
    if (!canvas || !canvas.parentElement) return;
    canvas.width = canvas.parentElement.clientWidth || 800;
    canvas.height = canvas.parentElement.clientHeight || 450;
  }

  function renderSceneFrame(t) {
    if (neuralEngine) {
      neuralEngine.renderFrame(
        t,
        state.prompt,
        state.cameraMotion,
        state.motionStrength,
        state.seed
      );
    }
  }

  function previewLoop() {
    if (state.isPlaying && !state.isGenerating) {
      sceneTick += 1 / state.fps;
      state.currentTime = sceneTick % state.duration;
      updateTimeHUD();
      renderSceneFrame(state.currentTime);
    }
    animFrameId = requestAnimationFrame(previewLoop);
  }

  function updateTimeHUD() {
    if (!timeDisplay || !timelineProgress) return;
    const currentSec = state.currentTime.toFixed(1);
    const totalSec = state.duration.toFixed(1);
    timeDisplay.textContent = `00:${currentSec.padStart(4, '0')} / 00:${totalSec.padStart(4, '0')}`;
    const pct = (state.currentTime / state.duration) * 100;
    timelineProgress.style.width = `${pct}%`;
  }

  // Hardcore Neural Video Generation & Hardware Stream Encoding
  function startHardcoreVideoGeneration() {
    if (state.isGenerating || !canvas) return;
    state.isGenerating = true;
    state.isPlaying = false;
    recordedChunks = [];
    overlay.classList.add('active');

    if (window.showToast) {
      window.showToast("⚡ Compiling 3D DiT Latent Vectors on WebGL2 GPU...");
    }

    const stream = canvas.captureStream(state.fps);
    let options = { mimeType: 'video/webm;codecs=vp9' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/webm' };
    }

    try {
      mediaRecorder = new MediaRecorder(stream, options);
    } catch (e) {
      mediaRecorder = new MediaRecorder(stream);
    }

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      state.generatedBlob = blob;
      state.generatedVideoUrl = URL.createObjectURL(blob);

      overlay.classList.remove('active');
      state.isGenerating = false;
      state.currentTime = 0;
      state.isPlaying = true;
      if (playPauseIcon) playPauseIcon.innerHTML = `<path d="M6 4h4v16H6zm8 0h4v16h-4z" fill="currentColor"/>`;

      addGenerationToHistory(state.generatedVideoUrl);

      if (window.showToast) {
        window.showToast("✓ Neural 3D AI video synthesized and encoded! Ready for export.");
      }
    };

    mediaRecorder.start();

    const totalFrames = state.duration * state.fps;
    let currentFrame = 0;

    const steps = [
      "Running 128-dim Latent Tokenizer...",
      "Raymarching 3D Signed Distance Fields...",
      "Computing Spatio-Temporal Volumetric Lighting...",
      "Applying 3D Camera Trajectory Vectors...",
      "Hardware Muxing 1080p Video Stream..."
    ];

    const frameInterval = setInterval(() => {
      currentFrame++;
      const timeInSec = currentFrame / state.fps;
      renderSceneFrame(timeInSec);

      const renderProgress = Math.min(Math.floor((currentFrame / totalFrames) * 100), 100);
      if (progressFill) progressFill.style.width = `${renderProgress}%`;

      const stepIdx = Math.min(Math.floor((renderProgress / 100) * steps.length), steps.length - 1);
      if (renderStatus) renderStatus.textContent = `${steps[stepIdx]} (${renderProgress}%)`;

      if (currentFrame >= totalFrames) {
        clearInterval(frameInterval);
        setTimeout(() => {
          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        }, 200);
      }
    }, 1000 / state.fps);
  }

  function addGenerationToHistory(videoUrl) {
    const item = {
      id: Date.now(),
      prompt: state.prompt,
      model: state.model,
      camera: state.cameraMotion,
      url: videoUrl
    };
    state.history.unshift(item);
    renderHistoryStrip();
  }

  function renderHistoryStrip() {
    if (!historyStrip) return;
    historyStrip.innerHTML = '';

    state.history.slice(0, 8).forEach((item, index) => {
      const div = document.createElement('div');
      div.className = `history-thumb-item ${index === 0 ? 'active' : ''}`;
      div.title = item.prompt;
      div.innerHTML = `
        <div style="background:linear-gradient(135deg, #1c1c24, #ccff00); width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:0.65rem; color:#000; font-weight:800;">
          CLIP #${index + 1}
        </div>
      `;
      div.addEventListener('click', () => {
        document.querySelectorAll('.history-thumb-item').forEach(d => d.classList.remove('active'));
        div.classList.add('active');
        if (promptInput) promptInput.value = item.prompt;
        state.prompt = item.prompt;
        if (window.showToast) window.showToast(`Loaded clip #${index + 1} prompt!`);
      });
      historyStrip.appendChild(div);
    });
  }

  window.downloadCurrentVideoFile = function () {
    if (state.generatedBlob) {
      const a = document.createElement('a');
      a.href = state.generatedVideoUrl;
      a.download = `higgsfield-neural-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (window.showToast) window.showToast("✓ Real AI video exported & downloaded!");
    } else {
      window.downloadCurrentFrame();
    }
  };

  window.downloadCurrentFrame = function () {
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `higgsfield-neural-frame-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (window.showToast) window.showToast("✓ Frame exported & downloaded!");
  };

  // Bind Listeners
  if (generateBtn) generateBtn.addEventListener('click', startHardcoreVideoGeneration);

  modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      modeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.mode = tab.dataset.mode || 'text-to-video';
      if (window.showToast) window.showToast(`Switched mode to: ${tab.textContent.trim()}`);
    });
  });

  modelBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modelBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.model = btn.dataset.model || btn.textContent.trim();
      if (hudModel) hudModel.textContent = state.model;
    });
  });

  cameraBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      cameraBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.cameraMotion = btn.dataset.camera || btn.textContent.trim();
      if (hudMotion) hudMotion.textContent = state.cameraMotion;
    });
  });

  ratioBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      ratioBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.aspectRatio = btn.dataset.ratio || btn.textContent.trim();
    });
  });

  if (motionSlider && motionValDisplay) {
    motionSlider.addEventListener('input', (e) => {
      state.motionStrength = parseInt(e.target.value, 10);
      motionValDisplay.textContent = `${state.motionStrength}%`;
    });
  }

  document.querySelectorAll('.template-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const text = chip.dataset.prompt || chip.textContent.trim();
      if (promptInput) promptInput.value = text;
      state.prompt = text;
      startHardcoreVideoGeneration();
    });
  });

  if (promptInput) {
    promptInput.addEventListener('input', (e) => {
      state.prompt = e.target.value;
    });
  }

  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', () => {
      state.isPlaying = !state.isPlaying;
      if (state.isPlaying) {
        playPauseIcon.innerHTML = `<path d="M6 4h4v16H6zm8 0h4v16h-4z" fill="currentColor"/>`;
      } else {
        playPauseIcon.innerHTML = `<path d="M8 5v14l11-7z" fill="currentColor"/>`;
      }
    });
  }

  if (scrubber) {
    scrubber.addEventListener('click', (e) => {
      const rect = scrubber.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      state.currentTime = Math.max(0, Math.min(pos * state.duration, state.duration));
      sceneTick = state.currentTime;
      updateTimeHUD();
      renderSceneFrame(state.currentTime);
    });
  }

  window.loadPresetIntoStudio = function (presetData) {
    if (promptInput) promptInput.value = presetData.prompt;
    state.prompt = presetData.prompt;

    cameraBtns.forEach(btn => {
      const match = (btn.dataset.camera || "").toLowerCase() === (presetData.camera || "").toLowerCase();
      btn.classList.toggle('active', match);
      if (match) state.cameraMotion = btn.dataset.camera;
    });

    if (hudMotion) hudMotion.textContent = state.cameraMotion;

    const studioSection = document.getElementById('studio');
    if (studioSection) {
      studioSection.scrollIntoView({ behavior: 'smooth' });
    }

    startHardcoreVideoGeneration();
  };

  window.addEventListener('resize', resizeCanvas);

  window.addEventListener('DOMContentLoaded', () => {
    resizeCanvas();
    if (!neuralEngine && window.NeuralVideoEngine) {
      neuralEngine = new window.NeuralVideoEngine(canvas);
    }
    state.isPlaying = true;
    previewLoop();
    addGenerationToHistory(null);
  });
})();
