/**
 * AIVIDEO SOVEREIGN STUDIO CONTROLLER
 * Full 3D Multi-Scene WebGL2 GPU Synthesizer + Generative Cinematic Audio Muxing
 */

(function () {
  const state = {
    mode: "text-to-video",
    model: "Sovereign DiT v4.0",
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
  let audioEngine = null;

  if (canvas && window.NeuralVideoEngine) {
    neuralEngine = new window.NeuralVideoEngine(canvas);
  }
  if (window.CinemaAudioEngine) {
    audioEngine = new window.CinemaAudioEngine();
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

  // Generate 3D Neural Video with Synchronized Generative Audio
  function startSovereignVideoGeneration() {
    if (state.isGenerating || !canvas) return;
    state.isGenerating = true;
    state.isPlaying = false;
    recordedChunks = [];
    overlay.classList.add('active');

    if (window.showToast) {
      window.showToast("⚡ Synthesizing 3D Neural Latents & Audio Foley...");
    }

    // Determine scene archetype for audio
    const p = state.prompt.toLowerCase();
    let sType = 0;
    if (p.includes('ocean') || p.includes('wave') || p.includes('water')) sType = 1;
    else if (p.includes('space') || p.includes('galaxy') || p.includes('star')) sType = 2;
    else if (p.includes('ancient') || p.includes('temple') || p.includes('dragon')) sType = 3;

    // Start Audio Synthesizer
    let audioStream = null;
    if (audioEngine) {
      audioStream = audioEngine.playCinematicSoundscape(sType, state.duration);
    }

    // Video Canvas Stream
    const videoStream = canvas.captureStream(state.fps);
    
    // Combine Video + Audio tracks if available
    let combinedStream = videoStream;
    if (audioStream && audioStream.getAudioTracks().length > 0) {
      combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioStream.getAudioTracks()
      ]);
    }

    let options = { mimeType: 'video/webm;codecs=vp9,opus' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/webm' };
    }

    try {
      mediaRecorder = new MediaRecorder(combinedStream, options);
    } catch (e) {
      mediaRecorder = new MediaRecorder(videoStream);
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
        window.showToast("✓ Master video + synchronized cinematic soundtrack rendered! Ready for export.");
      }
    };

    mediaRecorder.start();

    const totalFrames = state.duration * state.fps;
    let currentFrame = 0;

    const steps = [
      "Vectorizing prompt in 128-dim Latent Space...",
      "Raymarching 3D Volumetric Scene Geometry...",
      "Synthesizing dynamic binaural audio soundtrack...",
      "Applying 3D Camera Choreography Paths...",
      "Hardware Muxing Master 1080p Video Stream..."
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
      a.download = `aivideo-master-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (window.showToast) window.showToast("✓ Master video + audio exported & downloaded!");
    } else {
      window.downloadCurrentFrame();
    }
  };

  window.downloadCurrentFrame = function () {
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `aivideo-frame-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (window.showToast) window.showToast("✓ High-Res PNG frame exported!");
  };

  // Bind Listeners
  if (generateBtn) generateBtn.addEventListener('click', startSovereignVideoGeneration);

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
      startSovereignVideoGeneration();
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

    startSovereignVideoGeneration();
  };

  window.addEventListener('resize', resizeCanvas);

  window.addEventListener('DOMContentLoaded', () => {
    resizeCanvas();
    if (!neuralEngine && window.NeuralVideoEngine) {
      neuralEngine = new window.NeuralVideoEngine(canvas);
    }
    if (!audioEngine && window.CinemaAudioEngine) {
      audioEngine = new window.CinemaAudioEngine();
    }
    state.isPlaying = true;
    previewLoop();
    addGenerationToHistory(null);
  });
})();
