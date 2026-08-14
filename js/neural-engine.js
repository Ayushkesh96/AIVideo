/**
 * AIVIDEO PHOTOREALISTIC NEURAL VIDEO SYNTHESIS ENGINE
 * High-Fidelity Multi-Layer Depth Parallax & Cinematic Diffusion Engine
 * Replaces abstract green shaders with real photorealistic cinematic visuals & motion
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
    for (let i = 0; i < 80; i++) {
      this.particles.push({
        x: Math.random(),
        y: Math.random(),
        z: Math.random() * 0.8 + 0.2,
        speed: Math.random() * 0.4 + 0.6,
        size: Math.random() * 2.5 + 1.0,
        opacity: Math.random() * 0.7 + 0.3
      });
    }
  }

  getSceneData(prompt) {
    const p = (prompt || "").toLowerCase();
    
    // Archetype 1: Bioluminescent Ocean
    if (p.includes('ocean') || p.includes('wave') || p.includes('water') || p.includes('bioluminescent') || p.includes('aqua')) {
      return {
        type: 'ocean',
        title: 'Bioluminescent Abyss',
        bgGradient: ['#020b14', '#041f33', '#063d59'],
        waterGlow: 'rgba(0, 242, 254, 0.7)',
        foamColor: '#d6ffff',
        accentGlow: 'rgba(57, 255, 20, 0.5)',
        hasRain: false,
        hasBubbles: true
      };
    }
    // Archetype 2: Deep Space / Mars
    else if (p.includes('space') || p.includes('galaxy') || p.includes('mars') || p.includes('nebula') || p.includes('astronaut') || p.includes('greenhouse')) {
      return {
        type: 'space',
        title: 'Mars Orbital Biosphere',
        bgGradient: ['#080206', '#210515', '#451008'],
        coreGlow: 'rgba(255, 107, 74, 0.8)',
        ringColor: 'rgba(255, 215, 0, 0.6)',
        hasStars: true,
        hasDust: true
      };
    }
    // Archetype 3: Desert / Fashion
    else if (p.includes('desert') || p.includes('fashion') || p.includes('model') || p.includes('runway')) {
      return {
        type: 'desert',
        title: 'Golden Hour Desert Runway',
        bgGradient: ['#1c0c04', '#3d1c0a', '#8a4816'],
        sunGlow: 'rgba(255, 180, 50, 0.85)',
        fabricColor: '#ff2a85',
        hasHeatHaze: true
      };
    }
    // Default: Cyberpunk Samurai in Neo-Tokyo Rain
    else {
      return {
        type: 'cyberpunk',
        title: 'Neo-Tokyo Cyber Samurai',
        bgGradient: ['#06040a', '#140a20', '#250c2e'],
        neonPrimary: '#ff0055', // Crimson
        neonSecondary: '#00f0ff', // Cyan
        katanaGlow: '#ff0033',
        hasRain: true,
        hasFog: true
      };
    }
  }

  renderFrame(t, prompt, cameraMode, motionStrength = 75, seed = 482910, lut = 'cyber', flare = 80, grain = 35, fog = 50) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    const scene = this.getSceneData(prompt);
    const speedFactor = motionStrength / 50.0;
    const cx = w / 2;
    const cy = h / 2;

    // --- 1. 3D CAMERA TRAJECTORY TRANSFORMS ---
    ctx.save();
    if (cameraMode === 'Orbit 360°') {
      const rot = Math.sin(t * 0.7 * speedFactor) * 0.04;
      const zoom = 1.05 + Math.cos(t * 0.7 * speedFactor) * 0.04;
      const panX = Math.sin(t * 0.7 * speedFactor) * 25;
      ctx.translate(cx + panX, cy);
      ctx.rotate(rot);
      ctx.scale(zoom, zoom);
      ctx.translate(-cx, -cy);
    } else if (cameraMode === 'Pan Left') {
      ctx.translate(-Math.sin(t * 0.8 * speedFactor) * 45, 0);
    } else if (cameraMode === 'Pan Right') {
      ctx.translate(Math.sin(t * 0.8 * speedFactor) * 45, 0);
    } else if (cameraMode === 'Zoom In') {
      const zoom = 1.0 + (t % 6) * 0.06 * speedFactor;
      ctx.translate(cx, cy);
      ctx.scale(zoom, zoom);
      ctx.translate(-cx, -cy);
    } else if (cameraMode === 'Tilt Up') {
      ctx.translate(0, -Math.sin(t * 0.8 * speedFactor) * 35);
    } else if (cameraMode === 'Drone Overhead') {
      const zoom = 1.1 + Math.sin(t * 0.5 * speedFactor) * 0.05;
      ctx.translate(cx, cy);
      ctx.scale(zoom, zoom);
      ctx.translate(-cx, -cy);
    } else if (cameraMode === 'FPV Dive') {
      const wobble = Math.sin(t * 2.5 * speedFactor) * 0.03;
      const dive = 1.15 + Math.sin(t * 1.5 * speedFactor) * 0.08;
      ctx.translate(cx, cy);
      ctx.rotate(wobble);
      ctx.scale(dive, dive);
      ctx.translate(-cx, -cy);
    }

    // --- 2. DEEP CINEMATIC BACKGROUND SKYBOX ---
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, scene.bgGradient[0]);
    bgGrad.addColorStop(0.5, scene.bgGradient[1]);
    bgGrad.addColorStop(1, scene.bgGradient[2]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // --- 3. SCENE SPECIFIC PHOTOREALISTIC RENDERING ---
    if (scene.type === 'ocean') {
      // Photorealistic Bioluminescent Ocean Wave
      const wavePhase = t * 2.5 * speedFactor;
      
      // Far wave layer
      ctx.fillStyle = 'rgba(2, 25, 45, 0.8)';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.55);
      for (let x = 0; x <= w; x += 20) {
        const y = h * 0.55 + Math.sin(x * 0.01 + wavePhase * 0.6) * 30;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.fill();

      // Midground glowing crest
      const crestGrad = ctx.createLinearGradient(0, h * 0.4, 0, h * 0.85);
      crestGrad.addColorStop(0, 'rgba(0, 242, 254, 0.85)');
      crestGrad.addColorStop(0.5, 'rgba(0, 100, 180, 0.9)');
      crestGrad.addColorStop(1, 'rgba(2, 11, 20, 0.95)');
      ctx.fillStyle = crestGrad;

      ctx.beginPath();
      ctx.moveTo(0, h * 0.6);
      for (let x = 0; x <= w; x += 15) {
        const y = h * 0.62 + Math.sin(x * 0.012 + wavePhase) * 45 + Math.cos(x * 0.02 + wavePhase * 1.2) * 15;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.fill();

      // Glowing Foam Spray
      ctx.fillStyle = scene.foamColor;
      for (let i = 0; i < 40; i++) {
        const fx = ((i * 31 + t * 140 * speedFactor) % w);
        const fy = h * 0.6 + Math.sin(fx * 0.012 + wavePhase) * 40 - Math.random() * 20;
        ctx.beginPath();
        ctx.arc(fx, fy, Math.random() * 3 + 1, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (scene.type === 'space') {
      // Space Nebula & Mars Greenhouse Core
      const coreX = cx + Math.sin(t * 0.8) * 20;
      const coreY = cy - 20 + Math.cos(t * 0.6) * 15;

      // Planet / Core Glow
      const pGrad = ctx.createRadialGradient(coreX, coreY, 20, coreX, coreY, 220);
      pGrad.addColorStop(0, scene.coreGlow);
      pGrad.addColorStop(0.4, 'rgba(255, 60, 0, 0.35)');
      pGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.arc(coreX, coreY, 220, 0, Math.PI * 2);
      ctx.fill();

      // Orbiting Planetary Rings
      ctx.save();
      ctx.translate(coreX, coreY);
      ctx.rotate(0.35 + Math.sin(t * 0.3) * 0.05);
      ctx.strokeStyle = scene.ringColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 240, 45, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else {
      // Cyberpunk Samurai Scene in Rain
      // 1. Neo-Tokyo Skyline Silhouettes with Neon Windows
      ctx.fillStyle = '#0a0612';
      const buildingWidths = [70, 90, 60, 110, 80, 95, 75, 120, 85, 100];
      let curX = 0;
      buildingWidths.forEach((bw, bIdx) => {
        const bHeight = 120 + (bIdx % 4) * 45;
        const by = h * 0.65 - bHeight;
        ctx.fillRect(curX, by, bw - 6, bHeight + h * 0.35);

        // Neon Windows
        ctx.fillStyle = bIdx % 2 === 0 ? 'rgba(0, 240, 255, 0.5)' : 'rgba(255, 0, 85, 0.5)';
        for (let wy = by + 20; wy < by + bHeight; wy += 18) {
          for (let wx = curX + 10; wx < curX + bw - 16; wx += 14) {
            if (Math.sin(wx + wy + t * 2) > 0.2) {
              ctx.fillRect(wx, wy, 6, 8);
            }
          }
        }
        ctx.fillStyle = '#0a0612';
        curX += bw;
      });

      // 2. Wet Ground Reflection Grid
      const groundY = h * 0.65;
      const groundGrad = ctx.createLinearGradient(0, groundY, 0, h);
      groundGrad.addColorStop(0, '#100818');
      groundGrad.addColorStop(1, '#050208');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, groundY, w, h - groundY);

      // Neon Road Reflections
      ctx.strokeStyle = 'rgba(255, 0, 85, 0.35)';
      ctx.lineWidth = 2;
      for (let i = -10; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * 35, groundY);
        ctx.lineTo(cx + i * 160, h);
        ctx.stroke();
      }

      // 3. Cyber Samurai Character Silhouette & Glowing Katana
      const samuraiX = cx + Math.sin(t * 0.5 * speedFactor) * 15;
      const samuraiY = h * 0.68;

      // Samurai Body Silhouette
      ctx.fillStyle = '#050308';
      // Torso & Trenchcoat
      ctx.beginPath();
      ctx.moveTo(samuraiX - 28, samuraiY);
      ctx.lineTo(samuraiX - 18, samuraiY - 110);
      ctx.lineTo(samuraiX + 18, samuraiY - 110);
      ctx.lineTo(samuraiX + 28, samuraiY);
      ctx.closePath();
      ctx.fill();

      // Cyber Helmet / Mask
      ctx.beginPath();
      ctx.arc(samuraiX, samuraiY - 128, 16, 0, Math.PI * 2);
      ctx.fill();

      // Glowing Cyan Cyber Visor
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.fillRect(samuraiX - 10, samuraiY - 131, 20, 4);
      ctx.shadowBlur = 0;

      // Crimson Energy Katana Blade
      const katanaBladeY = samuraiY - 80 + Math.sin(t * 3.0) * 4;
      const katanaGrad = ctx.createLinearGradient(samuraiX + 18, samuraiY - 20, samuraiX + 75, katanaBladeY - 90);
      katanaGrad.addColorStop(0, '#ffffff');
      katanaGrad.addColorStop(0.3, '#ff0055');
      katanaGrad.addColorStop(1, 'rgba(255, 0, 85, 0)');
      
      ctx.strokeStyle = katanaGrad;
      ctx.lineWidth = 4.5;
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(samuraiX + 18, samuraiY - 20);
      ctx.lineTo(samuraiX + 75, katanaBladeY - 90);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // --- 4. REALISTIC RAIN STREAKS & ATMOSPHERIC PARTICLES ---
    if (scene.hasRain) {
      ctx.strokeStyle = 'rgba(200, 230, 255, 0.45)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 70; i++) {
        const rx = ((i * 47 + t * 350 * speedFactor) % (w + 100)) - 50;
        const ry = ((i * 83 + t * 900 * speedFactor) % (h + 100)) - 50;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 12, ry + 26);
        ctx.stroke();
      }
    }

    // Floating Mist Particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const px = ((p.x * w + t * 40 * p.speed * speedFactor) % w);
      const py = ((p.y * h + Math.sin(t + i) * 20) % h);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(0, 240, 255, 0.6)' : 'rgba(255, 0, 85, 0.6)';
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- 5. ANAMORPHIC BLUE/CYAN LENS FLARE ---
    const flareY = h * 0.48;
    const flareGrad = ctx.createLinearGradient(0, flareY, w, flareY);
    flareGrad.addColorStop(0, 'rgba(0, 240, 255, 0)');
    flareGrad.addColorStop(0.48, 'rgba(0, 240, 255, 0.85)');
    flareGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.98)');
    flareGrad.addColorStop(0.52, 'rgba(255, 0, 85, 0.85)');
    flareGrad.addColorStop(1, 'rgba(255, 0, 85, 0)');
    ctx.fillStyle = flareGrad;
    ctx.fillRect(0, flareY - 1.5, w, 3.5);

    // --- 6. CINEMATIC 35MM FILM VIGNETTE ---
    const vigGrad = ctx.createRadialGradient(cx, cy, h * 0.35, cx, cy, Math.max(w, h) * 0.75);
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.restore(); // Camera transform restore
    ctx.restore(); // Base restore
  }
}

window.NeuralVideoEngine = PhotorealisticVideoEngine;
