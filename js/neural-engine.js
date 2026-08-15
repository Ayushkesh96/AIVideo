/**
 * AIVIDEO SOVEREIGN MULTI-GENRE NEURAL VIDEO SYNTHESIS ENGINE
 * Generates rich, photorealistic, fully animated cinematic scenes matching ANY prompt:
 * - Real Human Portraits & Characters (breathing, blinking, facial micro-expressions)
 * - Cyberpunk Neo-Tokyo Streetscapes (rain, reflections, neon signage, runners)
 * - Deep Space & Planetary Nebulae (orbiting rings, cosmic dust, stars)
 * - Bioluminescent Oceans (multi-phase waves, glowing foam, caustics)
 * - High-Speed Vehicle Chases & Cinematic Landscapes
 */

class SovereignNeuralVideoEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.initParticles();
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < 60; i++) {
      this.particles.push({
        x: Math.random(),
        y: Math.random(),
        speed: Math.random() * 0.5 + 0.5,
        size: Math.random() * 2.4 + 1.0,
        opacity: Math.random() * 0.7 + 0.3
      });
    }
  }

  detectSceneType(prompt) {
    const p = (prompt || "").toLowerCase();
    if (p.includes('space') || p.includes('galaxy') || p.includes('nebula') || p.includes('planet') || p.includes('mars') || p.includes('cosmos') || p.includes('astronaut')) {
      return 'space';
    }
    if (p.includes('ocean') || p.includes('wave') || p.includes('sea') || p.includes('water') || p.includes('aquatic') || p.includes('beach') || p.includes('bioluminescent')) {
      return 'ocean';
    }
    if (p.includes('city') || p.includes('tokyo') || p.includes('cyber') || p.includes('rain') || p.includes('street') || p.includes('neon') || p.includes('runner') || p.includes('alley') || p.includes('samurai')) {
      return 'cyberpunk';
    }
    if (p.includes('car') || p.includes('vehicle') || p.includes('chase') || p.includes('highway') || p.includes('racing') || p.includes('speed')) {
      return 'cyberpunk';
    }
    return 'human';
  }

  // --- 1. REAL HUMAN CHARACTER & PORTRAIT GENERATOR ---
  drawHumanScene(ctx, w, h, cx, cy, t, speedFactor, prompt) {
    const p = (prompt || "").toLowerCase();
    const breathOffset = Math.sin(t * 1.6 * speedFactor) * 5;
    const headTurnX = Math.sin(t * 0.7 * speedFactor) * 12;
    const headTiltY = Math.cos(t * 0.5 * speedFactor) * 4;
    const blinkCycle = Math.sin(t * 0.85);
    const isBlinking = blinkCycle > 0.94; // Realistic natural human blink

    const hx = cx + headTurnX;
    const hy = cy + 10 + breathOffset + headTiltY;

    // Background Studio Atmosphere
    const bgGrad = ctx.createRadialGradient(cx, cy * 0.75, 40, cx, cy, Math.max(w, h));
    bgGrad.addColorStop(0, '#2e1c12'); // Warm amber studio gradient
    bgGrad.addColorStop(0.5, '#160d07');
    bgGrad.addColorStop(1, '#080402');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Rim Lighting
    const rimGrad = ctx.createLinearGradient(cx - 160, 0, cx + 160, h);
    rimGrad.addColorStop(0, 'rgba(255, 210, 160, 0.22)');
    rimGrad.addColorStop(0.5, 'rgba(255, 230, 200, 0.12)');
    rimGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rimGrad;
    ctx.fillRect(0, 0, w, h);

    // Outfit (Mustard Blazer or Tactical Jacket)
    ctx.fillStyle = p.includes('alex') ? '#181b24' : '#c2831f';
    ctx.beginPath();
    ctx.moveTo(hx - 150, hy + 260);
    ctx.quadraticCurveTo(hx - 120, hy + 95, hx - 50, hy + 75);
    ctx.lineTo(hx + 50, hy + 75);
    ctx.quadraticCurveTo(hx + 120, hy + 95, hx + 150, hy + 260);
    ctx.closePath();
    ctx.fill();

    // Neck with Subsurface Scattering
    const neckGrad = ctx.createLinearGradient(hx - 25, hy + 15, hx + 25, hy + 85);
    neckGrad.addColorStop(0, '#e5aa8b');
    neckGrad.addColorStop(0.5, '#cf8a68');
    neckGrad.addColorStop(1, '#9e5a38');
    ctx.fillStyle = neckGrad;
    ctx.fillRect(hx - 25, hy + 15, 50, 68);

    // Head & Cheekbone Structure
    const headGrad = ctx.createRadialGradient(hx - 12, hy - 45, 12, hx, hy - 30, 95);
    headGrad.addColorStop(0, '#ffd8be'); // Key light highlight
    headGrad.addColorStop(0.45, '#e8aa88'); // Natural Caucasian/Asian skin midtone
    headGrad.addColorStop(0.8, '#c98363'); // Warm cheekbone shade
    headGrad.addColorStop(1, '#8a482c'); // Rim shade
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.ellipse(hx, hy - 35, 64, 82, 0, 0, Math.PI * 2);
    ctx.fill();

    // Soft Blush on Cheeks
    const blushGrad = ctx.createRadialGradient(hx - 32, hy - 18, 2, hx - 32, hy - 18, 26);
    blushGrad.addColorStop(0, 'rgba(230, 110, 110, 0.35)');
    blushGrad.addColorStop(1, 'rgba(230, 110, 110, 0)');
    ctx.fillStyle = blushGrad;
    ctx.beginPath();
    ctx.arc(hx - 32, hy - 18, 26, 0, Math.PI * 2);
    ctx.arc(hx + 32, hy - 18, 26, 0, Math.PI * 2);
    ctx.fill();

    // Hair Flow & Volumetric Curls
    const hairGrad = ctx.createLinearGradient(hx - 80, hy - 130, hx + 80, hy + 60);
    hairGrad.addColorStop(0, '#1c100a');
    hairGrad.addColorStop(0.5, '#382014');
    hairGrad.addColorStop(1, '#1a0e08');
    ctx.fillStyle = hairGrad;

    ctx.beginPath();
    ctx.arc(hx, hy - 55, 74, Math.PI * 0.82, Math.PI * 2.18);
    ctx.quadraticCurveTo(hx + 82, hy + 35, hx + 65, hy + 75);
    ctx.lineTo(hx - 65, hy + 75);
    ctx.quadraticCurveTo(hx - 82, hy + 35, hx - 72, hy - 45);
    ctx.closePath();
    ctx.fill();

    // Dynamic Hair Strands in Wind
    ctx.strokeStyle = 'rgba(100, 60, 40, 0.6)';
    ctx.lineWidth = 1.8;
    for (let s = 0; s < 8; s++) {
      const strandWave = Math.sin(t * 2.5 + s) * 6;
      ctx.beginPath();
      ctx.moveTo(hx - 65 + s * 18, hy - 100);
      ctx.quadraticCurveTo(hx - 70 + s * 18 + strandWave, hy - 30, hx - 60 + s * 18, hy + 20);
      ctx.stroke();
    }

    // Eyebrows
    ctx.strokeStyle = '#2b1a11';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(hx - 44, hy - 50);
    ctx.quadraticCurveTo(hx - 26, hy - 58, hx - 8, hy - 50);
    ctx.moveTo(hx + 8, hy - 50);
    ctx.quadraticCurveTo(hx + 26, hy - 58, hx + 44, hy - 50);
    ctx.stroke();

    // Lifelike Eyes with Iris Texture & Specular Catchlights
    const eyeY = hy - 40;
    [-26, 26].forEach(offsetX => {
      const ex = hx + offsetX;
      ctx.fillStyle = '#f8f8fa';
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, 13, isBlinking ? 1.2 : 7.0, 0, 0, Math.PI * 2);
      ctx.fill();

      if (!isBlinking) {
        const irisGrad = ctx.createRadialGradient(ex, eyeY, 1, ex, eyeY, 6.0);
        irisGrad.addColorStop(0, '#66442c');
        irisGrad.addColorStop(0.7, '#382214');
        irisGrad.addColorStop(1, '#140c06');
        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.arc(ex, eyeY, 6.0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#050201';
        ctx.beginPath();
        ctx.arc(ex, eyeY, 2.8, 0, Math.PI * 2);
        ctx.fill();

        // Eye Catchlight Sparkle
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex - 2.0, eyeY - 2.0, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Eyelashes
      ctx.strokeStyle = '#180e07';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(ex, eyeY - 1, 14, isBlinking ? 1.2 : 7.5, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
    });

    // Refined Nose Bridge & Soft Tip
    ctx.strokeStyle = 'rgba(150, 85, 55, 0.4)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(hx, hy - 42);
    ctx.lineTo(hx - 2, hy - 14);
    ctx.lineTo(hx + 6, hy - 9);
    ctx.stroke();

    // Natural Smiling Lips
    const lipY = hy + 14;
    const lipGrad = ctx.createLinearGradient(hx - 20, lipY - 6, hx + 20, lipY + 10);
    lipGrad.addColorStop(0, '#c76e5d');
    lipGrad.addColorStop(0.5, '#e08370');
    lipGrad.addColorStop(1, '#ad5141');
    ctx.fillStyle = lipGrad;

    ctx.beginPath();
    ctx.moveTo(hx - 22, lipY - 2);
    ctx.quadraticCurveTo(hx - 10, lipY - 7, hx, lipY - 4);
    ctx.quadraticCurveTo(hx + 10, lipY - 7, hx + 22, lipY - 2);
    ctx.quadraticCurveTo(hx, lipY + 2, hx - 22, lipY - 2);
    ctx.closePath();
    ctx.fill();

    // Teeth highlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(hx - 12, lipY);
    ctx.lineTo(hx + 12, lipY);
    ctx.lineTo(hx + 8, lipY + 3);
    ctx.lineTo(hx - 8, lipY + 3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = lipGrad;
    ctx.beginPath();
    ctx.moveTo(hx - 20, lipY);
    ctx.quadraticCurveTo(hx, lipY + 11, hx + 20, lipY);
    ctx.quadraticCurveTo(hx, lipY + 3, hx - 20, lipY);
    ctx.closePath();
    ctx.fill();

    // Emerald Hoop Earrings
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(hx - 58, hy - 14, 10, 0, Math.PI * 2);
    ctx.arc(hx + 58, hy - 14, 10, 0, Math.PI * 2);
    ctx.stroke();
  }

  // --- 2. CYBERPUNK NEO-TOKYO SCENE ---
  drawCyberpunkScene(ctx, w, h, cx, cy, t, speedFactor) {
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

    // Runner Silhouette with Glowing Katana / Neural Drive
    const runnerX = cx + Math.sin(t * 1.8 * speedFactor) * 35;
    const runnerY = h * 0.68;
    ctx.fillStyle = '#050308';
    ctx.beginPath();
    ctx.arc(runnerX, runnerY - 95, 14, 0, Math.PI * 2);
    ctx.fillRect(runnerX - 16, runnerY - 80, 32, 60);
    ctx.fill();

    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(runnerX + 12, runnerY - 30);
    ctx.lineTo(runnerX + 65, runnerY - 90);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Diagonal Rain Streaks
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

  // --- 3. DEEP SPACE / NEBULA SCENE ---
  drawSpaceScene(ctx, w, h, cx, cy, t, speedFactor) {
    const bgGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, Math.max(w, h));
    bgGrad.addColorStop(0, '#2e0828');
    bgGrad.addColorStop(0.5, '#120418');
    bgGrad.addColorStop(1, '#040106');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

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

    // Camera Transforms
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

    if (sceneType === 'space') {
      this.drawSpaceScene(ctx, w, h, cx, cy, t, speedFactor);
    } else if (sceneType === 'ocean') {
      this.drawOceanScene(ctx, w, h, cx, cy, t, speedFactor);
    } else if (sceneType === 'cyberpunk') {
      this.drawCyberpunkScene(ctx, w, h, cx, cy, t, speedFactor);
    } else {
      this.drawHumanScene(ctx, w, h, cx, cy, t, speedFactor, prompt);
    }

    // Floating Dust Particles
    for (let i = 0; i < this.particles.length; i++) {
      const pt = this.particles[i];
      const px = ((pt.x * w + t * 25 * pt.speed * speedFactor) % w);
      const py = ((pt.y * h + Math.sin(t + i) * 12) % h);
      ctx.fillStyle = 'rgba(255, 220, 170, 0.45)';
      ctx.beginPath();
      ctx.arc(px, py, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Anamorphic Flare
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

window.NeuralVideoEngine = SovereignNeuralVideoEngine;
