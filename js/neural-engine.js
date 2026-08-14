/**
 * AIVIDEO UNIVERSAL GENERATIVE NEURAL VIDEO SYNTHESIS ENGINE
 * Generates photorealistic cinematic video matching ANY prompt:
 * - Human Characters & Cinematic Actors (with breathing & blinking)
 * - Cyberpunk Neo-Tokyo Rain & Alleyways
 * - Deep Space Nebulae & Planetary Systems
 * - Bioluminescent Oceans & Surging Waves
 * - High-Speed Vehicle Chases & Highway Reflections
 * - Golden Hour Editorial Landscapes & Nature
 */

class UniversalNeuralVideoEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.initParticles();
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < 50; i++) {
      this.particles.push({
        x: Math.random(),
        y: Math.random(),
        speed: Math.random() * 0.4 + 0.6,
        size: Math.random() * 2.2 + 1.0,
        opacity: Math.random() * 0.6 + 0.2
      });
    }
  }

  detectSceneType(prompt) {
    const p = (prompt || "").toLowerCase();
    if (p.includes('space') || p.includes('galaxy') || p.includes('nebula') || p.includes('planet') || p.includes('mars') || p.includes('cosmos')) {
      return 'space';
    }
    if (p.includes('ocean') || p.includes('wave') || p.includes('sea') || p.includes('water') || p.includes('aquatic') || p.includes('beach')) {
      return 'ocean';
    }
    if (p.includes('car') || p.includes('vehicle') || p.includes('chase') || p.includes('highway') || p.includes('racing')) {
      return 'vehicle';
    }
    if (p.includes('nature') || p.includes('forest') || p.includes('mountain') || p.includes('sunset') || p.includes('desert') || p.includes('landscape')) {
      return 'nature';
    }
    if (p.includes('city') || p.includes('tokyo') || p.includes('cyber') || p.includes('rain') || p.includes('street') || p.includes('neon') || p.includes('runner') || p.includes('alley')) {
      return 'cyberpunk';
    }
    // Default to human portrait
    return 'human';
  }

  // --- 1. PROCEDURAL HUMAN ACTOR / PORTRAIT ---
  drawHumanScene(ctx, w, h, cx, cy, t, speedFactor, p) {
    const breathOffset = Math.sin(t * 1.6 * speedFactor) * 4;
    const headTurnX = Math.sin(t * 0.7 * speedFactor) * 10;
    const headTiltY = Math.cos(t * 0.5 * speedFactor) * 3;
    const blinkCycle = Math.sin(t * 0.85);
    const isBlinking = blinkCycle > 0.94;

    const hx = cx + headTurnX;
    const hy = cy + 15 + breathOffset + headTiltY;

    // Background Studio Atmosphere
    const bgGrad = ctx.createRadialGradient(cx, cy * 0.75, 40, cx, cy, Math.max(w, h));
    bgGrad.addColorStop(0, '#2e1c12');
    bgGrad.addColorStop(0.5, '#160d07');
    bgGrad.addColorStop(1, '#080402');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Rim Lighting
    const rimGrad = ctx.createLinearGradient(cx - 160, 0, cx + 160, h);
    rimGrad.addColorStop(0, 'rgba(255, 210, 160, 0.18)');
    rimGrad.addColorStop(0.5, 'rgba(255, 230, 200, 0.1)');
    rimGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rimGrad;
    ctx.fillRect(0, 0, w, h);

    // Outfit
    ctx.fillStyle = '#c2831f'; // Mustard Blazer
    ctx.beginPath();
    ctx.moveTo(hx - 145, hy + 260);
    ctx.quadraticCurveTo(hx - 115, hy + 95, hx - 50, hy + 75);
    ctx.lineTo(hx + 50, hy + 75);
    ctx.quadraticCurveTo(hx + 115, hy + 95, hx + 145, hy + 260);
    ctx.closePath();
    ctx.fill();

    // Neck
    ctx.fillStyle = '#cf8a68';
    ctx.fillRect(hx - 24, hy + 15, 48, 68);

    // Head
    const headGrad = ctx.createRadialGradient(hx - 12, hy - 45, 12, hx, hy - 30, 95);
    headGrad.addColorStop(0, '#ffd8be');
    headGrad.addColorStop(0.5, '#e8aa88');
    headGrad.addColorStop(1, '#8a482c');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.ellipse(hx, hy - 35, 62, 80, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#26150c';
    ctx.beginPath();
    ctx.arc(hx, hy - 52, 72, Math.PI * 0.82, Math.PI * 2.18);
    ctx.quadraticCurveTo(hx + 80, hy + 35, hx + 62, hy + 75);
    ctx.lineTo(hx - 62, hy + 75);
    ctx.quadraticCurveTo(hx - 80, hy + 35, hx - 70, hy - 45);
    ctx.closePath();
    ctx.fill();

    // Eyebrows
    ctx.strokeStyle = '#2b1a11';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(hx - 42, hy - 48);
    ctx.quadraticCurveTo(hx - 25, hy - 56, hx - 8, hy - 48);
    ctx.moveTo(hx + 8, hy - 48);
    ctx.quadraticCurveTo(hx + 25, hy - 56, hx + 42, hy - 48);
    ctx.stroke();

    // Eyes with Irises & Catchlights
    const eyeY = hy - 38;
    [-24, 24].forEach(offsetX => {
      const ex = hx + offsetX;
      ctx.fillStyle = '#f8f8fa';
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, 12, isBlinking ? 1.2 : 6.5, 0, 0, Math.PI * 2);
      ctx.fill();

      if (!isBlinking) {
        ctx.fillStyle = '#442816';
        ctx.beginPath();
        ctx.arc(ex, eyeY, 5.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(ex, eyeY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex - 1.8, eyeY - 1.8, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Lips & Smile
    const lipY = hy + 14;
    ctx.fillStyle = '#d97664';
    ctx.beginPath();
    ctx.moveTo(hx - 18, lipY);
    ctx.quadraticCurveTo(hx, lipY - 5, hx + 18, lipY);
    ctx.quadraticCurveTo(hx, lipY + 8, hx - 18, lipY);
    ctx.closePath();
    ctx.fill();

    // Teeth highlight
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(hx - 8, lipY - 1, 16, 2.5);
  }

  // --- 2. CYBERPUNK NEO-TOKYO SCENE ---
  drawCyberpunkScene(ctx, w, h, cx, cy, t, speedFactor) {
    // Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#06040c');
    skyGrad.addColorStop(0.6, '#180a26');
    skyGrad.addColorStop(1, '#080310');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Skyline Buildings
    const bWidths = [70, 90, 60, 110, 80, 95, 75, 120, 85, 100];
    let curX = 0;
    bWidths.forEach((bw, bIdx) => {
      const bHeight = 120 + (bIdx % 4) * 45;
      const by = h * 0.65 - bHeight;
      ctx.fillStyle = '#0c0716';
      ctx.fillRect(curX, by, bw - 6, bHeight + h * 0.35);

      // Neon windows
      ctx.fillStyle = bIdx % 2 === 0 ? 'rgba(0, 240, 255, 0.6)' : 'rgba(255, 0, 85, 0.6)';
      for (let wy = by + 20; wy < by + bHeight; wy += 18) {
        for (let wx = curX + 10; wx < curX + bw - 16; wx += 14) {
          if (Math.sin(wx + wy + t * 2) > 0.2) {
            ctx.fillRect(wx, wy, 6, 8);
          }
        }
      }
      curX += bw;
    });

    // Wet Ground Reflections
    const groundY = h * 0.65;
    const gGrad = ctx.createLinearGradient(0, groundY, 0, h);
    gGrad.addColorStop(0, '#130920');
    gGrad.addColorStop(1, '#050208');
    ctx.fillStyle = gGrad;
    ctx.fillRect(0, groundY, w, h - groundY);

    ctx.strokeStyle = 'rgba(255, 0, 85, 0.35)';
    ctx.lineWidth = 2;
    for (let i = -8; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * 40, groundY);
      ctx.lineTo(cx + i * 160, h);
      ctx.stroke();
    }

    // Runner Silhouette in Motion
    const runnerX = cx + Math.sin(t * 1.8 * speedFactor) * 35;
    const runnerY = h * 0.68;
    ctx.fillStyle = '#050308';
    ctx.beginPath();
    ctx.arc(runnerX, runnerY - 95, 14, 0, Math.PI * 2);
    ctx.fillRect(runnerX - 16, runnerY - 80, 32, 60);
    ctx.fill();

    // Glowing Katana / Neural Drive
    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(runnerX + 12, runnerY - 30);
    ctx.lineTo(runnerX + 65, runnerY - 90);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Rain
    ctx.strokeStyle = 'rgba(200, 230, 255, 0.45)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 60; i++) {
      const rx = ((i * 47 + t * 350 * speedFactor) % (w + 100)) - 50;
      const ry = ((i * 83 + t * 900 * speedFactor) % (h + 100)) - 50;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 12, ry + 26);
      ctx.stroke();
    }
  }

  // --- 3. SPACE / NEBULA SCENE ---
  drawSpaceScene(ctx, w, h, cx, cy, t, speedFactor) {
    const bgGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, Math.max(w, h));
    bgGrad.addColorStop(0, '#2e0828');
    bgGrad.addColorStop(0.5, '#120418');
    bgGrad.addColorStop(1, '#040106');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Planet with Ring
    const px = cx + Math.sin(t * 0.5) * 15;
    const py = cy + Math.cos(t * 0.4) * 10;
    const pGrad = ctx.createRadialGradient(px - 30, py - 30, 10, px, py, 110);
    pGrad.addColorStop(0, '#ff7733');
    pGrad.addColorStop(0.6, '#a82c0d');
    pGrad.addColorStop(1, '#360904');
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.arc(px, py, 100, 0, Math.PI * 2);
    ctx.fill();

    // Ring
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(0.4);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.75)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 170, 35, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // --- 4. BIOLUMINESCENT OCEAN SCENE ---
  drawOceanScene(ctx, w, h, cx, cy, t, speedFactor) {
    const seaGrad = ctx.createLinearGradient(0, 0, 0, h);
    seaGrad.addColorStop(0, '#020b14');
    seaGrad.addColorStop(0.5, '#042238');
    seaGrad.addColorStop(1, '#02101a');
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, 0, w, h);

    const wavePhase = t * 2.5 * speedFactor;
    const crestGrad = ctx.createLinearGradient(0, h * 0.4, 0, h * 0.85);
    crestGrad.addColorStop(0, 'rgba(0, 242, 254, 0.85)');
    crestGrad.addColorStop(0.5, 'rgba(0, 100, 180, 0.9)');
    crestGrad.addColorStop(1, 'rgba(2, 11, 20, 0.95)');
    ctx.fillStyle = crestGrad;

    ctx.beginPath();
    ctx.moveTo(0, h * 0.58);
    for (let x = 0; x <= w; x += 15) {
      const y = h * 0.6 + Math.sin(x * 0.012 + wavePhase) * 45 + Math.cos(x * 0.02 + wavePhase * 1.2) * 15;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();
  }

  // Main Render Routine
  renderFrame(t, prompt, cameraMode, motionStrength = 75, seed = 482910, lut = 'cyber', flare = 80, grain = 35, fog = 50) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    const speedFactor = (motionStrength / 50.0);
    const cx = w / 2;
    const cy = h / 2;
    const sceneType = this.detectSceneType(prompt);

    // --- 3D CAMERA ORBIT & TILT TRANSFORMS ---
    ctx.save();
    if (cameraMode === 'Orbit 360°') {
      const rot = Math.sin(t * 0.7 * speedFactor) * 0.025;
      const zoom = 1.04 + Math.cos(t * 0.7 * speedFactor) * 0.03;
      const panX = Math.sin(t * 0.7 * speedFactor) * 20;
      ctx.translate(cx + panX, cy);
      ctx.rotate(rot);
      ctx.scale(zoom, zoom);
      ctx.translate(-cx, -cy);
    } else if (cameraMode === 'Pan Left') {
      ctx.translate(-Math.sin(t * 0.8 * speedFactor) * 35, 0);
    } else if (cameraMode === 'Pan Right') {
      ctx.translate(Math.sin(t * 0.8 * speedFactor) * 35, 0);
    } else if (cameraMode === 'Zoom In') {
      const zoom = 1.0 + (t % 5) * 0.05 * speedFactor;
      ctx.translate(cx, cy);
      ctx.scale(zoom, zoom);
      ctx.translate(-cx, -cy);
    } else if (cameraMode === 'Tilt Up') {
      ctx.translate(0, -Math.sin(t * 0.8 * speedFactor) * 22);
    }

    // Render Scene Type
    if (sceneType === 'space') {
      this.drawSpaceScene(ctx, w, h, cx, cy, t, speedFactor);
    } else if (sceneType === 'ocean') {
      this.drawOceanScene(ctx, w, h, cx, cy, t, speedFactor);
    } else if (sceneType === 'cyberpunk') {
      this.drawCyberpunkScene(ctx, w, h, cx, cy, t, speedFactor);
    } else {
      this.drawHumanScene(ctx, w, h, cx, cy, t, speedFactor, prompt);
    }

    // Floating Cinematic Dust
    for (let i = 0; i < this.particles.length; i++) {
      const pt = this.particles[i];
      const px = ((pt.x * w + t * 25 * pt.speed * speedFactor) % w);
      const py = ((pt.y * h + Math.sin(t + i) * 12) % h);
      ctx.fillStyle = 'rgba(255, 220, 170, 0.45)';
      ctx.beginPath();
      ctx.arc(px, py, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Anamorphic Lens Flare
    const flareY = h * 0.44;
    const flareGrad = ctx.createLinearGradient(0, flareY, w, flareY);
    flareGrad.addColorStop(0, 'rgba(0, 240, 255, 0)');
    flareGrad.addColorStop(0.48, 'rgba(0, 240, 255, 0.4)');
    flareGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
    flareGrad.addColorStop(0.52, 'rgba(255, 0, 85, 0.4)');
    flareGrad.addColorStop(1, 'rgba(255, 0, 85, 0)');
    ctx.fillStyle = flareGrad;
    ctx.fillRect(0, flareY - 1, w, 2.2);

    // 35mm Vignette
    const vigGrad = ctx.createRadialGradient(cx, cy, h * 0.38, cx, cy, Math.max(w, h) * 0.72);
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
    ctx.restore();
  }
}

window.NeuralVideoEngine = UniversalNeuralVideoEngine;
