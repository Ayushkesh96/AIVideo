/**
 * SONG STUDIO CONTROLLER
 *
 * A second, independent creative pipeline alongside the video studio:
 * structured lyrics (intro/verse/chorus/bridge/outro sections) plus style
 * controls, generated into a full song with vocals via a self-hosted
 * SongGeneration Studio server (api/_providers/songgen.js).
 *
 * There is no on-device fallback here the way the video studio has one —
 * song generation with real vocals needs a real model, there's no honest
 * procedural substitute for singing. Without SONGGEN_URL configured, the
 * panel says so plainly rather than pretending to work.
 */

(function () {
  const SECTION_LABELS = {
    intro: 'Intro',
    verse: 'Verse',
    prechorus: 'Pre-Chorus',
    chorus: 'Chorus',
    bridge: 'Bridge',
    instrumental: 'Instrumental',
    outro: 'Outro'
  };
  const VOCAL_TYPES = new Set(['verse', 'chorus', 'bridge', 'prechorus']);

  const LIBRARY_STORAGE_KEY = 'aivideo-song-library-v1';
  const MAX_LIBRARY_ITEMS = 30;

  // Songs take noticeably longer than a video clip to render (the reference
  // server's own docs say 3-6 minutes), so the poll backoff and ceiling are
  // both longer than the video studio's.
  const POLL_START_MS = 2500;
  const POLL_MAX_MS = 6000;
  const POLL_GROWTH = 1.2;
  const MAX_WAIT_MS = 15 * 60 * 1000;

  let sections = [];
  let sectionSeq = 0;
  let generating = false;
  let currentTracks = null;
  let activeTrackIndex = 0;
  let library = [];

  function defaultSections() {
    return [
      { id: ++sectionSeq, type: 'intro', lyrics: '' },
      { id: ++sectionSeq, type: 'verse', lyrics: '' },
      { id: ++sectionSeq, type: 'chorus', lyrics: '' },
      { id: ++sectionSeq, type: 'verse', lyrics: '' },
      { id: ++sectionSeq, type: 'chorus', lyrics: '' },
      { id: ++sectionSeq, type: 'outro', lyrics: '' }
    ];
  }

  function initSongStudio() {
    if (!document.getElementById('song-studio')) return; // not on this page
    sections = defaultSections();
    loadLibrary();
    renderSections();
    renderLibrary();
    bindControls();
    refreshSongProviderStatus();
  }

  function bindControls() {
    document.querySelectorAll('.song-add-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        sections.push({ id: ++sectionSeq, type: btn.dataset.type, lyrics: '' });
        renderSections();
      });
    });

    const genBtn = document.getElementById('song-generate-btn');
    if (genBtn) genBtn.addEventListener('click', startSongGeneration);
  }

  // --- Provider status -------------------------------------------------------

  async function refreshSongProviderStatus() {
    const badge = document.getElementById('song-provider-badge');
    let caps = null;
    try {
      const res = await fetch('/api/song-providers', { headers: { Accept: 'application/json' } });
      caps = res.ok ? await res.json() : null;
    } catch (err) {
      caps = null;
    }

    populateGenreList((caps && caps.genres) || []);

    if (!badge) return;
    if (caps && caps.configured) {
      badge.textContent = caps.label || 'SongGeneration Studio';
      badge.classList.add('is-live');
      badge.classList.remove('is-besteffort', 'is-error');
      badge.title = `Self-hosted song generation is active: ${caps.label}.`;
    } else {
      badge.textContent = 'NOT CONFIGURED';
      badge.classList.remove('is-live', 'is-besteffort');
      badge.classList.add('is-error');
      badge.title =
        'No song generation server is configured. Set SONGGEN_URL to a running ' +
        'SongGeneration Studio instance (https://github.com/6Morpheus6/SongGeneration-Studio) ' +
        '— see docs/self-hosting.md. There is no free fallback for this: real vocals need a real model.';
    }
  }

  function populateGenreList(genres) {
    const list = document.getElementById('song-genre-list');
    if (!list) return;
    list.innerHTML = '';
    genres.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g;
      list.appendChild(opt);
    });
  }

  // --- Section editor ----------------------------------------------------------

  function renderSections() {
    const list = document.getElementById('song-sections-list');
    const count = document.getElementById('song-section-count');
    if (count) count.textContent = `${sections.length} section${sections.length === 1 ? '' : 's'}`;
    if (!list) return;

    list.innerHTML = '';

    if (!sections.length) {
      const empty = document.createElement('div');
      empty.className = 'song-sections-empty';
      empty.textContent = 'Add a section to start writing.';
      list.appendChild(empty);
      return;
    }

    sections.forEach((section, idx) => {
      list.appendChild(buildSectionCard(section, idx));
    });
  }

  function buildSectionCard(section, idx) {
    const isVocal = VOCAL_TYPES.has(section.type);
    const label = SECTION_LABELS[section.type] || section.type;

    const card = document.createElement('div');
    card.className = 'song-section-card';

    const head = document.createElement('div');
    head.className = 'song-section-card-head';

    const typeTag = document.createElement('span');
    typeTag.className = 'song-section-type';
    typeTag.textContent = label;
    head.appendChild(typeTag);

    const actions = document.createElement('div');
    actions.className = 'song-section-actions';

    const upBtn = makeActionButton('↑', 'Move up', idx === 0, () => {
      if (idx > 0) {
        [sections[idx - 1], sections[idx]] = [sections[idx], sections[idx - 1]];
        renderSections();
      }
    });
    const downBtn = makeActionButton('↓', 'Move down', idx === sections.length - 1, () => {
      if (idx < sections.length - 1) {
        [sections[idx + 1], sections[idx]] = [sections[idx], sections[idx + 1]];
        renderSections();
      }
    });
    const removeBtn = makeActionButton('✕', 'Remove', false, () => {
      sections.splice(idx, 1);
      renderSections();
    });

    actions.appendChild(upBtn);
    actions.appendChild(downBtn);
    actions.appendChild(removeBtn);
    head.appendChild(actions);
    card.appendChild(head);

    if (isVocal) {
      const textarea = document.createElement('textarea');
      textarea.className = 'song-section-lyrics';
      textarea.placeholder = `${label} lyrics — one line per line...`;
      textarea.value = section.lyrics || '';
      textarea.addEventListener('input', () => { section.lyrics = textarea.value; });
      card.appendChild(textarea);
    } else {
      const note = document.createElement('div');
      note.className = 'song-section-instrumental-note';
      note.textContent = 'Instrumental — no lyrics';
      card.appendChild(note);
    }

    return card;
  }

  function makeActionButton(symbol, title, disabled, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = symbol;
    btn.title = title;
    btn.disabled = disabled;
    btn.addEventListener('click', onClick);
    return btn;
  }

  // --- Generation pipeline -------------------------------------------------

  function collectSongRequest() {
    const titleInput = document.getElementById('song-title-input');
    const outputModeEl = document.querySelector('input[name="song-output-mode"]:checked');

    return {
      title: (titleInput && titleInput.value.trim()) || 'Untitled',
      sections: sections.map(s => ({
        type: s.type,
        lyrics: VOCAL_TYPES.has(s.type) ? (s.lyrics || '') : undefined
      })),
      gender: valueOf('song-gender-select', 'female'),
      timbre: valueOf('song-timbre-input', ''),
      genre: valueOf('song-genre-input', ''),
      emotion: valueOf('song-emotion-input', ''),
      instruments: valueOf('song-instruments-input', ''),
      customStyle: valueOf('song-custom-style-input', ''),
      bpm: parseInt(valueOf('song-bpm-input', '120'), 10) || 120,
      outputMode: outputModeEl ? outputModeEl.value : 'mixed'
    };
  }

  function valueOf(id, fallback) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : fallback;
  }

  async function startSongGeneration() {
    if (generating) return;

    if (!sections.length) {
      if (window.showToast) window.showToast('⚠ Add at least one section before generating.');
      return;
    }
    const hasVocalLyrics = sections.some(s => VOCAL_TYPES.has(s.type) && s.lyrics && s.lyrics.trim());
    const allInstrumental = sections.every(s => !VOCAL_TYPES.has(s.type));
    if (!hasVocalLyrics && !allInstrumental) {
      if (window.showToast) {
        window.showToast('⚠ Add lyrics to at least one verse/chorus/bridge, or make every section instrumental.');
      }
      return;
    }

    generating = true;
    setGenerateButtonEnabled(false);
    showProgress(0.02, 'Submitting to the song server...');

    const req = collectSongRequest();
    let created;
    try {
      const res = await fetch('/api/song-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req)
      });
      created = await res.json();
    } catch (err) {
      created = { success: false, error: `Could not reach the generation API: ${err.message}` };
    }

    if (!created || !created.success || !created.job) {
      finishWithError(
        (created && created.error) || 'The song server did not accept this request.',
        created && created.hint
      );
      return;
    }

    showProgress(0.05, 'Queued on your GPU...');
    await pollUntilDone(created.job, req);
  }

  async function pollUntilDone(jobId, req) {
    const startedAt = Date.now();
    let wait = POLL_START_MS;

    while (Date.now() - startedAt < MAX_WAIT_MS) {
      await sleep(wait);
      wait = Math.min(POLL_MAX_MS, Math.round(wait * POLL_GROWTH));

      let status;
      try {
        const res = await fetch(`/api/song-status?job=${encodeURIComponent(jobId)}`, {
          headers: { Accept: 'application/json' }
        });
        status = await res.json();
      } catch (err) {
        continue; // a dropped poll isn't a dead job — the next tick usually recovers
      }
      if (!status) continue;

      if (status.status === 'succeeded' && Array.isArray(status.tracks) && status.tracks.length) {
        finishWithSuccess(req.title, status.tracks, req.outputMode);
        return;
      }
      if (status.status === 'failed') {
        finishWithError(status.error || 'Song generation failed.');
        return;
      }

      const progress = Number.isFinite(status.progress) ? status.progress : 0.4;
      showProgress(Math.max(0.05, Math.min(0.97, progress)), status.detail || describeSongPhase(status.status));
    }

    finishWithError(`The song server did not finish within ${Math.round(MAX_WAIT_MS / 60000)} minutes.`);
  }

  function describeSongPhase(status) {
    return status === 'queued' ? 'Queued on your GPU...' : 'Composing vocals and instrumentation...';
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function setGenerateButtonEnabled(enabled) {
    const btn = document.getElementById('song-generate-btn');
    if (btn) btn.disabled = !enabled;
  }

  function showProgress(fraction, text) {
    const box = document.getElementById('song-progress-box');
    const fill = document.getElementById('song-progress-fill');
    const status = document.getElementById('song-status-text');
    if (box) box.style.display = 'block';
    if (fill) fill.style.width = `${Math.round(fraction * 100)}%`;
    if (status) status.textContent = text;
  }

  function hideProgress() {
    const box = document.getElementById('song-progress-box');
    if (box) box.style.display = 'none';
  }

  function finishWithError(message, hint) {
    generating = false;
    setGenerateButtonEnabled(true);
    hideProgress();
    if (window.showToast) window.showToast(`⚠ ${message}${hint ? ' — ' + hint : ''}`);
  }

  function finishWithSuccess(title, tracks, outputMode) {
    generating = false;
    setGenerateButtonEnabled(true);
    hideProgress();

    showNowPlaying(title, tracks);
    addToLibrary({ title, tracks, outputMode, createdAt: Date.now() });

    if (window.showToast) window.showToast(`✓ "${title}" is ready.`);
  }

  // --- Player ------------------------------------------------------------------

  function showNowPlaying(title, tracks) {
    const panel = document.getElementById('song-now-playing');
    const titleEl = document.getElementById('song-now-playing-title');
    const tabsEl = document.getElementById('song-track-tabs');
    if (!panel) return;

    panel.style.display = 'block';
    if (titleEl) titleEl.textContent = title || 'Untitled';

    currentTracks = tracks;
    activeTrackIndex = 0;

    if (tabsEl) {
      tabsEl.innerHTML = '';
      if (tracks.length > 1) {
        tracks.forEach((t, idx) => {
          const tab = document.createElement('button');
          tab.type = 'button';
          tab.className = 'song-track-tab' + (idx === 0 ? ' active' : '');
          tab.textContent = t.label;
          tab.addEventListener('click', () => selectTrack(idx));
          tabsEl.appendChild(tab);
        });
      }
    }

    playTrack(0);
  }

  function selectTrack(idx) {
    if (!currentTracks || !currentTracks[idx]) return;
    activeTrackIndex = idx;
    const tabsEl = document.getElementById('song-track-tabs');
    if (tabsEl) {
      Array.from(tabsEl.children).forEach((tab, i) => tab.classList.toggle('active', i === idx));
    }
    playTrack(idx);
  }

  function playTrack(idx) {
    const player = document.getElementById('song-audio-player');
    if (!player || !currentTracks || !currentTracks[idx]) return;
    player.src = currentTracks[idx].url;
    const playPromise = player.play();
    if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {});
  }

  // --- Library -------------------------------------------------------------------
  //
  // Persisted client-side only. The reference SongGeneration Studio server
  // keeps generations in memory with no database of its own, so a library
  // entry's track URLs go stale if that server restarts — the same
  // limitation the reference server itself has, not one this adds.

  function loadLibrary() {
    try {
      const raw = localStorage.getItem(LIBRARY_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      library = Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      library = [];
    }
  }

  function saveLibrary() {
    try {
      localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(library.slice(0, MAX_LIBRARY_ITEMS)));
    } catch (err) {
      // Storage full or unavailable (private browsing) — the session still
      // works, it just won't remember the library across a reload.
    }
  }

  function addToLibrary(entry) {
    library.unshift(entry);
    library = library.slice(0, MAX_LIBRARY_ITEMS);
    saveLibrary();
    renderLibrary();
  }

  function removeFromLibrary(idx) {
    library.splice(idx, 1);
    saveLibrary();
    renderLibrary();
  }

  function renderLibrary() {
    const list = document.getElementById('song-library-list');
    if (!list) return;

    list.innerHTML = '';

    if (!library.length) {
      const empty = document.createElement('div');
      empty.className = 'song-library-empty';
      empty.textContent = 'No songs yet — generate one to see it here.';
      list.appendChild(empty);
      return;
    }

    library.forEach((entry, idx) => {
      list.appendChild(buildLibraryItem(entry, idx));
    });
  }

  function buildLibraryItem(entry, idx) {
    const item = document.createElement('div');
    item.className = 'song-library-item';

    const info = document.createElement('div');
    info.style.minWidth = '0';

    const titleEl = document.createElement('div');
    titleEl.className = 'song-library-item-title';
    titleEl.textContent = entry.title || 'Untitled';

    const trackCount = Array.isArray(entry.tracks) ? entry.tracks.length : 0;
    const metaEl = document.createElement('div');
    metaEl.className = 'song-library-item-meta';
    metaEl.textContent = `${formatRelativeTime(entry.createdAt)} · ${trackCount} track${trackCount === 1 ? '' : 's'}`;

    info.appendChild(titleEl);
    info.appendChild(metaEl);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'song-library-item-remove';
    removeBtn.textContent = '✕';
    removeBtn.title = 'Remove from library';
    removeBtn.addEventListener('click', e => {
      e.stopPropagation();
      removeFromLibrary(idx);
    });

    item.appendChild(info);
    item.appendChild(removeBtn);
    item.addEventListener('click', () => showNowPlaying(entry.title, entry.tracks));

    return item;
  }

  function formatRelativeTime(ts) {
    if (!Number.isFinite(ts)) return '';
    const diffSec = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (diffSec < 60) return 'just now';
    const diffMin = Math.round(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.round(diffHr / 24)}d ago`;
  }

  window.addEventListener('DOMContentLoaded', initSongStudio);
})();
