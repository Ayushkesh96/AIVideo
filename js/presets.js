/**
 * HIGGSFIELD AI — VIRAL PRESETS FX ENGINE
 * Dynamic Visual Effects, Interactive Canvases & Studio Link
 */

(function () {
  const presetsData = [
    {
      id: "agamemnon",
      name: "Agamemnon",
      tag: "Surreal Epic",
      category: "surreal",
      camera: "Drone Overhead",
      desc: "Ancient titanic statue coming alive with cosmic nebula lighting and ground fractures.",
      prompt: "Epic colossal mythological warrior statue carved from obsidian stone breaking into molten lava fractures, dynamic volumetric smoke, golden sunset backlight, 35mm cinematic"
    },
    {
      id: "cold-vision",
      name: "Cold Vision",
      tag: "Sci-Fi Cyber",
      category: "scifi",
      camera: "Zoom In",
      desc: "Sub-zero thermal vision with crystalline frost overlays and electric cyan optics.",
      prompt: "Extreme close up of cybernetic android eyes freezing into crystalline fractal ice, cold blue glow, photorealistic macro lens, frost creeping across metallic skin"
    },
    {
      id: "particles",
      name: "Particles",
      tag: "VFX Transform",
      category: "vfx",
      camera: "Orbit 360°",
      desc: "Instant disintegration and particle dispersion in hyper-slow motion.",
      prompt: "Human dancer dissolving into millions of luminous golden and ember particles floating into zero gravity atmosphere, high speed 1000fps slow motion"
    },
    {
      id: "canvas",
      name: "Canvas",
      tag: "Artistic",
      category: "characters",
      camera: "Pan Right",
      desc: "Oil painting brushstrokes coming to life in real-time fluid animation.",
      prompt: "Impressionist heavy oil painting of a Venetian canal dynamically morphing and swirling with thick wet paint textures, visible palette knife strokes"
    },
    {
      id: "earth-zoom",
      name: "Earth Zoom",
      tag: "Extreme Scale",
      category: "vfx",
      camera: "FPV Dive",
      desc: "Seamless hyper-speed continuous zoom from low orbit down to a coffee cup.",
      prompt: "Continuous infinite zoom shot starting from space satellite view of planet Earth down through clouds, skyscrapers, through a window right into steam of hot coffee"
    },
    {
      id: "mighty-fighter",
      name: "Mighty Fighter",
      tag: "Action",
      category: "characters",
      camera: "Orbit 360°",
      desc: "Electrified anime combat stance with energy aura and motion blur.",
      prompt: "Martial arts master charging glowing electric energy aura, sparks crackling across fists, high tension action anime cinematography, dynamic perspective"
    },
    {
      id: "ink-riot",
      name: "Ink Riot",
      tag: "Graphic",
      category: "surreal",
      camera: "Pan Left",
      desc: "Japanese sumi-e black and red ink explosive calligraphy swirls.",
      prompt: "Traditional sumi ink splash exploding into fluid stylized dragon calligraphy, parchment texture background, stark black and crimson ink bleed"
    },
    {
      id: "fairytale-castle",
      name: "Fairytale Castle",
      tag: "Fantasy",
      category: "surreal",
      camera: "Tilt Up",
      desc: "Enchanted floating cloud fortress bathed in twilight aurora borealis.",
      prompt: "Majestic fantasy castle perched atop floating mountain islands above sea of clouds, glowing aurora borealis sky, magical floating lanterns"
    },
    {
      id: "bullet-time",
      name: "Bullet Time",
      tag: "VFX Matrix",
      category: "vfx",
      camera: "Orbit 360°",
      desc: "360-degree frozen-in-time camera sweep through suspended water droplets and glass.",
      prompt: "Matrix style 360 degree bullet time camera orbit around a falling champagne glass shattering with frozen liquid droplets suspended in mid-air"
    },
    {
      id: "comic",
      name: "Comic",
      tag: "Stylized",
      category: "characters",
      camera: "Zoom In",
      desc: "Pop-art halftone dot shading with dynamic comic action lines.",
      prompt: "Graphic novel pop art style superhero running across rooftops, bold halftone dot shading, vibrant yellow and cyan palette, motion action lines"
    },
    {
      id: "fallen-angel",
      name: "Fallen Angel",
      tag: "Dark Fantasy",
      category: "characters",
      camera: "Tilt Down",
      desc: "Luminescent feathered wings in rain with dramatic backlighting.",
      prompt: "Figure with massive black and luminescent glowing wings kneeling in dark rain-soaked cobblestone street, volumetric spotlight, hyper-realistic plumage"
    },
    {
      id: "cyclope",
      name: "Cyclope",
      tag: "Sci-Fi Optic",
      category: "scifi",
      camera: "FPV Dive",
      desc: "Hypersonic red laser beam focus with heat refraction.",
      prompt: "High-tech robotic sensor array charging intense crimson laser beam, heat haze optical distortion, metallic reflections, cinematic anamorphic lens flare"
    }
  ];

  const grid = document.getElementById('presets-grid');
  const filterBtns = document.querySelectorAll('.preset-filter-btn');

  function renderCards(filter = 'all') {
    if (!grid) return;
    grid.innerHTML = '';

    const filtered = filter === 'all' ? presetsData : presetsData.filter(p => p.category === filter);

    filtered.forEach((preset, index) => {
      const card = document.createElement('div');
      card.className = 'preset-card';

      card.innerHTML = `
        <div class="preset-media-wrapper">
          <canvas class="preset-canvas-preview" id="preset-cv-${preset.id}"></canvas>
          <span class="preset-tag-badge">${preset.tag}</span>
          <div class="preset-overlay-btn">
            <button class="btn btn-accent btn-sm use-preset-btn" data-id="${preset.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              Generate with Preset
            </button>
          </div>
        </div>
        <div class="preset-body">
          <div>
            <h3 class="preset-name">${preset.name}</h3>
            <p class="preset-meta">${preset.camera} • ${preset.tag}</p>
          </div>
          <button class="btn btn-icon btn-sm use-preset-btn-icon" data-id="${preset.id}" title="Try Preset">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      `;

      grid.appendChild(card);

      // Initialize individual procedural canvas preview
      setTimeout(() => {
        initPresetCanvas(`preset-cv-${preset.id}`, preset.category, index);
      }, 50);
    });

    // Attach Use Preset listeners
    document.querySelectorAll('.use-preset-btn, .use-preset-btn-icon').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.dataset.id;
        const preset = presetsData.find(p => p.id === id);
        if (preset && window.loadPresetIntoStudio) {
          window.loadPresetIntoStudio(preset);
          if (window.showToast) {
            window.showToast(`Loaded "${preset.name}" preset into Cinema Studio!`);
          }
        }
      });
    });
  }

  function initPresetCanvas(canvasId, category, seedOffset) {
    const cv = document.getElementById(canvasId);
    if (!cv) return;
    const ctx = cv.getContext('2d');
    cv.width = cv.parentElement.clientWidth || 320;
    cv.height = cv.parentElement.clientHeight || 240;

    let tick = seedOffset * 30;

    function loop() {
      tick += 0.02;
      const w = cv.width;
      const h = cv.height;
      ctx.clearRect(0, 0, w, h);

      if (category === 'scifi') {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#061320');
        grad.addColorStop(0.5, '#042838');
        grad.addColorStop(1, '#00f2fe');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = 'rgba(0, 242, 254, 0.4)';
        for (let i = 0; i < 15; i++) {
          const x = (Math.sin(tick + i) * 0.4 + 0.5) * w;
          const y = (Math.cos(tick * 0.8 + i) * 0.4 + 0.5) * h;
          ctx.beginPath();
          ctx.arc(x, y, 4 + Math.sin(tick + i) * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (category === 'vfx') {
        const grad = ctx.createRadialGradient(w/2, h/2, 10, w/2, h/2, w/2);
        grad.addColorStop(0, '#ff4d2e');
        grad.addColorStop(0.4, '#451008');
        grad.addColorStop(1, '#080507');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 20; i++) {
          const angle = tick + (i * Math.PI * 2) / 20;
          const r = 30 + Math.sin(tick * 2 + i) * 40;
          const px = w/2 + Math.cos(angle) * r;
          const py = h/2 + Math.sin(angle) * r;
          ctx.fillRect(px, py, 2.5, 2.5);
        }
      } else if (category === 'characters') {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#1c102a');
        grad.addColorStop(0.7, '#2b1442');
        grad.addColorStop(1, '#ff6b4a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#0a0512';
        ctx.beginPath();
        ctx.arc(w/2, h * 0.7, 35, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#1a1005');
        grad.addColorStop(0.6, '#3a1f0a');
        grad.addColorStop(1, '#f59e0b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      requestAnimationFrame(loop);
    }
    loop();
  }

  // Filter Buttons Event
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.category || 'all';
      renderCards(cat);
    });
  });

  window.addEventListener('DOMContentLoaded', () => {
    renderCards('all');
  });
})();
