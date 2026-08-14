/**
 * AIVIDEO SHOWCASE & HERO PROCEDURAL VIDEO ENGINES
 * Rich, vivid, auto-playing video simulations for all Hero and Spotlight cards
 */

(function () {
  function initHeroVisuals() {
    // 1. Seedance 2.5 4K Canvas (Cyberpunk Neo-Tokyo Sunset Flight)
    const cvSeedance = document.getElementById('hero-cv-seedance');
    if (cvSeedance) {
      const ctx = cvSeedance.getContext('2d');
      cvSeedance.width = cvSeedance.parentElement.clientWidth || 460;
      cvSeedance.height = cvSeedance.parentElement.clientHeight || 260;

      let tick = 0;
      function loopSeedance() {
        tick += 0.02;
        const w = cvSeedance.width;
        const h = cvSeedance.height;
        ctx.clearRect(0, 0, w, h);

        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#0a192f');
        grad.addColorStop(0.5, '#1e293b');
        grad.addColorStop(1, '#ff6b4a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Perspective Floor Grids
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
        ctx.lineWidth = 1.5;
        for (let i = -8; i <= 8; i++) {
          ctx.beginPath();
          ctx.moveTo(w / 2 + i * 25, h * 0.65);
          ctx.lineTo(w / 2 + i * 90, h);
          ctx.stroke();
        }

        // Horizontal Grid lines moving forward
        const gridOffset = (tick * 40) % 25;
        for (let y = h * 0.65 + gridOffset; y < h; y += 25) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }

        // Glowing Sun / Energy Core
        const sunGrad = ctx.createRadialGradient(w/2, h * 0.5, 5, w/2, h * 0.5, 90);
        sunGrad.addColorStop(0, '#ffea79');
        sunGrad.addColorStop(0.4, '#ff4b4b');
        sunGrad.addColorStop(1, 'rgba(255, 75, 75, 0)');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(w/2, h * 0.5, 90, 0, Math.PI * 2);
        ctx.fill();

        // Particles
        for (let i = 0; i < 25; i++) {
          const px = ((i * 37 + tick * 50) % w);
          const py = ((i * 61 + tick * 30) % (h * 0.7));
          ctx.fillStyle = i % 2 === 0 ? 'rgba(0, 229, 255, 0.8)' : 'rgba(255, 120, 50, 0.8)';
          ctx.beginPath();
          ctx.arc(px, py, 2 + (i % 3), 0, Math.PI * 2);
          ctx.fill();
        }

        requestAnimationFrame(loopSeedance);
      }
      loopSeedance();
    }

    // 2. Marketing Studio UGC Collage Canvas (Dynamic Multi-Video Collage)
    const cvMarketing = document.getElementById('hero-cv-marketing');
    if (cvMarketing) {
      const ctx = cvMarketing.getContext('2d');
      cvMarketing.width = cvMarketing.parentElement.clientWidth || 460;
      cvMarketing.height = cvMarketing.parentElement.clientHeight || 260;

      let tick = 0;
      function loopMarketing() {
        tick += 0.025;
        const w = cvMarketing.width;
        const h = cvMarketing.height;
        ctx.clearRect(0, 0, w, h);

        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#2d1b22');
        grad.addColorStop(0.5, '#4a2830');
        grad.addColorStop(1, '#f59e0b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        const cardW = w * 0.28;
        const cardH = h * 0.68;

        // Card Left
        ctx.save();
        ctx.translate(w * 0.2, h * 0.5 + Math.sin(tick) * 6);
        ctx.rotate(-0.08);
        ctx.fillStyle = '#1c141d';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.fillRect(-cardW/2, -cardH/2, cardW, cardH);
        ctx.strokeRect(-cardW/2, -cardH/2, cardW, cardH);
        ctx.fillStyle = '#ff2a85';
        ctx.beginPath();
        ctx.arc(0, -cardH * 0.15, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Card Right
        ctx.save();
        ctx.translate(w * 0.8, h * 0.5 + Math.cos(tick) * 6);
        ctx.rotate(0.08);
        ctx.fillStyle = '#181a24';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.fillRect(-cardW/2, -cardH/2, cardW, cardH);
        ctx.strokeRect(-cardW/2, -cardH/2, cardW, cardH);
        ctx.fillStyle = '#00f2fe';
        ctx.beginPath();
        ctx.arc(0, -cardH * 0.15, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Card Center (Hero UGC)
        ctx.save();
        ctx.translate(w * 0.5, h * 0.5 + Math.sin(tick * 1.2) * 8);
        ctx.fillStyle = '#221928';
        ctx.strokeStyle = 'rgba(204, 255, 0, 0.8)';
        ctx.lineWidth = 2.5;
        ctx.fillRect(-cardW * 0.55, -cardH * 0.55, cardW * 1.1, cardH * 1.1);
        ctx.strokeRect(-cardW * 0.55, -cardH * 0.55, cardW * 1.1, cardH * 1.1);
        ctx.fillStyle = '#ffd080';
        ctx.beginPath();
        ctx.arc(0, -cardH * 0.15, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        requestAnimationFrame(loopMarketing);
      }
      loopMarketing();
    }

    // 3. Adiliada Fantasy Battle Canvas
    const cvAdiliada = document.getElementById('hero-cv-adiliada');
    if (cvAdiliada) {
      const ctx = cvAdiliada.getContext('2d');
      cvAdiliada.width = cvAdiliada.parentElement.clientWidth || 460;
      cvAdiliada.height = cvAdiliada.parentElement.clientHeight || 260;

      let tick = 0;
      function loopAdiliada() {
        tick += 0.02;
        const w = cvAdiliada.width;
        const h = cvAdiliada.height;
        ctx.clearRect(0, 0, w, h);

        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#1c0f08');
        grad.addColorStop(0.5, '#3a1f10');
        grad.addColorStop(1, '#1a2e10');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        for (let i = 0; i < 30; i++) {
          const px = ((i * 41 + tick * 80) % w);
          const py = h - ((i * 59 + tick * 60) % h);
          ctx.fillStyle = i % 3 === 0 ? 'rgba(204, 255, 0, 0.8)' : 'rgba(255, 100, 30, 0.7)';
          ctx.beginPath();
          ctx.arc(px, py, 2.5 + (i % 3), 0, Math.PI * 2);
          ctx.fill();
        }

        requestAnimationFrame(loopAdiliada);
      }
      loopAdiliada();
    }

    // 4. Left Spotlight Hero Background Canvas
    const cvSpotlight = document.getElementById('spotlight-bg-canvas');
    if (cvSpotlight) {
      const ctx = cvSpotlight.getContext('2d');
      cvSpotlight.width = cvSpotlight.parentElement.clientWidth || 600;
      cvSpotlight.height = cvSpotlight.parentElement.clientHeight || 400;

      let tick = 0;
      function loopSpotlight() {
        tick += 0.015;
        const w = cvSpotlight.width;
        const h = cvSpotlight.height;
        ctx.clearRect(0, 0, w, h);

        const grad = ctx.createRadialGradient(w * 0.7, h * 0.3, 10, w * 0.5, h * 0.5, w * 0.8);
        grad.addColorStop(0, '#4a1525');
        grad.addColorStop(0.5, '#1e0c15');
        grad.addColorStop(1, '#08080c');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Sweeping Spotlight Beams
        ctx.save();
        ctx.translate(w * 0.5, 0);
        ctx.rotate(Math.sin(tick * 0.8) * 0.2);
        const beamGrad = ctx.createLinearGradient(0, 0, 0, h);
        beamGrad.addColorStop(0, 'rgba(204, 255, 0, 0.35)');
        beamGrad.addColorStop(1, 'rgba(204, 255, 0, 0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.lineTo(-120, h);
        ctx.lineTo(120, h);
        ctx.lineTo(15, 0);
        ctx.fill();
        ctx.restore();

        requestAnimationFrame(loopSpotlight);
      }
      loopSpotlight();
    }
  }

  window.addEventListener('resize', () => {
    ['hero-cv-seedance', 'hero-cv-marketing', 'hero-cv-adiliada', 'spotlight-bg-canvas'].forEach(id => {
      const cv = document.getElementById(id);
      if (cv && cv.parentElement) {
        cv.width = cv.parentElement.clientWidth;
        cv.height = cv.parentElement.clientHeight;
      }
    });
  });

  window.addEventListener('DOMContentLoaded', () => {
    initHeroVisuals();
  });
})();
