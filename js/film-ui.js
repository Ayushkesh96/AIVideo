/**
 * AIVIDEO FILMMAKING PRODUCTION OS — UI CONTROLLER & MODALS (PHASE 2)
 * Connects reactive FilmOS state store with Project Tree, Autocomplete,
 * Modals, Settings, Multi-Track NLE, and Keyboard Shortcuts.
 */

(function () {
  let selectedClip = null;

  function initFilmUI() {
    if (!window.FilmOS) return;

    renderProjectTree();
    renderActiveElementsList();
    renderNLETracks();
    updateHeaderCounters();
    bindGlobalShortcuts();
    bindAutocomplete();
    injectModals();

    // Subscribe to state changes
    window.FilmOS.subscribe(() => {
      renderProjectTree();
      renderActiveElementsList();
      renderNLETracks();
      updateHeaderCounters();
    });
  }

  // 1. Render Left Project Hierarchy Tree
  function renderProjectTree() {
    const treeContainer = document.getElementById('filmos-tree-container');
    if (!treeContainer) return;

    const proj = window.FilmOS.state;
    const activeShot = window.FilmOS.getActiveShot();

    const charCount = proj.elements.characters.length;
    const locCount = proj.elements.locations.length;
    const propCount = proj.elements.props.length;

    let html = `
      <div class="tree-group">
        <div class="tree-section-title">📖 Project Story</div>
        <div class="tree-node-item" onclick="window.FilmOSUI.openStoryModal()">
          <span>📄 Screenplay & Logline</span>
        </div>
      </div>

      <div class="tree-group" style="margin-top:10px;">
        <div class="tree-header-row">
          <div class="tree-section-title">🎭 Reusable Elements (@)</div>
          <button class="btn btn-dark btn-sm" style="padding:2px 6px; font-size:0.68rem;" onclick="window.FilmOSUI.openAddElementModal()">+ Add</button>
        </div>
        <div class="tree-node-item" onclick="window.FilmOSUI.showElementsListModal('characters')">
          <span>👤 Characters</span>
          <span class="tree-tag-count">${charCount}</span>
        </div>
        <div class="tree-node-item" onclick="window.FilmOSUI.showElementsListModal('locations')">
          <span>📍 Locations</span>
          <span class="tree-tag-count">${locCount}</span>
        </div>
        <div class="tree-node-item" onclick="window.FilmOSUI.showElementsListModal('props')">
          <span>📦 Props</span>
          <span class="tree-tag-count">${propCount}</span>
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
          <div style="font-size:0.74rem; font-weight:800; color:#fff; padding:4px 6px; display:flex; justify-content:space-between;">
            <span>Scene ${scene.number}: ${scene.title}</span>
            <span style="color:var(--text-muted); font-size:0.66rem;">${scene.shots.length} shots</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:3px; padding-left:6px;">
      `;
      scene.shots.forEach(shot => {
        const isActive = activeShot && activeShot.id === shot.id;
        html += `
          <div class="tree-node-item ${isActive ? 'active' : ''}" onclick="window.FilmOSUI.selectShot('${shot.id}')" title="${shot.prompt}">
            <span>🎬 Shot ${shot.code}: ${shot.title}</span>
            <span class="badge ${shot.status === 'ready' ? 'badge-lime' : 'badge-dark'}" style="font-size:0.6rem; padding:1px 5px;">${shot.status.toUpperCase()}</span>
          </div>
        `;
      });
      html += `</div></div>`;
    });

    html += `</div>`;
    treeContainer.innerHTML = html;
  }

  // 2. Render Column 3 Active Elements List
  function renderActiveElementsList() {
    const listEl = document.getElementById('filmos-elements-list');
    if (!listEl) return;

    const proj = window.FilmOS.state;
    let html = '';

    proj.elements.characters.forEach(c => {
      html += `
        <div style="background:#171722; border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:8px 10px; margin-bottom:6px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-weight:800; font-size:0.75rem; color:var(--accent-lime);">@${c.tag} (${c.name})</span>
            <span style="font-size:0.68rem; color:var(--text-muted);">${c.gender}, ${c.age} y/o</span>
          </div>
          <div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${c.appearance}">${c.appearance}</div>
        </div>
      `;
    });

    proj.elements.locations.forEach(l => {
      html += `
        <div style="background:#171722; border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:8px 10px; margin-bottom:6px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-weight:800; font-size:0.75rem; color:var(--accent-cyan);">@${l.tag} (${l.name})</span>
            <span style="font-size:0.68rem; color:var(--text-muted);">${l.time}</span>
          </div>
          <div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${l.description}">${l.description}</div>
        </div>
      `;
    });

    listEl.innerHTML = html;
  }

  // 3. Render Multi-Track NLE Timeline Sequencer
  function renderNLETracks() {
    const tracksContainer = document.getElementById('filmos-timeline-tracks');
    if (!tracksContainer) return;

    const tData = window.FilmOS.state.timeline.tracks;

    let html = `
      <!-- Video Track -->
      <div class="timeline-track-lane">
        <div class="track-lane-label">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
          <span>Video</span>
        </div>
        <button class="track-nav-btn prev" onclick="window.FilmOSUI.scrollTrack('nle-track-video', -160)" title="Scroll Left">◀</button>
        <div class="track-clips-area" id="nle-track-video" onscroll="window.FilmOSUI.handleTrackScroll(this)">
    `;

    tData.video.forEach(clip => {
      const isSel = selectedClip && selectedClip.id === clip.id;
      html += `
        <div class="timeline-clip-block video ${isSel ? 'selected' : ''}" onclick="window.FilmOSUI.selectTimelineClip('video', '${clip.id}')" title="${clip.label} (${clip.duration}s)">
          <span>${clip.label}</span>
          <span style="display:flex; align-items:center; gap:4px;">
            <span style="font-size:0.65rem; color:rgba(255,255,255,0.7);">${clip.duration}s</span>
            <button class="timeline-clip-delete-btn" onclick="event.stopPropagation(); window.FilmOSUI.removeClip('video', '${clip.id}')">×</button>
          </span>
        </div>
      `;
    });

    html += `
        </div>
        <button class="track-nav-btn next" onclick="window.FilmOSUI.scrollTrack('nle-track-video', 160)" title="Scroll Right">▶</button>
      </div>

      <!-- Voice Track -->
      <div class="timeline-track-lane">
        <div class="track-lane-label">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
          <span>Voice</span>
          <button class="btn btn-icon btn-sm" style="padding:1px 4px; font-size:0.7rem; margin-left:auto;" onclick="window.FilmOSUI.openAddVoiceModal()" title="Add Voice Dialogue">+</button>
        </div>
        <button class="track-nav-btn prev" onclick="window.FilmOSUI.scrollTrack('nle-track-voice', -160)" title="Scroll Left">◀</button>
        <div class="track-clips-area" id="nle-track-voice" onscroll="window.FilmOSUI.handleTrackScroll(this)">
    `;

    tData.voice.forEach(clip => {
      html += `
        <div class="timeline-clip-block voice" onclick="window.FilmOSUI.playVoiceClip('${clip.text}')" title="${clip.speaker}: ${clip.text}">
          <span>🎙️ ${clip.speaker}: "${clip.text}"</span>
          <span style="display:flex; align-items:center; gap:4px;">
            <button class="timeline-clip-delete-btn" onclick="event.stopPropagation(); window.FilmOSUI.removeClip('voice', '${clip.id}')">×</button>
          </span>
        </div>
      `;
    });

    html += `
        </div>
        <button class="track-nav-btn next" onclick="window.FilmOSUI.scrollTrack('nle-track-voice', 160)" title="Scroll Right">▶</button>
      </div>

      <!-- Music Track -->
      <div class="timeline-track-lane">
        <div class="track-lane-label">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          <span>Music</span>
          <button class="btn btn-icon btn-sm" style="padding:1px 4px; font-size:0.7rem; margin-left:auto;" onclick="document.getElementById('nle-music-uploader').click()" title="Upload Audio File">+</button>
          <input type="file" id="nle-music-uploader" accept="audio/mp3,audio/wav" style="display:none;" onchange="window.FilmOSUI.handleMusicUpload(event)">
        </div>
        <button class="track-nav-btn prev" onclick="window.FilmOSUI.scrollTrack('nle-track-music', -160)" title="Scroll Left">◀</button>
        <div class="track-clips-area" id="nle-track-music" onscroll="window.FilmOSUI.handleTrackScroll(this)">
    `;

    tData.music.forEach(clip => {
      html += `
        <div class="timeline-clip-block music" title="${clip.title} (${clip.genre}) - ${clip.duration}s">
          <span>🎵 ${clip.title} (${clip.genre || 'Audio'})</span>
          <span style="display:flex; align-items:center; gap:4px;">
            <span style="font-size:0.65rem;">${clip.duration}s</span>
            <button class="timeline-clip-delete-btn" onclick="event.stopPropagation(); window.FilmOSUI.removeClip('music', '${clip.id}')">×</button>
          </span>
        </div>
      `;
    });

    html += `
        </div>
        <button class="track-nav-btn next" onclick="window.FilmOSUI.scrollTrack('nle-track-music', 160)" title="Scroll Right">▶</button>
      </div>
    `;

    tracksContainer.innerHTML = html;
  }

  // 4. Update Header Live Counters
  function updateHeaderCounters() {
    const proj = window.FilmOS.state;
    const projNameEl = document.getElementById('filmos-project-name');
    if (projNameEl) projNameEl.textContent = proj.name;

    const totalShots = proj.scenes.reduce((acc, s) => acc + s.shots.length, 0);
    const totalElements = proj.elements.characters.length + proj.elements.locations.length + proj.elements.props.length;

    const descEl = document.querySelector('.filmos-project-badge div div:last-child');
    if (descEl) {
      descEl.textContent = `Filmmaking Production Operating System • ${proj.scenes.length} Scenes • ${totalShots} Shots • ${totalElements} Elements`;
    }
  }

  // 5. Prompt @-Mention Autocomplete
  function bindAutocomplete() {
    const textarea = document.getElementById('studio-prompt-input');
    if (!textarea) return;

    let dropdown = document.getElementById('element-autocomplete-dropdown');
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.id = 'element-autocomplete-dropdown';
      dropdown.className = 'element-autocomplete-dropdown';
      dropdown.style.display = 'none';
      if (textarea.parentElement) textarea.parentElement.appendChild(dropdown);
    }

    textarea.addEventListener('keyup', (e) => {
      const val = textarea.value;
      const cursor = textarea.selectionStart;
      const textBeforeCursor = val.slice(0, cursor);
      const atMatch = textBeforeCursor.match(/@(\w*)$/);

      if (atMatch) {
        const query = atMatch[1].toLowerCase();
        const proj = window.FilmOS.state;
        const allElements = [
          ...proj.elements.characters.map(c => ({ type: 'Character', tag: c.tag, name: c.name })),
          ...proj.elements.locations.map(l => ({ type: 'Location', tag: l.tag, name: l.name })),
          ...proj.elements.props.map(p => ({ type: 'Prop', tag: p.tag, name: p.name })),
          ...proj.elements.styles.map(s => ({ type: 'Style', tag: s.tag, name: s.name }))
        ].filter(el => el.tag.toLowerCase().includes(query) || el.name.toLowerCase().includes(query));

        if (allElements.length > 0) {
          dropdown.innerHTML = allElements.map((el, i) => `
            <div class="autocomplete-item ${i === 0 ? 'selected' : ''}" onclick="window.FilmOSUI.insertMention('${el.tag}')">
              <span><strong>@${el.tag}</strong> (${el.name})</span>
              <span style="font-size:0.65rem; color:var(--text-muted);">${el.type}</span>
            </div>
          `).join('');
          dropdown.style.display = 'block';
        } else {
          dropdown.style.display = 'none';
        }
      } else {
        dropdown.style.display = 'none';
      }
    });
  }

  // 6. Global Keyboard Shortcuts
  function bindGlobalShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Space = Play/Pause (if not typing in input/textarea)
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const playBtn = document.getElementById('playback-play-pause');
        if (playBtn) playBtn.click();
      }
      // Ctrl+S = Save Project
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        window.FilmOS.save();
        if (window.showToast) window.showToast("✓ FilmOS Project Saved to LocalStorage!");
      }
      // Delete = Remove Selected Timeline Clip
      if (e.key === 'Delete' && selectedClip) {
        window.FilmOS.deleteTimelineClip(selectedClip.track, selectedClip.id);
        selectedClip = null;
        if (window.showToast) window.showToast("✓ Timeline Clip Removed!");
      }
    });
  }

  // 7. Inject Modal Backdrops
  function injectModals() {
    if (document.getElementById('filmos-modal-container')) return;
    const modalContainer = document.createElement('div');
    modalContainer.id = 'filmos-modal-container';
    modalContainer.innerHTML = `
      <!-- Screenplay & Story Modal -->
      <div id="modal-story" class="filmos-modal-backdrop">
        <div class="filmos-modal-card">
          <div class="filmos-modal-header">
            <span class="filmos-modal-title">📖 Screenplay & Story Overview</span>
            <button class="btn btn-icon btn-sm" onclick="window.FilmOSUI.closeModals()">×</button>
          </div>
          <div>
            <label class="modal-label">Project Title:</label>
            <input type="text" id="story-modal-title" class="custom-input" style="width:100%; margin-bottom:12px;">
            <label class="modal-label">Logline:</label>
            <textarea id="story-modal-logline" class="prompt-textarea" style="width:100%; height:60px; margin-bottom:12px;"></textarea>
            <label class="modal-label">Full Synopsis:</label>
            <textarea id="story-modal-synopsis" class="prompt-textarea" style="width:100%; height:100px;"></textarea>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:8px;">
            <button class="btn btn-dark btn-sm" onclick="window.FilmOSUI.closeModals()">Cancel</button>
            <button class="btn btn-lime btn-sm" onclick="window.FilmOSUI.saveStoryModal()">Save Story</button>
          </div>
        </div>
      </div>

      <!-- Add Element Modal -->
      <div id="modal-add-element" class="filmos-modal-backdrop">
        <div class="filmos-modal-card">
          <div class="filmos-modal-header">
            <span class="filmos-modal-title">🎭 Create Reusable @Element</span>
            <button class="btn btn-icon btn-sm" onclick="window.FilmOSUI.closeModals()">×</button>
          </div>
          <div>
            <label class="modal-label">Element Type:</label>
            <select id="elem-modal-type" class="custom-input" style="width:100%; margin-bottom:12px;">
              <option value="character">Character (@Name)</option>
              <option value="location">Location (@Setting)</option>
              <option value="prop">Prop (@Object)</option>
            </select>
            <label class="modal-label">Symbol Tag (without @):</label>
            <input type="text" id="elem-modal-tag" class="custom-input" placeholder="e.g. Maya, CyberAlley, LaserPistol" style="width:100%; margin-bottom:12px;">
            <label class="modal-label">Full Name / Label:</label>
            <input type="text" id="elem-modal-name" class="custom-input" placeholder="e.g. Maya Thorne" style="width:100%; margin-bottom:12px;">
            <label class="modal-label">Visual Appearance / Description:</label>
            <textarea id="elem-modal-desc" class="prompt-textarea" style="width:100%; height:75px;" placeholder="Detailed visual features, lighting, clothing, materials..."></textarea>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:8px;">
            <button class="btn btn-dark btn-sm" onclick="window.FilmOSUI.closeModals()">Cancel</button>
            <button class="btn btn-lime btn-sm" onclick="window.FilmOSUI.saveNewElement()">Create @Element</button>
          </div>
        </div>
      </div>

      <!-- Settings Modal -->
      <div id="modal-settings" class="filmos-modal-backdrop">
        <div class="filmos-modal-card">
          <div class="filmos-modal-header">
            <span class="filmos-modal-title">⚙️ AI Generation & Model API Settings</span>
            <button class="btn btn-icon btn-sm" onclick="window.FilmOSUI.closeModals()">×</button>
          </div>
          <div>
            <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:12px;">Configure real API endpoints or run in on-device Simulation Mode.</p>
            <label class="modal-label">LLM Prompt Enhancer Endpoint:</label>
            <input type="text" id="settings-llm-endpoint" class="custom-input" placeholder="https://api.openai.com/v1/chat/completions" style="width:100%; margin-bottom:8px;">
            <label class="modal-label">LLM API Key:</label>
            <input type="password" id="settings-llm-key" class="custom-input" placeholder="sk-..." style="width:100%; margin-bottom:14px;">

            <label class="modal-label">Video Generation API Endpoint:</label>
            <input type="text" id="settings-video-endpoint" class="custom-input" placeholder="https://api.klingai.com/v1/videos/generations" style="width:100%; margin-bottom:8px;">
            <label class="modal-label">Video Gen API Key:</label>
            <input type="password" id="settings-video-key" class="custom-input" placeholder="Bearer ..." style="width:100%;">
          </div>
          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px;">
            <button class="btn btn-dark btn-sm" onclick="window.FilmOSUI.closeModals()">Cancel</button>
            <button class="btn btn-lime btn-sm" onclick="window.FilmOSUI.saveSettings()">Save Settings</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modalContainer);
  }

  // Window Global API
  window.FilmOSUI = {
    selectShot: function (shotId) {
      window.FilmOS.setActiveShot(shotId);
      const shot = window.FilmOS.getActiveShot();
      if (!shot) return;

      // Update Center Studio Viewport
      const promptInput = document.getElementById('studio-prompt-input');
      if (promptInput) promptInput.value = shot.prompt;

      // Update Camera buttons
      document.querySelectorAll('.camera-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.camera === shot.camera);
      });

      // Update Motion Slider
      const motionSlider = document.getElementById('motion-strength-slider');
      const motionVal = document.getElementById('motion-strength-val');
      if (motionSlider && motionVal) {
        motionSlider.value = shot.motionSpeed || 75;
        motionVal.textContent = `${shot.motionSpeed || 75}%`;
      }

      // Update Aspect Ratio
      document.querySelectorAll('.ratio-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.ratio === (shot.aspectRatio || '16:9'));
      });
      const canvasContainer = document.querySelector('.viewport-canvas-container');
      if (canvasContainer) {
        canvasContainer.className = `viewport-canvas-container aspect-${(shot.aspectRatio || '16:9').replace(':', '-')}`;
      }

      const hudMotion = document.getElementById('hud-motion-tag');
      if (hudMotion) hudMotion.textContent = `${shot.lens || '35mm'} • ${shot.camera || 'Orbit 360°'}`;

      if (window.showToast) window.showToast(`Loaded Shot ${shot.code}: ${shot.title}`);
    },

    insertMention: function (tag) {
      const textarea = document.getElementById('studio-prompt-input');
      const dropdown = document.getElementById('element-autocomplete-dropdown');
      if (!textarea) return;

      const val = textarea.value;
      const cursor = textarea.selectionStart;
      const before = val.slice(0, cursor).replace(/@\w*$/, `@${tag} `);
      const after = val.slice(cursor);
      textarea.value = before + after;
      if (dropdown) dropdown.style.display = 'none';
      textarea.focus();
      window.FilmOS.updateActiveShot({ prompt: textarea.value });
    },

    openStoryModal: function () {
      const proj = window.FilmOS.state;
      document.getElementById('story-modal-title').value = proj.name;
      document.getElementById('story-modal-logline').value = proj.logline;
      document.getElementById('story-modal-synopsis').value = proj.synopsis;
      const m = document.getElementById('modal-story');
      if (m) m.classList.add('active');
    },

    saveStoryModal: function () {
      const proj = window.FilmOS.state;
      proj.name = document.getElementById('story-modal-title').value;
      proj.logline = document.getElementById('story-modal-logline').value;
      proj.synopsis = document.getElementById('story-modal-synopsis').value;
      window.FilmOS.save();
      this.closeModals();
      if (window.showToast) window.showToast("✓ Story & Screenplay Saved!");
    },

    openAddElementModal: function () {
      const m = document.getElementById('modal-add-element');
      if (m) m.classList.add('active');
    },

    saveNewElement: function () {
      const type = document.getElementById('elem-modal-type').value;
      const tag = document.getElementById('elem-modal-tag').value.trim().replace(/^@/, '');
      const name = document.getElementById('elem-modal-name').value.trim();
      const desc = document.getElementById('elem-modal-desc').value.trim();

      if (!tag || !name) {
        alert("Please enter a tag and name.");
        return;
      }

      if (type === 'character') {
        window.FilmOS.addCharacter({ tag, name, appearance: desc, clothing: "Custom Outfit" });
      } else if (type === 'location') {
        window.FilmOS.addLocation({ tag, name, description: desc, time: "Night" });
      } else {
        window.FilmOS.addProp({ tag, name, description: desc });
      }

      this.closeModals();
      if (window.showToast) window.showToast(`✓ Added Reusable Element @${tag}!`);
    },

    showElementsListModal: function (type) {
      const proj = window.FilmOS.state;
      const items = proj.elements[type] || [];
      alert(`REUSABLE ELEMENTS: ${type.toUpperCase()}\n\n` + items.map(i => `@${i.tag} (${i.name}): ${i.appearance || i.description || ''}`).join('\n\n'));
    },

    promptNewScene: function () {
      const title = prompt("Enter New Scene Title:", "The Climax Chase");
      if (title && title.trim()) {
        const sc = window.FilmOS.createScene(title.trim());
        if (window.showToast) window.showToast(`✓ Created Scene ${sc.number}: ${sc.title}!`);
      }
    },

    openSettings: function () {
      const config = window.FilmOS.state.apiConfig || {};
      document.getElementById('settings-llm-endpoint').value = config.llmEndpoint || '';
      document.getElementById('settings-llm-key').value = config.llmKey || '';
      document.getElementById('settings-video-endpoint').value = config.videoGenEndpoint || '';
      document.getElementById('settings-video-key').value = config.videoGenKey || '';
      const m = document.getElementById('modal-settings');
      if (m) m.classList.add('active');
    },

    saveSettings: function () {
      const config = {
        llmEndpoint: document.getElementById('settings-llm-endpoint').value.trim(),
        llmKey: document.getElementById('settings-llm-key').value.trim(),
        videoGenEndpoint: document.getElementById('settings-video-endpoint').value.trim(),
        videoGenKey: document.getElementById('settings-video-key').value.trim(),
        isSimulatedMode: !document.getElementById('settings-video-key').value.trim()
      };
      window.FilmOS.state.apiConfig = config;
      window.FilmOS.save();
      this.closeModals();
      if (window.showToast) window.showToast("✓ Settings Saved! (Mode: " + (config.isSimulatedMode ? "SIMULATED" : "LIVE API") + ")");
    },

    closeModals: function () {
      document.querySelectorAll('.filmos-modal-backdrop').forEach(m => m.classList.remove('active'));
    },

    selectTimelineClip: function (track, id) {
      selectedClip = { track, id };
      renderNLETracks();
    },

    removeClip: function (track, id) {
      window.FilmOS.deleteTimelineClip(track, id);
      if (window.showToast) window.showToast("✓ Clip removed from timeline");
    },

    playVoiceClip: function (text) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1.0;
        utter.pitch = 0.95;
        window.speechSynthesis.speak(utter);
        if (window.showToast) window.showToast(`🗣️ Playing Voice: "${text}"`);
      } else {
        if (window.showToast) window.showToast(`Voice text: "${text}"`);
      }
    },

    openAddVoiceModal: function () {
      const speaker = prompt("Enter Speaker Name (e.g. Sarah, Alex):", "Sarah");
      const text = prompt("Enter Dialogue Text:", "Target is acquiring coordinates now.");
      if (speaker && text) {
        window.FilmOS.state.timeline.tracks.voice.push({
          id: `clip-vo-${Date.now()}`,
          start: 0,
          duration: 3.5,
          speaker: speaker.trim(),
          text: text.trim()
        });
        window.FilmOS.save();
        if (window.showToast) window.showToast("✓ Voice Dialogue Added to Timeline!");
      }
    },

    handleMusicUpload: function (e) {
      const file = e.target.files[0];
      if (!file) return;
      window.FilmOS.state.timeline.tracks.music.push({
        id: `clip-m-${Date.now()}`,
        start: 0,
        duration: 15,
        title: file.name.replace(/\.[^/.]+$/, ""),
        genre: "Custom Audio"
      });
      window.FilmOS.save();
      if (window.showToast) window.showToast(`✓ Music Track "${file.name}" Added!`);
    },

    scrollTrack: function (trackId, amount) {
      const el = document.getElementById(trackId);
      if (el) {
        el.scrollBy({ left: amount, behavior: 'smooth' });
        setTimeout(() => this.handleTrackScroll(el), 150);
      }
    },

    handleTrackScroll: function (el) {
      if (!el) return;
      const isEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      const isStart = el.scrollLeft <= 4;
      el.classList.toggle('scrolled-end', isEnd);

      const parent = el.parentElement;
      if (parent) {
        const prevBtn = parent.querySelector('.track-nav-btn.prev');
        const nextBtn = parent.querySelector('.track-nav-btn.next');
        if (prevBtn) prevBtn.disabled = isStart;
        if (nextBtn) nextBtn.disabled = isEnd;
      }
    }
  };

  window.addEventListener('DOMContentLoaded', initFilmUI);
})();

