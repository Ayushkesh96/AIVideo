/**
 * HIGGSFIELD AI — COMMUNITY & OPEN SOURCE PROJECTS EXPLORER
 * Interactive Likes, Remix Count & Deep Inspector Drawer
 */

(function () {
  const projectsData = [
    {
      id: "cully-hill-boys",
      title: "Cully Hill Boys",
      author: "Higgsfield Studio",
      badge: "Public Original",
      model: "Seedance 2.5 (1080p)",
      seed: 8492019,
      camera: "Drone Overhead",
      fps: 24,
      likes: 1420,
      remixes: 384,
      aspect: "16:9",
      prompt: "Cinematic establishing drone shot descending over misty pine forest hills during twilight, warm amber lights glowing from a rustic cabin, realistic volumetric fog, 35mm anamorphic film grain",
      negativePrompt: "lowres, text, watermark, bad anatomy, overexposed, oversaturated, blurry, glitch",
      steps: 45,
      guidance: 7.5,
      layers: ["Base Prompt", "Atmospheric Fog Control", "Camera Path Spline", "Grain Shader"],
      references: 3
    },
    {
      id: "zephyr-special",
      title: "ZEPHYR: Special",
      author: "Higgsfield Studio",
      badge: "Public Original",
      model: "Seedance 2.5 (1080p)",
      seed: 1928374,
      camera: "FPV Dive",
      fps: 60,
      likes: 2890,
      remixes: 612,
      aspect: "21:9",
      prompt: "High-octane futuristic aerodynamic speeder plunging through hyper-dense neon canyon skyscrapers in a neon rainstorm, motion blur, kinetic lighting reflections on wet obsidian asphalt",
      negativePrompt: "cartoon, flat lighting, jittery frames, low polygon, blurry edges",
      steps: 50,
      guidance: 8.0,
      layers: ["Speed Velocity Map", "Rain Streak Particle System", "Vehicle CAD Silhouette", "Neon Specular Glow"],
      references: 4
    },
    {
      id: "hell-grind",
      title: "HELL GRIND",
      author: "Higgsfield Studio",
      badge: "Public Original",
      model: "Seedance 2.0",
      seed: 9283011,
      camera: "Orbit 360°",
      fps: 24,
      likes: 980,
      remixes: 215,
      aspect: "16:9",
      prompt: "Extreme sports slow-motion 360 orbit around a skateboarder grinding on a rusted industrial beam suspended over molten sparks and red smoke, harsh rim light",
      negativePrompt: "static, dull lighting, floating artifacts, distorted limbs",
      steps: 40,
      guidance: 7.0,
      layers: ["Motion Track Keyframe", "Sparks Physics Sim", "Color Grade LUT Noir"],
      references: 2
    },
    {
      id: "zephyr",
      title: "ZEPHYR",
      author: "Higgsfield Studio",
      badge: "Public Original",
      model: "Seedance 2.5 (1080p)",
      seed: 4729104,
      camera: "Pan Left",
      fps: 24,
      likes: 1730,
      remixes: 420,
      aspect: "16:9",
      prompt: "Sci-fi pilot boarding an experimental quantum aircraft inside a hangar illuminated by blue lasers and steam vents, ultra-detailed textures on pilot helmet",
      negativePrompt: "deformed visor, low quality textures, cartoonish",
      steps: 48,
      guidance: 7.8,
      layers: ["Pilot Character Rig", "Hangar Environment 3D", "Steam Emitter"],
      references: 3
    },
    {
      id: "kok-boru",
      title: "Kok Boru",
      author: "Higgsfield Studio",
      badge: "Public Original",
      model: "Seedance 2.5 (1080p)",
      seed: 5839201,
      camera: "Pan Right",
      fps: 24,
      likes: 2140,
      remixes: 530,
      aspect: "16:9",
      prompt: "Equestrian riders galloping across sweeping golden mountain steppe in Central Asia, kicked-up dust storm caught in warm golden hour sunlight, dynamic camera tracking",
      negativePrompt: "distorted horses, stiff movement, modern elements, unnatural speed",
      steps: 50,
      guidance: 8.2,
      layers: ["Horse Motion Skeleton", "Dust Particle Density", "Golden Hour Sun Ray Shader"],
      references: 5
    },
    {
      id: "anime-launch",
      title: "Anime production - Launch video",
      author: "Higgsfield Launch",
      badge: "Public",
      model: "Nano Banana Pro",
      seed: 3940192,
      camera: "Zoom In",
      fps: 24,
      likes: 3410,
      remixes: 890,
      aspect: "16:9",
      prompt: "Hand-drawn high-end Japanese anime sequence of a mecha launching from underground silo with explosive steam, dramatic cel-shading, vibrant hyper-detailed background art",
      negativePrompt: "photorealistic, 3D CGI stiffness, washed out colors",
      steps: 35,
      guidance: 9.0,
      layers: ["Anime Line Art Pass", "Cel Shader", "Explosion Smoke Cel"],
      references: 2
    },
    {
      id: "rewind-club",
      title: "REWIND CLUB",
      author: "Higgsfield Soul",
      badge: "Public",
      model: "Seedance 2.0",
      seed: 7192033,
      camera: "Orbit 360°",
      fps: 24,
      likes: 870,
      remixes: 190,
      aspect: "9:16",
      prompt: "Y2K vintage retro VHS aesthetic party in an underground neon club, heavy tape glitch, chromatic aberration, dancers under strobe lights",
      negativePrompt: "clean digital, 4k modern look, oversmoothed",
      steps: 30,
      guidance: 6.5,
      layers: ["VHS Scanline Filter", "Chromatic Distortion", "Strobe Keyframes"],
      references: 1
    },
    {
      id: "nala-heads-drop",
      title: "Nala - Heads Drop",
      author: "Higgsfield Creative",
      badge: "Public",
      model: "Seedance 2.5 (1080p)",
      seed: 6639102,
      camera: "Tilt Down",
      fps: 24,
      likes: 1950,
      remixes: 440,
      aspect: "16:9",
      prompt: "High fashion editorial runway video in a minimalist brutalist concrete temple, supermodel in sculptural crimson velvet coat, cinematic slow-motion gait",
      negativePrompt: "cluttered, noisy background, bad garment draping",
      steps: 45,
      guidance: 8.0,
      layers: ["Fabric Physics Simulation", "Concrete Caustics", "Editorial Color Grade"],
      references: 4
    }
  ];

  const grid = document.getElementById('community-projects-grid');
  const drawer = document.getElementById('inspector-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  const closeBtn = document.getElementById('drawer-close-btn');

  function renderGrid() {
    if (!grid) return;
    grid.innerHTML = '';

    projectsData.forEach((proj, idx) => {
      const card = document.createElement('div');
      card.className = 'project-card';
      card.innerHTML = `
        <div class="project-thumb-wrapper">
          <canvas class="project-thumb" id="proj-cv-${proj.id}"></canvas>
          <span class="project-badge-top">${proj.badge}</span>
        </div>
        <div class="project-info">
          <h3 class="project-title">${proj.title}</h3>
          <div class="project-meta-row">
            <span style="color:var(--text-muted);">by ${proj.author}</span>
            <div class="project-socials">
              <span class="social-stat like-btn" data-id="${proj.id}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                <span class="like-count">${proj.likes}</span>
              </span>
              <span class="social-stat">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                <span>${proj.remixes}</span>
              </span>
            </div>
          </div>
        </div>
      `;

      // Open inspector on card click
      card.querySelector('.project-thumb-wrapper').addEventListener('click', () => {
        openInspector(proj);
      });
      card.querySelector('.project-title').addEventListener('click', () => {
        openInspector(proj);
      });

      // Interactive Like
      const likeBtn = card.querySelector('.like-btn');
      likeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isLiked = likeBtn.classList.toggle('liked');
        const countSpan = likeBtn.querySelector('.like-count');
        let count = parseInt(countSpan.textContent, 10);
        count = isLiked ? count + 1 : count - 1;
        countSpan.textContent = count;
        if (isLiked && window.showToast) window.showToast(`Liked "${proj.title}"!`);
      });

      grid.appendChild(card);

      setTimeout(() => {
        initProjectCanvas(`proj-cv-${proj.id}`, idx);
      }, 50);
    });
  }

  function initProjectCanvas(canvasId, seed) {
    const cv = document.getElementById(canvasId);
    if (!cv) return;
    const ctx = cv.getContext('2d');
    cv.width = cv.parentElement.clientWidth || 320;
    cv.height = cv.parentElement.clientHeight || 180;

    let tick = seed * 45;

    function loop() {
      tick += 0.015;
      const w = cv.width;
      const h = cv.height;
      ctx.clearRect(0, 0, w, h);

      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#0c0a14');
      grad.addColorStop(0.6, '#181224');
      grad.addColorStop(1, seed % 2 === 0 ? '#ff4d2e' : '#00f2fe');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.arc(w * 0.5 + Math.sin(tick) * 30, h * 0.5, 40, 0, Math.PI * 2);
      ctx.fill();

      requestAnimationFrame(loop);
    }
    loop();
  }

  function openInspector(proj) {
    if (!drawer) return;

    document.getElementById('drawer-project-title').textContent = proj.title;
    document.getElementById('drawer-author').textContent = `by ${proj.author}`;
    document.getElementById('drawer-model').textContent = proj.model;
    document.getElementById('drawer-seed').textContent = proj.seed;
    document.getElementById('drawer-camera').textContent = proj.camera;
    document.getElementById('drawer-prompt').textContent = proj.prompt;
    document.getElementById('drawer-negative').textContent = proj.negativePrompt;
    document.getElementById('drawer-steps').textContent = `${proj.steps} steps • Guidance: ${proj.guidance}`;

    const layersContainer = document.getElementById('drawer-layers');
    if (layersContainer) {
      layersContainer.innerHTML = proj.layers.map(l => `<span class="badge badge-model" style="margin-right:4px;margin-bottom:4px;">${l}</span>`).join('');
    }

    const remixBtn = document.getElementById('drawer-remix-btn');
    if (remixBtn) {
      remixBtn.onclick = () => {
        closeDrawer();
        if (window.loadPresetIntoStudio) {
          window.loadPresetIntoStudio({
            prompt: proj.prompt,
            camera: proj.camera
          });
          if (window.showToast) {
            window.showToast(`Remixing "${proj.title}" in Cinema Studio!`);
          }
        }
      };
    }

    drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
  }

  function closeDrawer() {
    if (drawer) drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
  }

  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  window.addEventListener('DOMContentLoaded', () => {
    renderGrid();
  });
})();
