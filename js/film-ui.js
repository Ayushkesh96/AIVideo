/**
 * AIVIDEO FILMMAKING PRODUCTION OS — UI CONTROLLER & MODALS (PHASE 2)
 * Connects reactive FilmOS state store with Project Tree, Autocomplete,
 * Modals, Settings, Multi-Track NLE, Camera Rig Inspector, Active @Elements,
 * and AI Co-Director (Script-to-Shots Generator).
 */

(function () {
  let selectedClip = null;
  let lastDirectorResult = null;
  let editingElementRef = null;

  function initFilmUI() {
    if (!window.FilmOS) return;

    renderProjectTree();
    renderActiveElementsList();
    renderCameraInspector();
    renderNLETracks();
    updateHeaderCounters();
    bindGlobalShortcuts();
    bindAutocomplete();
    injectModals();

    // Wire Copilot Ask Director Button
    const askDirectorBtn = document.getElementById('filmos-ask-director-btn');
    if (askDirectorBtn) {
      askDirectorBtn.onclick = () => window.FilmOSUI.toggleDirectorDrawer();
    }

    // Subscribe to state changes
    window.FilmOS.subscribe(() => {
      renderProjectTree();
      renderActiveElementsList();
      renderCameraInspector();
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
    const countBadge = document.getElementById('active-elements-count');
    if (!listEl) return;

    const activeElements = window.FilmOS.getActiveShotElements();
    if (countBadge) {
      countBadge.textContent = `${activeElements.length} ACTIVE`;
    }

    if (activeElements.length === 0) {
      listEl.innerHTML = `
        <div style="padding:14px; text-align:center; color:var(--text-muted); font-size:0.72rem; border:1px dashed rgba(255,255,255,0.08); border-radius:6px;">
          No @Elements active in this shot.<br>Type @ in prompt or click "+ Add Existing".
        </div>
      `;
      return;
    }

    let html = '';
    activeElements.forEach(el => {
      const typeClass = el.type === 'character' ? 'element-title-character' : el.type === 'location' ? 'element-title-location' : el.type === 'prop' ? 'element-title-prop' : 'element-title-style';
      html += `
        <div class="active-element-card" onclick="window.FilmOSUI.openEditElementModal('${el.type}', '${el.id}')" title="Click to Edit @${el.tag}">
          <div class="active-element-header">
            <span class="${typeClass}">@${el.tag} (${el.name})</span>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:0.68rem; color:var(--text-muted);">${el.tags || ''}</span>
              <button class="active-element-remove-btn" onclick="event.stopPropagation(); window.FilmOSUI.unlinkElement('${el.tag}')" title="Remove from this shot">×</button>
            </div>
          </div>
          <div style="font-size:0.7rem; color:var(--text-secondary); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${el.description}">${el.description}</div>
        </div>
      `;
    });

    listEl.innerHTML = html;
  }

  function renderCameraInspector() {
    const shot = window.FilmOS.getActiveShot();
    if (!shot) return;

    // 1. Sync Lens Buttons
    const curLens = shot.lens || '24mm';
    document.querySelectorAll('#lens-selector-grid .camera-rig-btn').forEach(btn => {
      const isMatch = btn.getAttribute('data-lens') === curLens || btn.textContent.trim() === curLens;
      btn.classList.toggle('active', isMatch);
    });

    // 2. Sync Motion Rig Buttons
    const curRig = shot.motionRig || 'Dolly';
    document.querySelectorAll('#motion-rig-selector-grid .camera-rig-btn').forEach(btn => {
      const rigAttr = btn.getAttribute('data-rig') || btn.textContent.trim();
      btn.classList.toggle('active', rigAttr === curRig);
    });

    // 3. Sync Camera Body Select
    const bodySelect = document.getElementById('camera-body-select');
    if (bodySelect && shot.cameraBody) {
      bodySelect.value = shot.cameraBody;
    }
  }

  // 3. Render Multi-Track NLE Timeline Sequencer
  function renderNLETracks() {
    const tracksContainer = document.getElementById('filmos-timeline-tracks');
    if (!tracksContainer) return;

    const tData = window.FilmOS.state.timeline.tracks;

    let html = `
      <!-- Timecode Ruler Bar -->
      <div class="timeline-ruler-bar">
        <span>00:00</span><span>00:02</span><span>00:04</span><span>00:06</span><span>00:08</span><span>00:10</span>
      </div>

      <!-- Video Track -->
      <div class="timeline-track-lane">
        <div class="track-lane-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
          <span>Video Track</span>
        </div>
        <button class="track-nav-btn prev" onclick="window.FilmOSUI.scrollTrack('nle-track-video', -160)">◀</button>
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
        <button class="track-nav-btn next" onclick="window.FilmOSUI.scrollTrack('nle-track-video', 160)">▶</button>
      </div>

      <!-- Voice Track -->
      <div class="timeline-track-lane">
        <div class="track-lane-label">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
          <span>Voice</span>
          <button class="btn btn-icon btn-sm" style="padding:1px 4px; font-size:0.7rem; margin-left:auto;" onclick="window.FilmOSUI.openAddVoiceModal()">+</button>
        </div>
        <button class="track-nav-btn prev" onclick="window.FilmOSUI.scrollTrack('nle-track-voice', -160)">◀</button>
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
        <button class="track-nav-btn next" onclick="window.FilmOSUI.scrollTrack('nle-track-voice', 160)">▶</button>
      </div>

      <!-- Music Track -->
      <div class="timeline-track-lane">
        <div class="track-lane-label">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          <span>Music</span>
          <button class="btn btn-icon btn-sm" style="padding:1px 4px; font-size:0.7rem; margin-left:auto;" onclick="document.getElementById('nle-music-uploader').click()">+</button>
          <input type="file" id="nle-music-uploader" accept="audio/mp3,audio/wav" style="display:none;" onchange="window.FilmOSUI.handleMusicUpload(event)">
        </div>
        <button class="track-nav-btn prev" onclick="window.FilmOSUI.scrollTrack('nle-track-music', -160)">◀</button>
        <div class="track-clips-area" id="nle-track-music" onscroll="window.FilmOSUI.handleTrackScroll(this)">
    `;

    tData.music.forEach(clip => {
      html += `
        <div class="timeline-clip-block music" title="${clip.title}">
          <span>🎵 ${clip.title}</span>
          <span style="display:flex; align-items:center; gap:4px;">
            <span style="font-size:0.65rem;">${clip.duration}s</span>
            <button class="timeline-clip-delete-btn" onclick="event.stopPropagation(); window.FilmOSUI.removeClip('music', '${clip.id}')">×</button>
          </span>
        </div>
      `;
    });

    html += `
        </div>
        <button class="track-nav-btn next" onclick="window.FilmOSUI.scrollTrack('nle-track-music', 160)">▶</button>
      </div>
    `;

    tracksContainer.innerHTML = html;
  }

  // 4. Update Header Info
  function updateHeaderCounters() {
    const proj = window.FilmOS.state;
    const nameEl = document.getElementById('filmos-project-name');
    if (nameEl) nameEl.textContent = proj.name;

    let totalShots = 0;
    proj.scenes.forEach(s => totalShots += s.shots.length);
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

    textarea.addEventListener('input', () => {
      window.FilmOS.updateActiveShot({ prompt: textarea.value });
      renderActiveElementsList();
    });

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
          ...proj.elements.props.map(p => ({ type: 'Prop', tag: p.tag, name: p.name }))
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
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const playBtn = document.getElementById('playback-play-pause');
        if (playBtn) playBtn.click();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        window.FilmOS.save();
        if (window.showToast) window.showToast("✓ FilmOS Project Saved to LocalStorage!");
      }
      if (e.key === 'Delete' && selectedClip) {
        window.FilmOS.deleteTimelineClip(selectedClip.track, selectedClip.id);
        selectedClip = null;
        if (window.showToast) window.showToast("✓ Timeline Clip Removed!");
      }
    });
  }

  // 7. Inject Modals
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

      <!-- Add/Edit Element Modal -->
      <div id="modal-add-element" class="filmos-modal-backdrop">
        <div class="filmos-modal-card">
          <div class="filmos-modal-header">
            <span class="filmos-modal-title" id="elem-modal-title">🎭 Create Reusable @Element</span>
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
            <input type="text" id="elem-modal-tag" class="custom-input" style="width:100%; margin-bottom:12px;">
            <label class="modal-label">Full Name / Label:</label>
            <input type="text" id="elem-modal-name" class="custom-input" style="width:100%; margin-bottom:12px;">
            <label class="modal-label">Visual Appearance / Description:</label>
            <textarea id="elem-modal-desc" class="prompt-textarea" style="width:100%; height:75px;" placeholder="Detailed visual features, lighting, clothing, materials..."></textarea>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:8px;">
            <button class="btn btn-dark btn-sm" onclick="window.FilmOSUI.closeModals()">Cancel</button>
            <button class="btn btn-lime btn-sm" id="elem-modal-save-btn" onclick="window.FilmOSUI.saveNewElement()">Save @Element</button>
          </div>
        </div>
      </div>

      <!-- Add Existing Element Popover Modal -->
      <div id="modal-existing-elements" class="filmos-modal-backdrop">
        <div class="filmos-modal-card">
          <div class="filmos-modal-header">
            <span class="filmos-modal-title">➕ Add Existing Registry Element To Shot</span>
            <button class="btn btn-icon btn-sm" onclick="window.FilmOSUI.closeModals()">×</button>
          </div>
          <div id="existing-elements-picker-list" style="display:flex; flex-direction:column; gap:8px; max-height:260px; overflow-y:auto;">
            <!-- Populated dynamically -->
          </div>
          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:12px;">
            <button class="btn btn-dark btn-sm" onclick="window.FilmOSUI.closeModals()">Close</button>
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
            <label class="modal-label">LLM API Key:</label>
            <input type="password" id="settings-llm-key" class="custom-input" style="width:100%; margin-bottom:14px;">
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

      // Refresh inspector & active elements
      renderCameraInspector();
      renderActiveElementsList();

      if (window.showToast) window.showToast(`Loaded Shot ${shot.code}: ${shot.title}`);
    },

    selectLens: function (lensVal) {
      const shot = window.FilmOS.getActiveShot();
      if (!shot) return;
      shot.lens = lensVal;
      window.FilmOS.save();
      renderCameraInspector();
      if (window.showToast) window.showToast(`Selected ${lensVal} Hollywood Cine Prime`);
    },

    selectMotionRig: function (rigVal) {
      const shot = window.FilmOS.getActiveShot();
      if (!shot) return;
      shot.motionRig = rigVal;
      
      // Choosing a rig suggests a camera move, but every value here must be a
      // real data-camera on a .camera-btn. 'Dolly Push' and 'Handheld' were
      // not, so picking those rigs blanked the camera selection entirely.
      //
      // Handheld is deliberately absent: it describes how the camera is held,
      // not where it goes, so it leaves the chosen move alone.
      const rigToChoreography = {
        'Dolly': 'Zoom In',
        'Truck': 'Pan Left',
        'Crane': 'Crane',
        'FPV Drone': 'FPV Dive',
        'Orbit 360°': 'Orbit 360°'
      };

      const mappedCamera = rigToChoreography[rigVal];
      if (mappedCamera) shot.camera = mappedCamera;
      shot.cameraMovement = rigVal;

      window.FilmOS.save();
      renderCameraInspector();

      // Sync the choreography grid, but only when this rig actually implies a
      // move — otherwise Handheld would deselect whatever the user picked.
      if (mappedCamera) {
        document.querySelectorAll('.camera-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.camera === mappedCamera);
        });
      }

      // Keep the rig grid's own highlight in step with the saved value.
      const rigGrid = document.getElementById('motion-rig-selector-grid');
      if (rigGrid) {
        rigGrid.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.rig === rigVal));
      }

      if (window.showToast) window.showToast(`Active Motion Rig: ${rigVal}`);
    },

    setCameraBody: function (bodyVal) {
      const shot = window.FilmOS.getActiveShot();
      if (!shot) return;
      shot.cameraBody = bodyVal;
      window.FilmOS.save();
      if (window.showToast) window.showToast(`Selected Camera Body: ${bodyVal}`);
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
      renderActiveElementsList();
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
      editingElementRef = null;
      document.getElementById('elem-modal-title').textContent = "🎭 Create Reusable @Element";
      document.getElementById('elem-modal-type').disabled = false;
      document.getElementById('elem-modal-tag').value = '';
      document.getElementById('elem-modal-name').value = '';
      document.getElementById('elem-modal-desc').value = '';
      const m = document.getElementById('modal-add-element');
      if (m) m.classList.add('active');
    },

    openEditElementModal: function (type, id) {
      const proj = window.FilmOS.state;
      const targetArray = proj.elements[type === 'character' ? 'characters' : type === 'location' ? 'locations' : type === 'prop' ? 'props' : 'styles'] || [];
      const item = targetArray.find(e => e.id === id);
      if (!item) return;

      editingElementRef = { type, id };
      document.getElementById('elem-modal-title').textContent = `✏️ Edit Reusable @${item.tag}`;
      const typeSelect = document.getElementById('elem-modal-type');
      typeSelect.value = type;
      typeSelect.disabled = true;

      document.getElementById('elem-modal-tag').value = item.tag;
      document.getElementById('elem-modal-name').value = item.name;
      document.getElementById('elem-modal-desc').value = item.appearance || item.description || '';

      const m = document.getElementById('modal-add-element');
      if (m) m.classList.add('active');
    },

    saveNewElement: function () {
      const type = document.getElementById('elem-modal-type').value;
      const tag = document.getElementById('elem-modal-tag').value.trim().replace(/^@/, '');
      const name = document.getElementById('elem-modal-name').value.trim();
      const desc = document.getElementById('elem-modal-desc').value.trim();

      if (!tag || !name) {
        alert("Please enter a symbol tag and name.");
        return;
      }

      if (editingElementRef) {
        // Editing existing element
        window.FilmOS.updateElement(editingElementRef.type === 'character' ? 'characters' : editingElementRef.type === 'location' ? 'locations' : 'props', editingElementRef.id, {
          tag,
          name,
          appearance: desc,
          description: desc
        });
        if (window.showToast) window.showToast(`✓ Updated @${tag} everywhere in project!`);
      } else {
        // Creating new element
        if (type === 'character') {
          window.FilmOS.addCharacter({ tag, name, appearance: desc, clothing: "Custom Outfit" });
        } else if (type === 'location') {
          window.FilmOS.addLocation({ tag, name, description: desc, time: "Night" });
        } else {
          window.FilmOS.addProp({ tag, name, description: desc });
        }
        if (window.showToast) window.showToast(`✓ Added Reusable Element @${tag}!`);
      }

      this.closeModals();
    },

    unlinkElement: function (tag) {
      window.FilmOS.unlinkElementFromShot(window.FilmOS.state.activeShotId, tag);
      const promptInput = document.getElementById('studio-prompt-input');
      const shot = window.FilmOS.getActiveShot();
      if (promptInput && shot) promptInput.value = shot.prompt;
      renderActiveElementsList();
      if (window.showToast) window.showToast(`Unlinked @${tag} from this shot`);
    },

    openAddExistingElementPopover: function () {
      const proj = window.FilmOS.state;
      const activeList = window.FilmOS.getActiveShotElements();
      const activeTags = activeList.map(a => a.tag.toLowerCase());

      const allRegistry = [
        ...proj.elements.characters.map(c => ({ type: 'character', tag: c.tag, name: c.name, desc: c.appearance })),
        ...proj.elements.locations.map(l => ({ type: 'location', tag: l.tag, name: l.name, desc: l.description })),
        ...proj.elements.props.map(p => ({ type: 'prop', tag: p.tag, name: p.name, desc: p.description }))
      ];

      const available = allRegistry.filter(r => !activeTags.includes(r.tag.toLowerCase()));
      const container = document.getElementById('existing-elements-picker-list');

      if (!container) return;

      if (available.length === 0) {
        container.innerHTML = `
          <div style="padding:16px; text-align:center; color:var(--text-muted); font-size:0.75rem;">
            All registry elements are already active in this shot!
          </div>
        `;
      } else {
        container.innerHTML = available.map(el => `
          <div class="active-element-card" onclick="window.FilmOSUI.linkExistingElement('${el.tag}')" style="cursor:pointer;">
            <div class="active-element-header">
              <span class="${el.type === 'character' ? 'element-title-character' : el.type === 'location' ? 'element-title-location' : 'element-title-prop'}">@${el.tag} (${el.name})</span>
              <span class="badge badge-dark" style="font-size:0.6rem;">+ Add To Scene</span>
            </div>
            <div style="font-size:0.7rem; color:var(--text-secondary); margin-top:2px;">${el.desc || ''}</div>
          </div>
        `).join('');
      }

      const m = document.getElementById('modal-existing-elements');
      if (m) m.classList.add('active');
    },

    linkExistingElement: function (tag) {
      window.FilmOS.linkElementToShot(window.FilmOS.state.activeShotId, tag);
      const promptInput = document.getElementById('studio-prompt-input');
      const shot = window.FilmOS.getActiveShot();
      if (promptInput && shot) promptInput.value = shot.prompt;
      renderActiveElementsList();
      this.closeModals();
      if (window.showToast) window.showToast(`✓ Added @${tag} to active shot!`);
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

    // AI Director Drawer Methods
    toggleDirectorDrawer: function () {
      const drawer = document.getElementById('director-drawer');
      if (!drawer) return;
      const isOpen = drawer.classList.toggle('open');
      if (isOpen) {
        const input = document.getElementById('director-vision-input');
        if (input && !input.value) {
          input.value = "A 30-sec Nike style runner in Tokyo rain with cyberpunk synthwave aesthetic";
        }
        // Update Simulated vs Live badge
        const badge = document.getElementById('director-mode-badge');
        const config = window.FilmOS.state.apiConfig || {};
        if (badge) {
          badge.textContent = (config.llmEndpoint && config.llmKey) ? "LIVE LLM" : "SIMULATED";
        }
        drawer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    },

    fillDirectorConcept: function (text) {
      const input = document.getElementById('director-vision-input');
      if (input) input.value = text;
    },

    generateFilmFromDirector: async function () {
      const input = document.getElementById('director-vision-input');
      const btn = document.getElementById('director-generate-submit-btn');
      const reviewBox = document.getElementById('director-review-box');
      if (!input || !input.value.trim()) {
        alert("Please describe your film vision.");
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="loading-spinner"></span> <span>Directing Script & Shots...</span>`;
      }

      try {
        const breakdown = await window.FilmOS.generateFilmBreakdown(input.value.trim());
        lastDirectorResult = breakdown;

        let totalShots = 0;
        (breakdown.scenes || []).forEach(s => totalShots += (s.shots || []).length);
        const totalElements = (breakdown.elements || []).length;

        const summaryEl = document.getElementById('director-review-summary');
        const detailsEl = document.getElementById('director-review-details');

        if (summaryEl) {
          summaryEl.textContent = `Generated ${breakdown.scenes.length} Scenes, ${totalShots} Shots, and ${totalElements} @Elements!`;
        }

        if (detailsEl) {
          let detHtml = `<div style="font-weight:800; color:#fff; margin-bottom:4px;">PROPOSED BREAKDOWN:</div>`;
          (breakdown.scenes || []).forEach(sc => {
            detHtml += `<div style="margin-bottom:6px;"><strong style="color:var(--accent-lime);">🎬 ${sc.title}:</strong> ${(sc.shots || []).map(s => `${s.title} (${s.lens}, ${s.cameraMovement})`).join(' • ')}</div>`;
          });
          detHtml += `<div style="margin-top:6px;"><strong style="color:var(--accent-cyan);">🎭 New Elements:</strong> ${(breakdown.elements || []).map(e => `@${e.name}`).join(', ')}</div>`;
          detailsEl.innerHTML = detHtml;
        }

        if (reviewBox) reviewBox.classList.add('open');
      } catch (err) {
        alert("Error generating breakdown: " + err.message);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> <span>Generate Film Breakdown</span>`;
        }
      }
    },

    discardDirectorReview: function () {
      const reviewBox = document.getElementById('director-review-box');
      if (reviewBox) reviewBox.classList.remove('open');
      lastDirectorResult = null;
      if (window.showToast) window.showToast("Director proposal discarded");
    },

    applyDirectorReview: function () {
      if (!lastDirectorResult) return;
      window.FilmOS.applyGeneratedFilmBreakdown(lastDirectorResult);
      const reviewBox = document.getElementById('director-review-box');
      if (reviewBox) reviewBox.classList.remove('open');
      this.toggleDirectorDrawer();

      // Switch to first new shot
      const shot = window.FilmOS.getActiveShot();
      if (shot) this.selectShot(shot.id);

      if (window.showToast) window.showToast("✓ Applied AI Director Breakdown to Project!");
    },

    openSettings: function () {
      const config = window.FilmOS.state.apiConfig || {};
      document.getElementById('settings-llm-key').value = config.llmKey || '';
      const m = document.getElementById('modal-settings');
      if (m) m.classList.add('active');
    },

    saveSettings: function () {
      const config = {
        llmKey: document.getElementById('settings-llm-key').value.trim(),
        isSimulatedMode: !document.getElementById('settings-llm-key').value.trim()
      };
      window.FilmOS.state.apiConfig = config;
      window.FilmOS.save();
      this.closeModals();
      if (window.showToast) window.showToast("✓ Settings Saved!");
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
