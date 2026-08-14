/**
 * AIVIDEO FILMMAKING OS — UI CONTROLLER
 * Connects FilmOS state store with interactive Project Tree, Elements,
 * AI Co-Director, Keyframe Approval, and Multi-Track NLE Editor.
 */

(function () {
  function initFilmUI() {
    const store = window.FilmOS;
    if (!store) return;

    // Render Initial State
    renderProjectTree();
    renderElementsList();
    renderTimelineTracks();
    setupEventListeners();

    // Subscribe to state changes
    store.subscribe(() => {
      renderProjectTree();
      renderElementsList();
      renderTimelineTracks();
    });
  }

  // 1. Render Left Project Tree
  function renderProjectTree() {
    const treeContainer = document.getElementById('filmos-tree-container');
    if (!treeContainer) return;

    const proj = window.FilmOS.project;
    document.getElementById('filmos-project-name').textContent = proj.name;

    let html = `
      <div class="tree-group">
        <div class="tree-section-title">📖 Project Story</div>
        <div class="tree-node-item active" onclick="window.FilmOSUI.showStoryOverview()">
          <span>📄 Screenplay & Logline</span>
        </div>
      </div>

      <div class="tree-group" style="margin-top:10px;">
        <div class="tree-section-title">🎭 Reusable Elements (@)</div>
        <div class="tree-node-item" onclick="window.FilmOSUI.showElementsTab('characters')">
          <span>👤 Characters</span>
          <span class="tree-tag-count">${proj.elements.characters.length}</span>
        </div>
        <div class="tree-node-item" onclick="window.FilmOSUI.showElementsTab('locations')">
          <span>📍 Locations</span>
          <span class="tree-tag-count">${proj.elements.locations.length}</span>
        </div>
        <div class="tree-node-item" onclick="window.FilmOSUI.showElementsTab('props')">
          <span>📦 Props</span>
          <span class="tree-tag-count">${proj.elements.props.length}</span>
        </div>
      </div>

      <div class="tree-group" style="margin-top:10px;">
        <div class="tree-header-row">
          <div class="tree-section-title">🎬 Scenes & Shot Lists</div>
          <button class="btn btn-dark btn-sm" style="padding:2px 6px; font-size:0.68rem;" onclick="window.FilmOSUI.promptNewScene()">+ Scene</button>
        </div>
    `;

    proj.scenes.forEach(scene => {
      html += `
        <div style="margin-top:6px;">
          <div style="font-size:0.75rem; font-weight:800; color:#fff; padding:4px 6px; display:flex; justify-content:space-between;">
            <span>Scene ${scene.number}: ${scene.title}</span>
            <span style="color:var(--text-muted); font-size:0.68rem;">${scene.shots.length} shots</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:3px; padding-left:8px;">
      `;
      scene.shots.forEach(shot => {
        html += `
          <div class="tree-node-item" onclick="window.FilmOSUI.loadShotIntoStudio('${shot.id}')">
            <span>🎬 Shot ${shot.code}: ${shot.title}</span>
            <span class="badge ${shot.status === 'ready' ? 'badge-lime' : 'badge-dark'}" style="font-size:0.6rem;">${shot.status.toUpperCase()}</span>
          </div>
        `;
      });
      html += `</div></div>`;
    });

    html += `</div>`;
    treeContainer.innerHTML = html;
  }

  // 2. Render Elements Drawer / Modal
  function renderElementsList() {
    const listEl = document.getElementById('filmos-elements-list');
    if (!listEl) return;

    const proj = window.FilmOS.project;
    let html = '';

    // Characters
    proj.elements.characters.forEach(c => {
      html += `
        <div class="element-card" style="background:#171722; border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:12px; margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-weight:800; color:var(--accent-lime);">@${c.tag} (${c.name})</span>
            <span style="font-size:0.7rem; color:var(--text-muted);">${c.gender}, ${c.age} y/o</span>
          </div>
          <div style="font-size:0.74rem; color:var(--text-muted); margin-top:4px;">${c.appearance}</div>
          <div style="font-size:0.72rem; color:var(--accent-cyan); margin-top:4px;">Outfit: ${c.clothing}</div>
        </div>
      `;
    });

    listEl.innerHTML = html;
  }

  // 3. Render Multi-Track NLE Timeline
  function renderTimelineTracks() {
    const tracksContainer = document.getElementById('filmos-timeline-tracks');
    if (!tracksContainer) return;

    const tData = window.FilmOS.project.timeline.tracks;

    let html = `
      <!-- Video Track -->
      <div class="timeline-track-lane">
        <div class="track-lane-label">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
          <span>Video</span>
        </div>
        <div class="track-clips-area">
    `;

    tData.video.forEach(clip => {
      const widthPct = Math.max(15, clip.duration * 12);
      html += `
        <div class="timeline-clip-block video" style="width:${widthPct}%;">
          <span>${clip.label}</span>
          <span style="font-size:0.65rem;">${clip.duration}s</span>
        </div>
      `;
    });

    html += `
        </div>
      </div>

      <!-- Voice Track -->
      <div class="timeline-track-lane">
        <div class="track-lane-label">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
          <span>Voice</span>
        </div>
        <div class="track-clips-area">
    `;

    tData.voice.forEach(clip => {
      const widthPct = Math.max(20, clip.duration * 12);
      html += `
        <div class="timeline-clip-block voice" style="width:${widthPct}%;">
          <span>${clip.speaker}: "${clip.text.slice(0, 22)}..."</span>
        </div>
      `;
    });

    html += `
        </div>
      </div>

      <!-- Music Track -->
      <div class="timeline-track-lane">
        <div class="track-lane-label">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          <span>Music</span>
        </div>
        <div class="track-clips-area">
    `;

    tData.music.forEach(clip => {
      html += `
        <div class="timeline-clip-block music" style="width:90%;">
          <span>🎵 ${clip.title} (${clip.genre})</span>
          <span>14.0s</span>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    tracksContainer.innerHTML = html;
  }

  // Setup UI Listeners & Global API
  function setupEventListeners() {
    // Co-Director Ask Button
    const askDirectorBtn = document.getElementById('filmos-ask-director-btn');
    if (askDirectorBtn) {
      askDirectorBtn.addEventListener('click', () => {
        const input = prompt("AI Co-Director: What is your film concept or commercial idea?", "A 30-second cinematic commercial of a runner sprinting through Tokyo in neon rain at night.");
        if (input && input.trim()) {
          const newScene = window.FilmOS.generateShotsFromConcept(input.trim());
          if (window.showToast) {
            window.showToast(`🎬 AI Director generated Scene "${newScene.title}" with ${newScene.shots.length} shots!`);
          }
        }
      });
    }

    // New Element Creation Buttons
    const addCharBtn = document.getElementById('filmos-add-character-btn');
    if (addCharBtn) {
      addCharBtn.addEventListener('click', () => {
        const tag = prompt("Character Tag (e.g. John, Elena):", "Maya");
        const name = prompt("Character Full Name:", "Maya Thorne");
        const appearance = prompt("Appearance details:", "Athletic, futuristic visor, braided hair");
        const clothing = prompt("Clothing:", "Charcoal tactical jacket with neon trim");

        if (tag && name) {
          window.FilmOS.addCharacter({ tag, name, appearance, clothing });
          if (window.showToast) window.showToast(`✓ Created @${tag} Character Element!`);
        }
      });
    }
  }

  // Window API
  window.FilmOSUI = {
    loadShotIntoStudio: function (shotId) {
      let foundShot = null;
      window.FilmOS.project.scenes.forEach(s => {
        const shot = s.shots.find(sh => sh.id === shotId);
        if (shot) foundShot = shot;
      });

      if (foundShot) {
        const promptInput = document.getElementById('studio-prompt-input');
        if (promptInput) {
          promptInput.value = foundShot.prompt;
          if (window.FilmOS) {
            const enriched = window.FilmOS.resolveMentions(foundShot.prompt);
            console.log("Enriched Prompt:", enriched);
          }
        }

        // Set camera
        const cameraBtns = document.querySelectorAll('.camera-btn');
        cameraBtns.forEach(btn => {
          btn.classList.toggle('active', btn.dataset.camera === foundShot.motion);
        });

        const hudMotion = document.getElementById('hud-motion-tag');
        if (hudMotion) hudMotion.textContent = `${foundShot.lens} • ${foundShot.motion}`;

        if (window.showToast) window.showToast(`Loaded Shot ${foundShot.code}: ${foundShot.title}`);

        const studioEl = document.getElementById('studio');
        if (studioEl) studioEl.scrollIntoView({ behavior: 'smooth' });
      }
    },

    showStoryOverview: function () {
      const proj = window.FilmOS.project;
      alert(`PROJECT: ${proj.name}\n\nLOGLINE:\n${proj.logline}\n\nSCENES: ${proj.scenes.length}\nTOTAL SHOTS: ${proj.scenes.reduce((a, s) => a + s.shots.length, 0)}`);
    },

    showElementsTab: function (type) {
      const proj = window.FilmOS.project;
      const count = proj.elements[type] ? proj.elements[type].length : 0;
      alert(`Elements Library: ${type.toUpperCase()} (${count} registered)\n\nType @ in any prompt to reference these elements.`);
    },

    promptNewScene: function () {
      const title = prompt("Enter New Scene Title:", "The High Speed Chase");
      if (title && title.trim()) {
        window.FilmOS.generateShotsFromConcept(title.trim());
      }
    }
  };

  window.addEventListener('DOMContentLoaded', initFilmUI);
})();
