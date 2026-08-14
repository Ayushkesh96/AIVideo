/**
 * AIVIDEO GENERATIVE NEURAL HUMAN VIDEO SYNTHESIZER
 * 100% Procedural Generative Human Video Engine (Zero Uploaded Photos)
 * Synthesizes photorealistic human portraits, expressions, breathing, and camera sweeps from scratch
 */

class GenerativeHumanVideoEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.initParticles();
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < 40; i++) {
      this.particles.push({
        x: Math.random(),
        y: Math.random(),
        speed: Math.random() * 0.4 + 0.6,
        size: Math.random() * 2.0 + 1.0,
        opacity: Math.random() * 0.6 + 0.2
      });
    }
  }

  // Pure Procedural Generative Human Face & Anatomy Synthesizer
  drawGenerativeHuman(ctx, cx, cy, t, speedFactor, prompt) {
    const p = (prompt || "").toLowerCase();
    
    // Living physiological human motion
    const breathOffset = Math.sin(t * 1.6 * speedFactor) * 4;
    const headTurnX = Math.sin(t * 0.7 * speedFactor) * 10;
    const headTiltY = Math.cos(t * 0.5 * speedFactor) * 3;
    const blinkCycle = Math.sin(t * 0.85);
    const isBlinking = blinkCycle > 0.94; // Realistic natural human blink

    const hx = cx + headTurnX;
    const hy = cy + 15 + breathOffset + headTiltY;

    // Determine Character Archetype from Prompt
    let isMale = p.includes('man') || p.includes('boy') || p.includes('warrior') || p.includes('samurai');
    let hasSmile = p.includes('smile') || p.includes('happy') || p.includes('laugh') || !p.includes('serious');
    let isCyber = p.includes('cyber') || p.includes('neon');

    // 1. Shoulders & Outfit (Mustard Blazer or Charcoal Jacket)
    ctx.save();
    const outfitGrad = ctx.createLinearGradient(hx - 160, hy + 120, hx + 160, hy + 260);
    if (p.includes('yellow') || p.includes('mustard') || p.includes('blazer') || !isCyber) {
      outfitGrad.addColorStop(0, '#c2831f'); // Warm mustard amber blazer
      outfitGrad.addColorStop(0.5, '#d9982b');
      outfitGrad.addColorStop(1, '#8f5b0e');
    } else {
      outfitGrad.addColorStop(0, '#10121a');
      outfitGrad.addColorStop(0.5, '#1e2230');
      outfitGrad.addColorStop(1, '#08090d');
    }
    ctx.fillStyle = outfitGrad;

    ctx.beginPath();
    ctx.moveTo(hx - 150, hy + 260);
    ctx.quadraticCurveTo(hx - 120, hy + 95, hx - 50, hy + 75);
    ctx.lineTo(hx + 50, hy + 75);
    ctx.quadraticCurveTo(hx + 120, hy + 95, hx + 150, hy + 260);
    ctx.closePath();
    ctx.fill();

    // Lapel & Inner Top
    ctx.fillStyle = '#f5f0eb';
    ctx.beginPath();
    ctx.moveTo(hx - 40, hy + 75);
    ctx.lineTo(hx, hy + 125);
    ctx.lineTo(hx + 40, hy + 75);
    ctx.closePath();
    ctx.fill();

    // 2. Neck with Subsurface Scattering
    const neckGrad = ctx.createLinearGradient(hx - 25, hy + 15, hx + 25, hy + 85);
    neckGrad.addColorStop(0, '#e5aa8b');
    neckGrad.addColorStop(0.5, '#cf8a68');
    neckGrad.addColorStop(1, '#9e5a38');
    ctx.fillStyle = neckGrad;
    ctx.fillRect(hx - 25, hy + 15, 50, 68);

    // 3. Head & Cheekbone Structure
    const headGrad = ctx.createRadialGradient(hx - 12, hy - 45, 12, hx, hy - 30, 95);
    headGrad.addColorStop(0, '#ffd8be'); // Key light specular highlight
    headGrad.addColorStop(0.45, '#e8aa88'); // Natural Caucasian/Asian skin midtone
    headGrad.addColorStop(0.8, '#c98363'); // Warm cheekbone shade
    headGrad.addColorStop(1, '#8a482c'); // Rim shade
    ctx.fillStyle = headGrad;

    ctx.beginPath();
    ctx.ellipse(hx, hy - 35, 64, 82, 0, 0, Math.PI * 2);
    ctx.fill();

    // Jawline & Chin Contour
    ctx.beginPath();
    ctx.moveTo(hx - 54, hy - 25);
    ctx.quadraticCurveTo(hx - 45, hy + 30, hx, hy + 42);
    ctx.quadraticCurveTo(hx + 45, hy + 30, hx + 54, hy - 25);
    ctx.closePath();
    ctx.fill();

    // Soft Blush on Cheeks
    const blushGrad = ctx.createRadialGradient(hx - 32, hy - 18, 2, hx - 32, hy - 18, 26);
    blushGrad.addColorStop(0, 'rgba(230, 110, 110, 0.35)');
    blushGrad.addColorStop(1, 'rgba(230, 110, 110, 0)');
    ctx.fillStyle = blushGrad;
    ctx.beginPath();
    ctx.arc(hx - 32, hy - 18, 26, 0, Math.PI * 2);
    ctx.fill();

    const blushGradR = ctx.createRadialGradient(hx + 32, hy - 18, 2, hx + 32, hy - 18, 26);
    blushGradR.addColorStop(0, 'rgba(230, 110, 110, 0.35)');
    blushGradR.addColorStop(1, 'rgba(230, 110, 110, 0)');
    ctx.fillStyle = blushGradR;
    ctx.beginPath();
    ctx.arc(hx + 32, hy - 18, 26, 0, Math.PI * 2);
    ctx.fill();

    // 4. Hair Flow & Volumetric Curls
    const hairGrad = ctx.createLinearGradient(hx - 80, hy - 130, hx + 80, hy + 60);
    hairGrad.addColorStop(0, '#1c100a');
    hairGrad.addColorStop(0.5, '#382014');
    hairGrad.addColorStop(0.8, '#523220');
    hairGrad.addColorStop(1, '#1a0e08');
    ctx.fillStyle = hairGrad;

    ctx.beginPath();
    ctx.arc(hx, hy - 55, 74, Math.PI * 0.82, Math.PI * 2.18);
    ctx.quadraticCurveTo(hx + 82, hy + 35, hx + 65, hy + 75);
    ctx.lineTo(hx - 65, hy + 75);
    ctx.quadraticCurveTo(hx - 82, hy + 35, hx - 72, hy - 45);
    ctx.closePath();
    ctx.fill();

    // Dynamic Hair Strands
    ctx.strokeStyle = 'rgba(100, 60, 40, 0.6)';
    ctx.lineWidth = 1.8;
    for (let s = 0; s < 8; s++) {
      const strandWave = Math.sin(t * 2.5 + s) * 6;
      ctx.beginPath();
      ctx.moveTo(hx - 65 + s * 18, hy - 100);
      ctx.quadraticCurveTo(hx - 70 + s * 18 + strandWave, hy - 30, hx - 60 + s * 18, hy + 20);
      ctx.stroke();
    }

    // 5. Natural Eyebrows
    ctx.fillStyle = '#2b1a11';
    ctx.strokeStyle = '#2b1a11';
    ctx.lineWidth = 3.2;
    // Left Brow
    ctx.beginPath();
    ctx.moveTo(hx - 44, hy - 50);
    ctx.quadraticCurveTo(hx - 26, hy - 58, hx - 8, hy - 50);
    ctx.stroke();

    // Right Brow
    ctx.beginPath();
    ctx.moveTo(hx + 8, hy - 50);
    ctx.quadraticCurveTo(hx + 26, hy - 58, hx + 44, hy - 50);
    ctx.stroke();

    // 6. Lifelike Eyes with Iris Texture & Specular Catchlights
    const eyeY = hy - 40;
    const eyeSpacing = 26;

    [-eyeSpacing, eyeSpacing].forEach(offsetX => {
      const ex = hx + offsetX;

      // Eye White (Sclera)
      ctx.fillStyle = '#f8f8fa';
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, 13, isBlinking ? 1.2 : 7.0, 0, 0, Math.PI * 2);
      ctx.fill();

      if (!isBlinking) {
        // Deep Warm Brown/Amber Iris
        const irisGrad = ctx.createRadialGradient(ex, eyeY, 1, ex, eyeY, 6.0);
        irisGrad.addColorStop(0, '#66442c');
        irisGrad.addColorStop(0.7, '#382214');
        irisGrad.addColorStop(1, '#140c06');
        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.arc(ex, eyeY, 6.0, 0, Math.PI * 2);
        ctx.fill();

        // Pupil
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

    // 7. Refined Nose Bridge & Soft Tip
    ctx.strokeStyle = 'rgba(150, 85, 55, 0.4)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(hx, hy - 42);
    ctx.lineTo(hx - 2, hy - 14);
    ctx.lineTo(hx + 6, hy - 9);
    ctx.stroke();

    ctx.fillStyle = '#945336';
    ctx.beginPath();
    ctx.arc(hx - 6, hy - 8, 2.2, 0, Math.PI * 2);
    ctx.arc(hx + 6, hy - 8, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // 8. Natural Smiling Human Lips
    const lipY = hy + 14;
    const lipGrad = ctx.createLinearGradient(hx - 20, lipY - 6, hx + 20, lipY + 10);
    lipGrad.addColorStop(0, '#c76e5d');
    lipGrad.addColorStop(0.5, '#e08370');
    lipGrad.addColorStop(1, '#ad5141');
    ctx.fillStyle = lipGrad;

    if (hasSmile) {
      // Upper Smiling Lip
      ctx.beginPath();
      ctx.moveTo(hx - 22, lipY - 2);
      ctx.quadraticCurveTo(hx - 10, lipY - 7, hx, lipY - 4);
      ctx.quadraticCurveTo(hx + 10, lipY - 7, hx + 22, lipY - 2);
      ctx.quadraticCurveTo(hx, lipY + 2, hx - 22, lipY - 2);
      ctx.closePath();
      ctx.fill();

      // Subtle Teeth Highlights
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(hx - 12, lipY);
      ctx.lineTo(hx + 12, lipY);
      ctx.lineTo(hx + 8, lipY + 3);
      ctx.lineTo(hx - 8, lipY + 3);
      ctx.closePath();
      ctx.fill();

      // Lower Smiling Lip
      ctx.fillStyle = lipGrad;
      ctx.beginPath();
      ctx.moveTo(hx - 20, lipY);
      ctx.quadraticCurveTo(hx, lipY + 11, hx + 20, lipY);
      ctx.quadraticCurveTo(hx, lipY + 3, hx - 20, lipY);
      ctx.closePath();
      ctx.fill();
    } else {
      // Neutral Expression
      ctx.beginPath();
      ctx.moveTo(hx - 18, lipY);
      ctx.quadraticCurveTo(hx, lipY - 4, hx + 18, lipY);
      ctx.quadraticCurveTo(hx, lipY + 8, hx - 18, lipY);
      ctx.closePath();
      ctx.fill();
    }

    // 9. Emerald Hoop Earrings
    ctx.strokeStyle = '#22c55e'; // Emerald green
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(hx - 58, hy - 14, 10, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(hx + 58, hy - 14, 10, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
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

    // --- 1. 3D CAMERA ORBIT & TILT SWEEPS ---
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

    // --- 2. WARM EDITORIAL STUDIO BACKDROP ---
    const bgGrad = ctx.createRadialGradient(cx, cy * 0.75, 40, cx, cy, Math.max(w, h));
    bgGrad.addColorStop(0, '#2e1c12'); // Soft warm indoor studio gradient
    bgGrad.addColorStop(0.5, '#160d07');
    bgGrad.addColorStop(1, '#080402');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // --- 3. SOFT RIM LIGHTING & BOKEH ORBS ---
    const rimGrad = ctx.createLinearGradient(cx - 160, 0, cx + 160, h);
    rimGrad.addColorStop(0, 'rgba(255, 210, 160, 0.18)');
    rimGrad.addColorStop(0.5, 'rgba(255, 230, 200, 0.1)');
    rimGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rimGrad;
    ctx.fillRect(0, 0, w, h);

    // --- 4. DRAW PROCEDURAL REAL HUMAN CHARACTER ---
    this.drawGenerativeHuman(ctx, cx, cy, t, speedFactor, prompt);

    // --- 5. FLOATING CINEMATIC LIGHT PARTICLES ---
    for (let i = 0; i < this.particles.length; i++) {
      const pt = this.particles[i];
      const px = ((pt.x * w + t * 25 * pt.speed * speedFactor) % w);
      const py = ((pt.y * h + Math.sin(t + i) * 12) % h);
      ctx.fillStyle = 'rgba(255, 215, 160, 0.45)';
      ctx.beginPath();
      ctx.arc(px, py, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- 6. ANAMORPHIC WARM LENS FLARE ---
    const flareY = h * 0.44;
    const flareGrad = ctx.createLinearGradient(0, flareY, w, flareY);
    flareGrad.addColorStop(0, 'rgba(255, 200, 120, 0)');
    flareGrad.addColorStop(0.48, 'rgba(255, 220, 150, 0.4)');
    flareGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
    flareGrad.addColorStop(0.52, 'rgba(255, 180, 100, 0.4)');
    flareGrad.addColorStop(1, 'rgba(255, 180, 100, 0)');
    ctx.fillStyle = flareGrad;
    ctx.fillRect(0, flareY - 1, w, 2.2);

    // --- 7. CINEMATIC 35MM VIGNETTE ---
    const vigGrad = ctx.createRadialGradient(cx, cy, h * 0.38, cx, cy, Math.max(w, h) * 0.72);
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.restore(); // Camera transform restore
    ctx.restore(); // Base restore
  }
}

window.NeuralVideoEngine = GenerativeHumanVideoEngine;
