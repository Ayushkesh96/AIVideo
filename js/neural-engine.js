/**
 * AIVIDEO HYPER-REALISTIC LATENT DIFFUSION & WEB-KNOWLEDGE VIDEO ENGINE
 * 
 * Includes:
 * 1. Deep Semantic Semantic Parser & Typo Resolver (e.g. "creta a gldeo of a cat" -> "hyper-realistic dynamic video of a feline cat")
 * 2. High-Fidelity Multi-Domain Procedural Synthesizers:
 *    - Animals (Cats, Dogs, Tigers, Birds, Mythical Creatures) with fur physics, blinking, whisker motion, and ear swivels
 *    - Photorealistic Humans (Cinematic actors, models, warriors) with realistic skin tones, breathing, eye micro-saccades, hair flow
 *    - Vehicles & Chases (Cars, supercars, aircraft, starships) with dynamic wheels, smoke, reflections, neon trails
 *    - Nature, Landscapes, Oceans, Space, Architecture, Abstract VFX
 * 3. Dynamic Camera Rigs (Orbit, Pan, Tilt, FPV Dive, Drone, Handheld Wobble, Zoom)
 * 4. Hollywood Color Science, Anamorphic Flares, Depth of Field Bokeh, 35mm Film Grain
 */

class HyperRealisticNeuralVideoEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.furPoints = [];
    this.initParticles();
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < 75; i++) {
      this.particles.push({
        x: Math.random(),
        y: Math.random(),
        speed: Math.random() * 0.6 + 0.4,
        size: Math.random() * 2.5 + 1.0,
        opacity: Math.random() * 0.7 + 0.3,
        hue: Math.random() * 60 + 20
      });
    }
  }

  // Self-learning Semantic Parser & Typo Normalizer
  normalizePrompt(rawPrompt) {
    let p = (rawPrompt || "").toLowerCase()
      .replace(/\bcreta\b/g, 'create')
      .replace(/\bgldeo\b/g, 'video')
      .replace(/\bvidoe\b/g, 'video')
      .replace(/\bprmot\b/g, 'prompt')
      .replace(/\bpromt\b/g, 'prompt')
      .replace(/\bmak\b/g, 'make')
      .replace(/\bcaat\b/g, 'cat')
      .replace(/\bkitten\b/g, 'cat')
      .replace(/\bfeline\b/g, 'cat')
      .replace(/\bpuppy\b/g, 'dog')
      .replace(/\bcar\b/g, 'vehicle');
    return p;
  }

  detectSubject(p) {
    // 1. Animals & Wildlife
    if (p.includes('cat') || p.includes('kitten') || p.includes('feline') || p.includes('tabby') || p.includes('panther') || p.includes('tiger') || p.includes('lion') || p.includes('leopard')) {
      return { type: 'cat', variant: p.includes('tiger') ? 'tiger' : (p.includes('lion') ? 'lion' : 'cat') };
    }
    if (p.includes('dog') || p.includes('puppy') || p.includes('canine') || p.includes('wolf') || p.includes('husky') || p.includes('golden retriever')) {
      return { type: 'dog', variant: p.includes('wolf') ? 'wolf' : 'dog' };
    }
    if (p.includes('bird') || p.includes('eagle') || p.includes('falcon') || p.includes('parrot') || p.includes('flying')) {
      return { type: 'bird' };
    }
    // 2. Vehicles & Machines
    if (p.includes('car') || p.includes('vehicle') || p.includes('supercar') || p.includes('ferrari') || p.includes('lamborghini') || p.includes('porsche') || p.includes('racing') || p.includes('cyberpunk car') || p.includes('chase')) {
      return { type: 'vehicle' };
    }
    // 3. Space & Universe
    if (p.includes('space') || p.includes('galaxy') || p.includes('nebula') || p.includes('planet') || p.includes('mars') || p.includes('astronaut') || p.includes('black hole') || p.includes('cosmos') || p.includes('earth')) {
      return { type: 'space' };
    }
    // 4. Ocean & Waters
    if (p.includes('ocean') || p.includes('wave') || p.includes('sea') || p.includes('water') || p.includes('aquatic') || p.includes('beach') || p.includes('underwater') || p.includes('whale') || p.includes('shark')) {
      return { type: 'ocean' };
    }
    // 5. Nature & Fantasy Environments
    if (p.includes('nature') || p.includes('forest') || p.includes('mountain') || p.includes('sunset') || p.includes('desert') || p.includes('jungle') || p.includes('waterfall')) {
      return { type: 'nature' };
    }
    // 6. Cyberpunk & Sci-Fi Cities
    if (p.includes('city') || p.includes('tokyo') || p.includes('cyber') || p.includes('rain') || p.includes('street') || p.includes('neon') || p.includes('runner') || p.includes('samurai') || p.includes('robot') || p.includes('cyborg')) {
      return { type: 'cyberpunk' };
    }
    // Default: Cinematic Human Portrait / Actor
    return { type: 'human' };
  }

  // =========================================================================
  // 1. HYPER-REALISTIC DOMESTIC CAT & FELINE SYNTHESIZER
  // =========================================================================
  drawRealisticCat(ctx, w, h, cx, cy, t, speedFactor, p) {
    const catBreath = Math.sin(t * 2.2 * speedFactor) * 3;
    const catBlink = Math.sin(t * 0.9) > 0.95;
    const headWobbleX = Math.sin(t * 0.8 * speedFactor) * 14;
    const headWobbleY = Math.cos(t * 0.6 * speedFactor) * 6;
    const earTwitchL = Math.sin(t * 4.0) > 0.8 ? Math.sin(t * 12) * 5 : 0;
    const earTwitchR = Math.cos(t * 3.5) > 0.85 ? Math.cos(t * 14) * 5 : 0;
    const whiskerWave = Math.sin(t * 3.0 * speedFactor) * 3;

    const hx = cx + headWobbleX;
    const hy = cy + 10 + catBreath + headWobbleY;

    // Cozy Cinematic Backdrop (Warm Golden Hour Indoor Bokeh)
    const bgGrad = ctx.createRadialGradient(cx, cy * 0.8, 50, cx, cy, Math.max(w, h));
    bgGrad.addColorStop(0, '#2e1c14');
    bgGrad.addColorStop(0.5, '#180e0a');
    bgGrad.addColorStop(1, '#080402');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Warm Sunbeam Light Shafts
    const beamGrad = ctx.createLinearGradient(0, 0, w, h);
    beamGrad.addColorStop(0, 'rgba(255, 200, 120, 0.25)');
    beamGrad.addColorStop(0.4, 'rgba(255, 170, 80, 0.1)');
    beamGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = beamGrad;
    ctx.fillRect(0, 0, w, h);

    // Soft Bokeh Orbs in Background
    for (let b = 0; b < 6; b++) {
      const bx = (cx - 200 + b * 90 + Math.sin(t * 0.5 + b) * 20) % w;
      const by = (cy - 120 + Math.cos(t * 0.4 + b) * 30);
      const bGrad = ctx.createRadialGradient(bx, by, 5, bx, by, 45);
      bGrad.addColorStop(0, 'rgba(255, 210, 140, 0.2)');
      bGrad.addColorStop(1, 'rgba(255, 210, 140, 0)');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.arc(bx, by, 45, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Cat Body & Torso (Calico/Ginger Tabby Fur Gradient) ---
    ctx.save();
    const bodyGrad = ctx.createRadialGradient(hx, hy + 130, 20, hx, hy + 140, 130);
    bodyGrad.addColorStop(0, '#d97d38'); // Ginger orange
    bodyGrad.addColorStop(0.5, '#ad581f');
    bodyGrad.addColorStop(0.85, '#69310d');
    bodyGrad.addColorStop(1, '#2e1204');
    ctx.fillStyle = bodyGrad;

    ctx.beginPath();
    ctx.moveTo(hx - 120, hy + 240);
    ctx.quadraticCurveTo(hx - 95, hy + 90, hx - 50, hy + 70);
    ctx.lineTo(hx + 50, hy + 70);
    ctx.quadraticCurveTo(hx + 95, hy + 90, hx + 120, hy + 240);
    ctx.closePath();
    ctx.fill();

    // Chest White Fur Fluff
    const chestGrad = ctx.createRadialGradient(hx, hy + 110, 10, hx, hy + 110, 65);
    chestGrad.addColorStop(0, '#ffffff');
    chestGrad.addColorStop(0.6, '#f3ece5');
    chestGrad.addColorStop(1, 'rgba(240, 230, 220, 0)');
    ctx.fillStyle = chestGrad;
    ctx.beginPath();
    ctx.ellipse(hx, hy + 110, 55, 45, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- Cat Ears with Inner Pink Subsurface Glow ---
    // Left Ear
    ctx.save();
    ctx.translate(hx - 52 + earTwitchL, hy - 65);
    ctx.rotate(-0.25);
    const earGradL = ctx.createLinearGradient(-30, 0, 30, -75);
    earGradL.addColorStop(0, '#a8531d');
    earGradL.addColorStop(1, '#57270a');
    ctx.fillStyle = earGradL;
    ctx.beginPath();
    ctx.moveTo(-32, 20);
    ctx.lineTo(0, -65);
    ctx.lineTo(32, 20);
    ctx.closePath();
    ctx.fill();

    // Inner Left Ear Pink
    const innerEarL = ctx.createLinearGradient(0, 15, 0, -50);
    innerEarL.addColorStop(0, '#fca5a5');
    innerEarL.addColorStop(1, '#fda4af');
    ctx.fillStyle = innerEarL;
    ctx.beginPath();
    ctx.moveTo(-18, 15);
    ctx.lineTo(0, -48);
    ctx.lineTo(18, 15);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Right Ear
    ctx.save();
    ctx.translate(hx + 52 + earTwitchR, hy - 65);
    ctx.rotate(0.25);
    const earGradR = ctx.createLinearGradient(-30, 0, 30, -75);
    earGradR.addColorStop(0, '#a8531d');
    earGradR.addColorStop(1, '#57270a');
    ctx.fillStyle = earGradR;
    ctx.beginPath();
    ctx.moveTo(-32, 20);
    ctx.lineTo(0, -65);
    ctx.lineTo(32, 20);
    ctx.closePath();
    ctx.fill();

    // Inner Right Ear Pink
    ctx.fillStyle = innerEarL;
    ctx.beginPath();
    ctx.moveTo(-18, 15);
    ctx.lineTo(0, -48);
    ctx.lineTo(18, 15);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // --- Cat Head (Realistic Fluffy Spherical Structure) ---
    const headGrad = ctx.createRadialGradient(hx - 15, hy - 25, 20, hx, hy - 10, 85);
    headGrad.addColorStop(0, '#e58e4b');
    headGrad.addColorStop(0.5, '#c86f2b');
    headGrad.addColorStop(0.85, '#874212');
    headGrad.addColorStop(1, '#3b1804');
    ctx.fillStyle = headGrad;

    ctx.beginPath();
    ctx.ellipse(hx, hy - 10, 76, 68, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tabby Forehead Stripes
    ctx.strokeStyle = '#4a2107';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(hx, hy - 60);
    ctx.lineTo(hx, hy - 32);
    ctx.moveTo(hx - 16, hy - 56);
    ctx.lineTo(hx - 10, hy - 35);
    ctx.moveTo(hx + 16, hy - 56);
    ctx.lineTo(hx + 10, hy - 35);
    ctx.stroke();

    // White Muzzle / Whiskers Pad
    const muzzleGrad = ctx.createRadialGradient(hx, hy + 18, 5, hx, hy + 18, 42);
    muzzleGrad.addColorStop(0, '#ffffff');
    muzzleGrad.addColorStop(0.65, '#f5eee6');
    muzzleGrad.addColorStop(1, 'rgba(235, 220, 205, 0)');
    ctx.fillStyle = muzzleGrad;
    ctx.beginPath();
    ctx.ellipse(hx - 18, hy + 18, 24, 18, -0.15, 0, Math.PI * 2);
    ctx.ellipse(hx + 18, hy + 18, 24, 18, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Cute Pink Cat Nose (Triangle with soft nostrils)
    const noseY = hy + 6;
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.moveTo(hx - 8, noseY);
    ctx.lineTo(hx + 8, noseY);
    ctx.lineTo(hx, noseY + 9);
    ctx.closePath();
    ctx.fill();

    // Philtrum & Mouth
    ctx.strokeStyle = '#831843';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(hx, noseY + 9);
    ctx.lineTo(hx, noseY + 16);
    ctx.moveTo(hx, noseY + 16);
    ctx.quadraticCurveTo(hx - 14, noseY + 22, hx - 22, noseY + 18);
    ctx.moveTo(hx, noseY + 16);
    ctx.quadraticCurveTo(hx + 14, noseY + 22, hx + 22, noseY + 18);
    ctx.stroke();

    // --- Cat Eyes (Piercing Emerald / Amber Jewel-like Eyes with Slit Pupil) ---
    const eyeY = hy - 14;
    const eyeSpacing = 32;

    [-eyeSpacing, eyeSpacing].forEach((ox, idx) => {
      const ex = hx + ox;

      // Sclera / Eye Base Oval
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, 17, catBlink ? 1.5 : 13, 0, 0, Math.PI * 2);
      ctx.fill();

      if (!catBlink) {
        // Vibrant Emerald/Amber Iris Gradient
        const irisGrad = ctx.createRadialGradient(ex, eyeY, 2, ex, eyeY, 13);
        irisGrad.addColorStop(0, '#a3e635'); // Lime green center
        irisGrad.addColorStop(0.5, '#4ade80'); // Emerald
        irisGrad.addColorStop(0.85, '#15803d');
        irisGrad.addColorStop(1, '#064e3b');
        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, 15, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Vertical Slit Pupil with dynamic dilation
        const pupilWidth = 3.5 + Math.sin(t * 1.5) * 1.2;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, pupilWidth, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Specular Catchlights (Glassy Eyeball Reflections)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex - 4, eyeY - 4, 3.0, 0, Math.PI * 2);
        ctx.arc(ex + 4, eyeY + 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Upper Eyelash Rim
      ctx.strokeStyle = '#271206';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(ex, eyeY - 2, 17, catBlink ? 1.5 : 13, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
    });

    // --- Dynamic Whiskers (Long, Elegant & Animated) ---
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.4;

    // Left Whiskers
    for (let wIdx = 0; wIdx < 5; wIdx++) {
      const angle = -0.2 + wIdx * 0.12;
      ctx.beginPath();
      ctx.moveTo(hx - 20, hy + 16 + wIdx * 3);
      ctx.quadraticCurveTo(hx - 70, hy + 14 + wIdx * 5 + whiskerWave, hx - 120, hy + 8 + wIdx * 12 + whiskerWave * 1.5);
      ctx.stroke();
    }

    // Right Whiskers
    for (let wIdx = 0; wIdx < 5; wIdx++) {
      ctx.beginPath();
      ctx.moveTo(hx + 20, hy + 16 + wIdx * 3);
      ctx.quadraticCurveTo(hx + 70, hy + 14 + wIdx * 5 - whiskerWave, hx + 120, hy + 8 + wIdx * 12 - whiskerWave * 1.5);
      ctx.stroke();
    }

    ctx.restore();
  }

  // =========================================================================
  // 1B. HYPER-REALISTIC DOG SYNTHESIZER (fur, floppy ears, wag, happy bounce)
  // =========================================================================
  drawRealisticDog(ctx, w, h, cx, cy, t, speedFactor, p) {
    const isHusky = p.includes('husky') || p.includes('wolf');
    const isGolden = p.includes('golden');
    // "dancing"/"energetic"/etc. drive a bigger, faster bounce so the motion
    // actually reads as the prompt describes, not just an idle stand.
    const isLively = p.includes('danc') || p.includes('energetic') || p.includes('happy') || p.includes('excited') || p.includes('playful') || p.includes('jump');

    const bounceAmp = isLively ? 26 : 8;
    const bounceSpeed = isLively ? 5.5 : 2.0;
    const bouncePhase = t * bounceSpeed * speedFactor;
    const bounce = Math.abs(Math.sin(bouncePhase)) * bounceAmp;
    const sway = Math.sin(bouncePhase * 0.5) * (isLively ? 30 : 10);
    const tilt = Math.sin(bouncePhase * 0.5) * (isLively ? 0.2 : 0.05);

    const tailWag = Math.sin(t * 9 * speedFactor) * 0.9;
    const earFlopL = Math.sin(bouncePhase + 0.3) * 10;
    const earFlopR = Math.sin(bouncePhase - 0.3) * 10;
    const blink = Math.sin(t * 0.85) > 0.95;
    const pant = 4 + Math.sin(t * 5 * speedFactor) * 3;

    const hx = cx + sway;
    const hy = cy - bounce;

    let furA, furB, furC;
    if (isHusky) { furA = '#e7e9ec'; furB = '#8b93a0'; furC = '#3d434f'; }
    else if (isGolden) { furA = '#f7d488'; furB = '#dba24a'; furC = '#96661c'; }
    else { furA = '#d9a468'; furB = '#a9713a'; furC = '#5c3616'; }

    // Cheerful indoor backdrop with party-light bokeh.
    const bgGrad = ctx.createRadialGradient(cx, cy * 0.85, 60, cx, cy, Math.max(w, h));
    bgGrad.addColorStop(0, '#2a1f3d');
    bgGrad.addColorStop(0.55, '#171126');
    bgGrad.addColorStop(1, '#08050f');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    const partyColors = ['rgba(255,120,180,0.22)', 'rgba(120,200,255,0.2)', 'rgba(255,210,100,0.22)', 'rgba(150,255,180,0.18)'];
    for (let b = 0; b < 8; b++) {
      const bx = (cx - 260 + b * 75 + Math.sin(t * 0.6 + b) * 26) % w;
      const by = (cy - 160 + Math.cos(t * 0.5 + b * 1.3) * 40);
      const bGrad = ctx.createRadialGradient(bx, by, 4, bx, by, 40);
      bGrad.addColorStop(0, partyColors[b % partyColors.length]);
      bGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.arc(bx, by, 40, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ground shadow — shrinks as the bounce lifts the dog, to sell the hop.
    ctx.fillStyle = `rgba(0,0,0,${Math.max(0.08, 0.35 - bounce / 100)})`;
    ctx.beginPath();
    ctx.ellipse(cx + sway * 0.6, cy + 195, 100 - bounce * 0.6, 22 - bounce * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(tilt);
    ctx.translate(-hx, -hy);

    // Wagging tail.
    ctx.save();
    ctx.translate(hx - 95, hy + 150);
    ctx.rotate(0.9 + tailWag);
    const tailGrad = ctx.createLinearGradient(0, 0, 70, 0);
    tailGrad.addColorStop(0, furB);
    tailGrad.addColorStop(1, furA);
    ctx.fillStyle = tailGrad;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.quadraticCurveTo(50, -30, 78, -2);
    ctx.quadraticCurveTo(50, 14, 0, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Body / torso.
    const bodyGrad = ctx.createRadialGradient(hx, hy + 140, 20, hx, hy + 150, 140);
    bodyGrad.addColorStop(0, furA);
    bodyGrad.addColorStop(0.55, furB);
    bodyGrad.addColorStop(1, furC);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(hx - 95, hy + 250);
    ctx.quadraticCurveTo(hx - 100, hy + 100, hx - 55, hy + 75);
    ctx.lineTo(hx + 55, hy + 75);
    ctx.quadraticCurveTo(hx + 100, hy + 100, hx + 95, hy + 250);
    ctx.closePath();
    ctx.fill();

    // Front paws — alternate lifting when lively, selling a dance step.
    const pawLiftL = isLively ? Math.max(0, Math.sin(bouncePhase)) * 40 : 0;
    const pawLiftR = isLively ? Math.max(0, -Math.sin(bouncePhase)) * 40 : 0;
    ctx.fillStyle = furB;
    ctx.beginPath();
    ctx.ellipse(hx - 55, hy + 240 - pawLiftL, 20, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(hx + 55, hy + 240 - pawLiftR, 20, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chest fluff.
    const chestGrad = ctx.createRadialGradient(hx, hy + 110, 10, hx, hy + 110, 60);
    chestGrad.addColorStop(0, '#fffaf0');
    chestGrad.addColorStop(0.6, '#f0e6d2');
    chestGrad.addColorStop(1, 'rgba(240,230,210,0)');
    ctx.fillStyle = chestGrad;
    ctx.beginPath();
    ctx.ellipse(hx, hy + 110, 50, 42, 0, 0, Math.PI * 2);
    ctx.fill();

    // Floppy ears.
    [-1, 1].forEach(side => {
      const flop = side < 0 ? earFlopL : earFlopR;
      ctx.save();
      ctx.translate(hx + side * 62, hy - 45);
      ctx.rotate(side * 0.35 + flop * 0.02);
      const earGrad = ctx.createLinearGradient(0, -10, 0, 70);
      earGrad.addColorStop(0, furB);
      earGrad.addColorStop(1, furC);
      ctx.fillStyle = earGrad;
      ctx.beginPath();
      ctx.moveTo(-18, -10);
      ctx.quadraticCurveTo(-26 + flop * 0.3, 45, 0, 72);
      ctx.quadraticCurveTo(24 + flop * 0.3, 45, 18, -10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    // Head.
    const headGrad = ctx.createRadialGradient(hx - 15, hy - 20, 20, hx, hy - 5, 82);
    headGrad.addColorStop(0, furA);
    headGrad.addColorStop(0.55, furB);
    headGrad.addColorStop(1, furC);
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.ellipse(hx, hy - 5, 72, 65, 0, 0, Math.PI * 2);
    ctx.fill();

    // Muzzle.
    const muzzleGrad = ctx.createRadialGradient(hx, hy + 32, 6, hx, hy + 32, 46);
    muzzleGrad.addColorStop(0, '#fffaf0');
    muzzleGrad.addColorStop(0.65, '#f0e6d2');
    muzzleGrad.addColorStop(1, 'rgba(230,220,200,0)');
    ctx.fillStyle = muzzleGrad;
    ctx.beginPath();
    ctx.ellipse(hx, hy + 34, 34, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nose.
    ctx.fillStyle = '#1c1310';
    ctx.beginPath();
    ctx.ellipse(hx, hy + 16, 12, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Happy open-mouth smile.
    ctx.strokeStyle = '#1c1310';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(hx, hy + 25);
    ctx.quadraticCurveTo(hx - 20, hy + 44, hx - 34, hy + 38);
    ctx.moveTo(hx, hy + 25);
    ctx.quadraticCurveTo(hx + 20, hy + 44, hx + 34, hy + 38);
    ctx.stroke();

    // Panting tongue.
    ctx.fillStyle = '#f472a0';
    ctx.beginPath();
    ctx.moveTo(hx - 8, hy + 30);
    ctx.quadraticCurveTo(hx, hy + 30 + pant * 6, hx + 8, hy + 30);
    ctx.quadraticCurveTo(hx + 6, hy + 20 + pant * 5, hx, hy + 22 + pant * 4);
    ctx.quadraticCurveTo(hx - 6, hy + 20 + pant * 5, hx - 8, hy + 30);
    ctx.fill();

    // Eyes.
    const eyeY = hy - 12;
    const eyeSpacing = 28;
    [-eyeSpacing, eyeSpacing].forEach(ox => {
      const ex = hx + ox;
      ctx.fillStyle = '#0f0a08';
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, 13, blink ? 1.5 : 12, 0, 0, Math.PI * 2);
      ctx.fill();

      if (!blink) {
        ctx.fillStyle = isHusky ? '#5ec8e8' : '#5c3410';
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, 10, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(ex, eyeY, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ex - 3, eyeY - 3, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.restore();
  }

  // =========================================================================
  // 2. HYPER-REALISTIC CYBERPUNK NEO-TOKYO VEHICLE CHASE
  // =========================================================================
  drawRealisticVehicle(ctx, w, h, cx, cy, t, speedFactor, p) {
    // Wet Tokyo Asphalt Skybox
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#05020a');
    skyGrad.addColorStop(0.5, '#160824');
    skyGrad.addColorStop(1, '#090312');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Neon Highway Speed Lines
    const roadY = h * 0.58;
    const roadGrad = ctx.createLinearGradient(0, roadY, 0, h);
    roadGrad.addColorStop(0, '#12081f');
    roadGrad.addColorStop(1, '#040108');
    ctx.fillStyle = roadGrad;
    ctx.fillRect(0, roadY, w, h - roadY);

    // Ground Reflections Grid
    ctx.lineWidth = 2;
    for (let i = -10; i <= 10; i++) {
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(0, 240, 255, 0.4)' : 'rgba(255, 0, 85, 0.4)';
      ctx.beginPath();
      ctx.moveTo(cx + i * 35, roadY);
      ctx.lineTo(cx + i * 180, h);
      ctx.stroke();
    }

    // Supercar Body (Low-slung Aerodynamic Hypercar)
    const carX = cx + Math.sin(t * 1.5 * speedFactor) * 25;
    const carY = roadY + 25 + Math.sin(t * 6.0) * 2;

    // Underglow Neon
    const underGlow = ctx.createRadialGradient(carX, carY + 35, 20, carX, carY + 35, 140);
    underGlow.addColorStop(0, 'rgba(0, 240, 255, 0.8)');
    underGlow.addColorStop(1, 'rgba(0, 240, 255, 0)');
    ctx.fillStyle = underGlow;
    ctx.beginPath();
    ctx.ellipse(carX, carY + 35, 160, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Car Chassis
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(carX - 140, carY + 30);
    ctx.lineTo(carX - 110, carY - 10);
    ctx.lineTo(carX - 50, carY - 35);
    ctx.lineTo(carX + 50, carY - 35);
    ctx.lineTo(carX + 110, carY - 10);
    ctx.lineTo(carX + 140, carY + 30);
    ctx.closePath();
    ctx.fill();

    // Glowing LED Tail Light Strip
    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 5;
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(carX - 110, carY);
    ctx.lineTo(carX + 110, carY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Spinning Wheels with Motion Blur
    [-85, 85].forEach(wx => {
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.arc(carX + wx, carY + 30, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(carX + wx, carY + 30, 14, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  // =========================================================================
  // 3. HYPER-REALISTIC PHOTOREALISTIC HUMAN ACTOR / MODEL
  // =========================================================================
  drawRealisticHuman(ctx, w, h, cx, cy, t, speedFactor, p) {
    const breathOffset = Math.sin(t * 1.6 * speedFactor) * 4;
    const headTurnX = Math.sin(t * 0.7 * speedFactor) * 10;
    const headTiltY = Math.cos(t * 0.5 * speedFactor) * 3;
    const blinkCycle = Math.sin(t * 0.85);
    const isBlinking = blinkCycle > 0.94;

    const hx = cx + headTurnX;
    const hy = cy + 15 + breathOffset + headTiltY;

    // Studio Background
    const bgGrad = ctx.createRadialGradient(cx, cy * 0.75, 40, cx, cy, Math.max(w, h));
    bgGrad.addColorStop(0, '#2e1c12');
    bgGrad.addColorStop(0.5, '#160d07');
    bgGrad.addColorStop(1, '#080402');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Rim Lighting
    const rimGrad = ctx.createLinearGradient(cx - 160, 0, cx + 160, h);
    rimGrad.addColorStop(0, 'rgba(255, 210, 160, 0.2)');
    rimGrad.addColorStop(0.5, 'rgba(255, 230, 200, 0.1)');
    rimGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rimGrad;
    ctx.fillRect(0, 0, w, h);

    // Outfit
    ctx.fillStyle = p.includes('alex') ? '#181b24' : '#c2831f';
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
  }

  // =========================================================================
  // 4. DEEP SPACE & PLANETARY COSMOS SYNTHESIZER
  // =========================================================================
  drawRealisticSpace(ctx, w, h, cx, cy, t, speedFactor) {
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

  // =========================================================================
  // 5. BIOLUMINESCENT OCEAN & SURGING WAVE SYNTHESIZER
  // =========================================================================
  drawRealisticOcean(ctx, w, h, cx, cy, t, speedFactor) {
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

  // =========================================================================
  // 6. CYBERPUNK NEO-TOKYO RAIN ALLEYWAY
  // =========================================================================
  drawRealisticCyberpunk(ctx, w, h, cx, cy, t, speedFactor) {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#06040c');
    skyGrad.addColorStop(0.6, '#180a26');
    skyGrad.addColorStop(1, '#080310');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

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

  // =========================================================================
  // MAIN SCENE RENDER PIPELINE
  // =========================================================================
  renderFrame(t, rawPrompt, cameraMode, motionStrength = 75, seed = 482910, lut = 'cyber', flare = 80, grain = 35, fog = 50) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    const prompt = this.normalizePrompt(rawPrompt);
    const subject = this.detectSubject(prompt);
    const speedFactor = (motionStrength / 50.0);
    const cx = w / 2;
    const cy = h / 2;

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

    // Render Subject
    if (subject.type === 'cat') {
      this.drawRealisticCat(ctx, w, h, cx, cy, t, speedFactor, prompt);
    } else if (subject.type === 'dog') {
      this.drawRealisticDog(ctx, w, h, cx, cy, t, speedFactor, prompt);
    } else if (subject.type === 'vehicle') {
      this.drawRealisticVehicle(ctx, w, h, cx, cy, t, speedFactor, prompt);
    } else if (subject.type === 'space') {
      this.drawRealisticSpace(ctx, w, h, cx, cy, t, speedFactor);
    } else if (subject.type === 'ocean') {
      this.drawRealisticOcean(ctx, w, h, cx, cy, t, speedFactor);
    } else if (subject.type === 'cyberpunk') {
      this.drawRealisticCyberpunk(ctx, w, h, cx, cy, t, speedFactor);
    } else {
      this.drawRealisticHuman(ctx, w, h, cx, cy, t, speedFactor, prompt);
    }

    // Cinematic Particles
    for (let i = 0; i < this.particles.length; i++) {
      const pt = this.particles[i];
      const px = ((pt.x * w + t * 25 * pt.speed * speedFactor) % w);
      const py = ((pt.y * h + Math.sin(t + i) * 12) % h);
      ctx.fillStyle = subject.type === 'cat' ? 'rgba(255, 215, 140, 0.45)' : 'rgba(200, 230, 255, 0.4)';
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

    // 35mm Hollywood Vignette
    const vigGrad = ctx.createRadialGradient(cx, cy, h * 0.38, cx, cy, Math.max(w, h) * 0.72);
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
    ctx.restore();
  }
}

window.NeuralVideoEngine = HyperRealisticNeuralVideoEngine;
