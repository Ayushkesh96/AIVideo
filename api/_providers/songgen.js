/**
 * Song generation adapter — talks to a self-hosted SongGeneration Studio
 * server (https://github.com/6Morpheus6/SongGeneration-Studio), which wraps
 * Tencent AI Lab's LeVo model behind a FastAPI backend.
 *
 * Unlike the video providers there is only one of these — no registry, no
 * "first configured wins" — so this module is used directly by _song.js
 * rather than through a provider-selection layer. If a second song backend
 * is ever added, this is the seam to generalize from.
 *
 * Protocol (read from the reference server's own source, not guessed):
 *   POST {host}/api/generate          SongRequest -> { generation_id }
 *   GET  {host}/api/generation/{id}   -> { status, progress, output_files, ... }
 *   GET  {host}/api/audio/{id}/{idx}  -> the media bytes for one track
 *
 * Same reasoning as the video self-hosted providers: your own GPU, no
 * per-song fee, no upstream content policy. Needs a GPU with real VRAM
 * (10GB minimum, 24GB+ recommended per the reference server's own docs) —
 * LeVo is a much larger model than the video engines this app also drives.
 */

const { requestJson, HttpError } = require('../_http');

// Canonical genre tags the reference server maps free-text genre input to
// (GENRE_TO_AUTO_PROMPT in its generation.py) — offered as suggestions in the
// UI, not enforced; the server accepts free text and does its own mapping.
const GENRES = [
  'Pop', 'R&B', 'Dance', 'Jazz', 'Folk', 'Rock', 'Metal', 'Reggae',
  'Chinese Style', 'Chinese Tradition', 'Chinese Opera'
];

function baseUrl() {
  const raw = (process.env.SONGGEN_URL || '').trim();
  if (!raw) return '';
  return raw.replace(/\/+$/, '');
}

function authHeaders() {
  const token = (process.env.SONGGEN_TOKEN || '').trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Track labels the reference server's own UI uses for each output mode. */
function trackLabels(outputMode, fileCount) {
  if (outputMode === 'separate' && fileCount >= 3) return ['Full Mix', 'Vocals', 'Instrumental'];
  if (outputMode === 'vocal') return ['Vocals'];
  if (outputMode === 'instrumental') return ['Instrumental'];
  return ['Full Song'];
}

module.exports = {
  id: 'songgen',
  label: 'SongGeneration Studio (self-hosted)',
  envKeys: ['SONGGEN_URL'],
  genres: GENRES,

  // Exposed for testing — pure, no network.
  trackLabels,

  isConfigured() {
    return Boolean(baseUrl());
  },

  capabilities() {
    return {
      id: 'songgen',
      label: 'SongGeneration Studio (self-hosted)',
      configured: this.isConfigured(),
      genres: GENRES,
      maxSections: 24
    };
  },

  async submit(input) {
    const host = baseUrl();
    if (!host) throw new Error('SONGGEN_URL is not set');

    const body = {
      title: input.title,
      sections: input.sections.map(s => ({ type: s.type, lyrics: s.lyrics })),
      gender: input.gender,
      timbre: input.timbre,
      genre: input.genre,
      emotion: input.emotion,
      instruments: input.instruments,
      custom_style: input.customStyle,
      bpm: input.bpm,
      output_mode: input.outputMode
    };

    let res;
    try {
      res = await requestJson(`${host}/api/generate`, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
        body,
        timeoutMs: 30000
      });
    } catch (err) {
      if (err instanceof HttpError && err.statusCode === 409) {
        throw new Error('A song is already generating on this server — the reference server only runs one job at a time. Wait for it to finish.');
      }
      if (err instanceof HttpError && err.statusCode === 400) {
        throw new Error(err.message || 'The song server rejected this request.');
      }
      if (err instanceof HttpError && err.statusCode === 401) {
        throw new Error('The song server rejected the request — check SONGGEN_TOKEN matches the server\'s.');
      }
      throw new Error(`Could not reach the song generation server at ${host}: ${err.message}`);
    }

    if (!res || !res.generation_id) throw new Error('The song server did not return a generation_id');
    return { jobId: res.generation_id, meta: { title: input.title, outputMode: input.outputMode } };
  },

  async poll(jobId) {
    const host = baseUrl();
    let res;
    try {
      res = await requestJson(`${host}/api/generation/${encodeURIComponent(jobId)}`, {
        headers: authHeaders(),
        timeoutMs: 15000
      });
    } catch (err) {
      if (err instanceof HttpError && err.statusCode === 404) {
        return { status: 'failed', error: 'The song server restarted and lost this job — try again.' };
      }
      return { status: 'failed', error: `Song server unavailable: ${err.message}` };
    }

    if (!res) return { status: 'running', progress: 0.3, detail: 'Queued...' };

    if (res.status === 'failed') {
      return { status: 'failed', error: res.message || 'Song generation failed.' };
    }

    if (res.status === 'completed') {
      const files = Array.isArray(res.output_files) ? res.output_files : [];
      if (!files.length) return { status: 'failed', error: 'The song server finished without producing an audio file.' };
      const labels = trackLabels(res.output_mode, files.length);
      return {
        status: 'succeeded',
        tracks: files.map((_, idx) => ({ index: idx, label: labels[idx] || `Track ${idx + 1}` }))
      };
    }

    return {
      status: res.status === 'pending' ? 'queued' : 'running',
      progress: Number.isFinite(res.progress) ? res.progress / 100 : 0.4,
      detail: res.message || undefined
    };
  },

  /** Resolves the credentialed download for one finished track. */
  trackDownload(jobId, trackIdx) {
    const host = baseUrl();
    return {
      url: `${host}/api/audio/${encodeURIComponent(jobId)}/${trackIdx}`,
      headers: authHeaders()
    };
  },

  ownsUrl(url) {
    const host = baseUrl();
    if (!host) return false;
    try {
      return new URL(url).origin === new URL(host).origin;
    } catch (err) {
      return false;
    }
  }
};
