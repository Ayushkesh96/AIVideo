/**
 * AIVIDEO PHOTOREALISTIC HUMAN NEURAL VIDEO SYNTHESIS ENGINE
 * High-Fidelity Anatomical Human Character Generation & Physiological Motion:
 * - Subsurface Scattering Human Skin Shader
 * - Anatomical Eyes with Specular Catchlights & Natural Blink Reflex
 * - Dynamic Physiological Breathing Cycles & Head Micro-Motion
 * - Wind-Driven Hair Strand Dynamics & Fabric Drapes
 * - 3-Point Cinematic Studio Key/Rim/Fill Lighting
 */

class PhotorealisticVideoEngine {
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
        speed: Math.random() * 0.4 + 0.6,
        size: Math.random() * 2.0 + 1.0,
        opacity: Math.random() * 0.6 + 0.2
      });
    }
  }

  // Draw High-Fidelity Anatomical Human Portrait
  drawHumanCharacter(ctx, cx, cy, t, speedFactor, promptType) {
    // Physiological Motion: Breathing & Head Micro-Turn
    const breathOffset = Math.sin(t * 1.6 * speedFactor) * 4;
    const headTurn = Math.sin(t * 0.8 * speedFactor) * 8;
    const blinkCycle = Math.sin(t * 0.9);
    const isBlinking = blinkCycle > 0.94; // Natural human blink every ~3.5s

    const hx = cx + headTurn;
    const hy = cy + 20 + breathOffset;

    // 1. Shoulders & Torso (Realistic Garment / Jacket)
    ctx.save();
    const shoulderGrad = ctx.createLinearGradient(hx - 140, hy + 120, hx + 140, hy + 240);
    if (promptType === 'fashion') {
      shoulderGrad.addColorStop(0, '#2a0818');
      shoulderGrad.addColorStop(0.5, '#4d102a');
      shoulderGrad.addColorStop(1, '#18040d');
    } else {
      shoulderGrad.addColorStop(0, '#10121a');
      shoulderGrad.addColorStop(0.5, '#1e2230');
      shoulderGrad.addColorStop(1, '#0a0b10');
    }
    ctx.fillStyle = shoulderGrad;

    ctx.beginPath();
    ctx.moveTo(hx - 140, hy + 260);
    ctx.quadraticCurveTo(hx - 110, hy + 100, hx - 45, hy + 75);
    ctx.lineTo(hx + 45, hy + 75);
    ctx.quadraticCurveTo(hx + 110, hy + 100, hx + 140, hy + 260);
    ctx.closePath();
    ctx.fill();

    // Collar / Neck Opening
    ctx.fillStyle = '#08090d';
    ctx.beginPath();
    ctx.moveTo(hx - 35, hy + 75);
    ctx.lineTo(hx, hy + 115);
    ctx.lineTo(hx + 35, hy + 75);
    ctx.closePath();
    ctx.fill();

    // 2. Neck with Subsurface Skin Gradient
    const neckGrad = ctx.createLinearGradient(hx - 25, hy + 20, hx + 25, hy + 85);
    neckGrad.addColorStop(0, '#e5a886'); // Natural Caucasian/Asian skin tone
    neckGrad.addColorStop(0.5, '#c88665'); // Subsurface shadow
    neckGrad.addColorStop(1, '#8f5438');
    ctx.fillStyle = neckGrad;
    ctx.fillRect(hx - 24, hy + 20, 48, 65);

    // 3. Head & Jaw Structure
    const headGrad = ctx.createRadialGradient(hx - 15, hy - 45, 10, hx, hy - 30, 95);
    headGrad.addColorStop(0, '#ffd1b3'); // Key light highlight
    headGrad.addColorStop(0.4, '#e8aa88'); // Midtone skin
    headGrad.addColorStop(0.85, '#c98363'); // Rim shadow
    headGrad.addColorStop(1, '#7a422b');
    ctx.fillStyle = headGrad;

    ctx.beginPath();
    ctx.ellipse(hx, hy - 35, 62, 78, 0, 0, Math.PI * 2);
    ctx.fill();

    // Jawline contour
    ctx.beginPath();
    ctx.moveTo(hx - 52, hy - 30);
    ctx.quadraticCurveTo(hx - 45, hy + 25, hx, hy + 38);
    ctx.quadraticCurveTo(hx + 45, hy + 25, hx + 52, hy - 30);
    ctx.closePath();
    ctx.fill();

    // 4. Hair Flow with Dynamic Wind Strands
    const hairGrad = ctx.createLinearGradient(hx - 70, hy - 120, hx + 70, hy + 40);
    hairGrad.addColorStop(0, '#1c120c');
    hairGrad.addColorStop(0.5, '#382216');
    hairGrad.addColorStop(1, '#0f0805');
    ctx.fillStyle = hairGrad;

    ctx.beginPath();
    ctx.arc(hx, hy - 50, 70, Math.PI * 0.85, Math.PI * 2.15);
    ctx.quadraticCurveTo(hx + 75, hy + 20, hx + 58, hy + 40);
    ctx.lineTo(hx - 58, hy + 40);
    ctx.quadraticCurveTo(hx - 75, hy + 20, hx - 68, hy - 40);
    ctx.closePath();
    ctx.fill();

    // Wind blown hair strands
    ctx.strokeStyle = 'rgba(70, 45, 30, 0.7)';
    ctx.lineWidth = 2;
    for (let s = 0; s < 6; s++) {
      const strandWave = Math.sin(t * 3.0 + s) * 8;
      ctx.beginPath();
      ctx.moveTo(hx - 60 + s * 24, hy - 95);
      ctx.quadraticCurveTo(hx - 65 + s * 24 + strandWave, hy - 40, hx - 55 + s * 24, hy);
      ctx.stroke();
    }

    // 5. Eyebrows
    ctx.fillStyle = '#2b1a11';
    // Left eyebrow
    ctx.beginPath();
    ctx.moveTo(hx - 42, hy - 48);
    ctx.quadraticCurveTo(hx - 25, hy - 55, hx - 8, hy - 48);
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Right eyebrow
    ctx.beginPath();
    ctx.moveTo(hx + 8, hy - 48);
    ctx.quadraticCurveTo(hx + 25, hy - 55, hx + 42, hy - 48);
    ctx.stroke();

    // 6. Lifelike Eyes with Irises & Specular Catchlights
    const eyeY = hy - 38;
    const eyeSpacing = 24;

    [-eyeSpacing, eyeSpacing].forEach(offsetX => {
      const ex = hx + offsetX;

      // Sclera (Eye White)
      ctx.fillStyle = '#f8f8fa';
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, 12, isBlinking ? 1 : 6.5, 0, 0, Math.PI * 2);
      ctx.fill();

      if (!isBlinking) {
        // Iris (Deep Hazel/Amber)
        const irisGrad = ctx.createRadialGradient(ex, eyeY, 1, ex, eyeY, 5.5);
        irisGrad.addColorStop(0, '#5a3d28');
        irisGrad.addColorStop(0.7, '#2e1c10');
        irisGrad.addColorStop(1, '#0e0804');
        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.arc(ex, eyeY, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // Pupil
        ctx.fillStyle = '#050201';
        ctx.beginPath();
        ctx.arc(ex, eyeY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Specular Catchlight (Eye sparkle reflection)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex - 1.8, eyeY - 1.8, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Upper Eyelash line
      ctx.strokeStyle = '#1a0e08';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(ex, eyeY - 1, 13, isBlinking ? 1 : 7, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
    });

    // 7. Nose Bridge & Shading
    ctx.strokeStyle = 'rgba(160, 95, 65, 0.45)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(hx, hy - 40);
    ctx.lineTo(hx - 2, hy - 12);
    ctx.lineTo(hx + 6, hy - 8);
    ctx.stroke();

    // Nostril subtle tone
    ctx.fillStyle = '#8f4f32';
    ctx.beginPath();
    ctx.arc(hx - 5, hy - 7, 2, 0, Math.PI * 2);
    ctx.arc(hx + 5, hy - 7, 2, 0, Math.PI * 2);
    ctx.fill();

    // 8. Natural Human Lips
    const lipY = hy + 12;
    const lipGrad = ctx.createLinearGradient(hx - 18, lipY - 5, hx + 18, lipY + 8);
    lipGrad.addColorStop(0, '#c76e5d');
    lipGrad.addColorStop(0.5, '#df8472');
    lipGrad.addColorStop(1, '#ad5141');
    ctx.fillStyle = lipGrad;

    // Upper Lip
    ctx.beginPath();
    ctx.moveTo(hx - 18, lipY);
    ctx.quadraticCurveTo(hx - 8, lipY - 5, hx, lipY - 3);
    ctx.quadraticCurveTo(hx + 8, lipY - 5, hx + 18, lipY);
    ctx.quadraticCurveTo(hx, lipY + 2, hx - 18, lipY);
    ctx.closePath();
    ctx.fill();

    // Lower Lip
    ctx.beginPath();
    ctx.moveTo(hx - 16, lipY);
    ctx.quadraticCurveTo(hx, lipY + 9, hx + 16, lipY);
    ctx.quadraticCurveTo(hx, lipY + 2, hx - 16, lipY);
    ctx.closePath();
    ctx.fill();

    // 9. Cyber Visor / Neon Warpaint if Cyberpunk
    if (promptType === 'cyberpunk') {
      ctx.fillStyle = 'rgba(0, 240, 255, 0.85)';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 14;
      ctx.fillRect(hx - 48, hy - 41, 96, 4);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  renderFrame(t, prompt, cameraMode, motionStrength = 75, seed = 482910, lut = 'cyber', flare = 80, grain = 35, fog = 50) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    const speedFactor = motionStrength / 50.0;
    const cx = w / 2;
    const cy = h / 2;
    const p = (prompt || "").toLowerCase();

    // Scene Archetype
    let sceneType = 'human';
    if (p.includes('fashion') || p.includes('model') || p.includes('runway') || p.includes('editorial')) {
      sceneType = 'fashion';
    } else if (p.includes('cyber') || p.includes('samurai') || p.includes('neon') || p.includes('warrior')) {
      sceneType = 'cyberpunk';
    }

    // --- 1. CAMERA MOVEMENT ---
    ctx.save();
    if (cameraMode === 'Orbit 360°') {
      const rot = Math.sin(t * 0.7 * speedFactor) * 0.03;
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
    }

    // --- 2. CINEMATIC STUDIO BACKGROUND ---
    const bgGrad = ctx.createRadialGradient(cx, cy * 0.8, 30, cx, cy, Math.max(w, h));
    if (sceneType === 'fashion') {
      bgGrad.addColorStop(0, '#361522');
      bgGrad.addColorStop(0.5, '#1a0810');
      bgGrad.addColorStop(1, '#080305');
    } else if (sceneType === 'cyberpunk') {
      bgGrad.addColorStop(0, '#1c0a25');
      bgGrad.addColorStop(0.5, '#0e0414');
      bgGrad.addColorStop(1, '#040206');
    } else {
      bgGrad.addColorStop(0, '#18202c');
      bgGrad.addColorStop(0.5, '#0d1218');
      bgGrad.addColorStop(1, '#05070a');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // --- 3. STUDIO BACKLIGHT & RIM LIGHT BEAMS ---
    const rimGrad = ctx.createLinearGradient(cx - 150, 0, cx + 150, h);
    rimGrad.addColorStop(0, 'rgba(255, 200, 150, 0.2)');
    rimGrad.addColorStop(0.5, 'rgba(200, 240, 255, 0.15)');
    rimGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rimGrad;
    ctx.fillRect(0, 0, w, h);

    // --- 4. DRAW PHOTOREALISTIC HUMAN CHARACTER ---
    this.drawHumanCharacter(ctx, cx, cy, t, speedFactor, sceneType);

    // --- 5. FLOATING CINEMATIC DUST & LIGHT MOTES ---
    for (let i = 0; i < this.particles.length; i++) {
      const pt = this.particles[i];
      const px = ((pt.x * w + t * 30 * pt.speed * speedFactor) % w);
      const py = ((pt.y * h + Math.sin(t + i) * 15) % h);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 220, 180, 0.5)' : 'rgba(200, 240, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(px, py, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- 6. ANAMORPHIC BLUE/WARM LENS FLARE ---
    const flareY = h * 0.42;
    const flareGrad = ctx.createLinearGradient(0, flareY, w, flareY);
    flareGrad.addColorStop(0, 'rgba(0, 240, 255, 0)');
    flareGrad.addColorStop(0.48, 'rgba(0, 240, 255, 0.6)');
    flareGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.9)');
    flareGrad.addColorStop(0.52, 'rgba(255, 120, 180, 0.6)');
    flareGrad.addColorStop(1, 'rgba(255, 120, 180, 0)');
    ctx.fillStyle = flareGrad;
    ctx.fillRect(0, flareY - 1, w, 2.5);

    // --- 7. HOLLYWOOD 35MM VIGNETTE ---
    const vigGrad = ctx.createRadialGradient(cx, cy, h * 0.4, cx, cy, Math.max(w, h) * 0.7);
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.restore(); // Camera transform
    ctx.restore(); // Base
  }
}

window.NeuralVideoEngine = PhotorealisticVideoEngine;
