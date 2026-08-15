/**
 * Shared song-generation job logic — the audio-pipeline counterpart to
 * _video.js. Lives outside the route files so the Vercel functions and the
 * local dev server in server.js run the exact same code.
 *
 * Simpler than _video.js on purpose: there is exactly one song provider
 * (songgen.js — a self-hosted SongGeneration Studio server), not a registry
 * to pick from, so there's no job-token codec to carry a provider id. The
 * generation id the server returns is validated and used directly.
 */

const songgen = require('./_providers/songgen');

const MAX_TITLE_CHARS = 120;
const MAX_LYRICS_CHARS = 4000;
const MAX_SECTIONS = 24;
const MAX_STYLE_FIELD_CHARS = 200;

// Section types the reference server's lyrics builder understands (a suffix
// like "intro-short" is allowed; only the base type before the "-" matters).
const VALID_BASE_TYPES = new Set([
  'intro', 'verse', 'prechorus', 'chorus', 'bridge', 'outro', 'instrumental'
]);
const VOCAL_BASE_TYPES = new Set(['verse', 'chorus', 'bridge', 'prechorus']);

const SAFE_JOB_ID = /^[A-Za-z0-9_-]{1,64}$/;

function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
}

/**
 * Turns a raw request body into a validated provider input. Throws on
 * anything the server would reject anyway, so the failure arrives with a
 * message the studio can show rather than a provider's own 400.
 */
function normalizeInput(body) {
  const raw = body && typeof body === 'object' ? body : {};

  const title = String(raw.title || 'Untitled').trim().slice(0, MAX_TITLE_CHARS) || 'Untitled';

  const rawSections = Array.isArray(raw.sections) ? raw.sections : [];
  if (!rawSections.length) throw new Error('At least one song section is required.');
  if (rawSections.length > MAX_SECTIONS) throw new Error(`Too many sections (max ${MAX_SECTIONS}).`);

  const sections = rawSections.map((s, i) => {
    const type = String((s && s.type) || '').trim().toLowerCase();
    const baseType = type.split('-')[0];
    if (!type || !VALID_BASE_TYPES.has(baseType)) {
      throw new Error(`Section ${i + 1} has an unrecognized type "${type || '(empty)'}".`);
    }
    const wantsLyrics = VOCAL_BASE_TYPES.has(baseType);
    const lyrics = wantsLyrics && s && typeof s.lyrics === 'string'
      ? s.lyrics.slice(0, MAX_LYRICS_CHARS)
      : undefined;
    return { type, lyrics };
  });

  const hasVocalLine = sections.some(s => VOCAL_BASE_TYPES.has(s.type.split('-')[0]) && s.lyrics && s.lyrics.trim());
  const instrumentalOnly = sections.every(s => !VOCAL_BASE_TYPES.has(s.type.split('-')[0]));
  if (!hasVocalLine && !instrumentalOnly) {
    throw new Error('Every vocal section (verse/chorus/bridge) needs lyrics, or remove it if you want an instrumental passage.');
  }

  const gender = ['female', 'male', 'auto'].includes(raw.gender) ? raw.gender : 'female';
  const outputMode = ['mixed', 'separate'].includes(raw.outputMode) ? raw.outputMode : 'mixed';

  let bpm = parseInt(raw.bpm, 10);
  if (!Number.isFinite(bpm)) bpm = 120;
  bpm = Math.max(40, Math.min(220, bpm));

  const field = (v, max) => (v ? String(v).trim().slice(0, max) : '');

  return {
    title,
    sections,
    gender,
    timbre: field(raw.timbre, MAX_STYLE_FIELD_CHARS),
    genre: field(raw.genre, MAX_STYLE_FIELD_CHARS),
    emotion: field(raw.emotion, MAX_STYLE_FIELD_CHARS),
    instruments: field(raw.instruments, MAX_STYLE_FIELD_CHARS),
    customStyle: field(raw.customStyle, 400),
    bpm,
    outputMode
  };
}

/**
 * Submits a generation. Resolves with either a job id or an explicit
 * `fallback` instruction — no song server configured is a normal, expected
 * state, not an error; the studio explains it rather than failing silently.
 */
async function createJob(body) {
  const input = normalizeInput(body);

  if (!songgen.isConfigured()) {
    return {
      success: false,
      fallback: true,
      reason: 'no_provider_configured',
      error: 'No song generation server is configured on this deployment.',
      hint: 'Set SONGGEN_URL to a running SongGeneration Studio instance. See docs/self-hosting.md.'
    };
  }

  try {
    const { jobId, meta } = await songgen.submit(input);
    return {
      success: true,
      job: jobId,
      title: (meta && meta.title) || input.title,
      outputMode: (meta && meta.outputMode) || input.outputMode
    };
  } catch (err) {
    return {
      success: false,
      fallback: true,
      reason: 'provider_error',
      error: err.message || 'Song generation submission failed.'
    };
  }
}

function assertSafeJobId(jobId) {
  if (typeof jobId !== 'string' || !SAFE_JOB_ID.test(jobId)) {
    throw new Error('invalid job id');
  }
}

/** One poll tick. Never throws for an in-flight job; only for a bad id. */
async function pollJob(jobId) {
  assertSafeJobId(jobId);

  try {
    const result = await songgen.poll(jobId);

    if (result.status === 'succeeded' && Array.isArray(result.tracks)) {
      return {
        success: true,
        status: 'succeeded',
        progress: 1,
        tracks: result.tracks.map(t => ({
          index: t.index,
          label: t.label,
          // Same reasoning as the video proxy: the credential lives here,
          // server-side, never in a URL the browser holds directly.
          url: `/api/song-proxy?job=${encodeURIComponent(jobId)}&track=${t.index}`
        }))
      };
    }

    if (result.status === 'failed') {
      return { success: false, status: 'failed', fallback: true, error: result.error || 'Generation failed.' };
    }

    return {
      success: true,
      status: result.status || 'running',
      progress: Number.isFinite(result.progress) ? result.progress : 0.4,
      detail: result.detail || null
    };
  } catch (err) {
    return { success: false, status: 'failed', fallback: true, error: err.message || 'Polling failed.' };
  }
}

/** Resolves the credentialed download for one track. Used only by the proxy route. */
async function resolveDownload(jobId, trackIdxRaw) {
  assertSafeJobId(jobId);

  const trackIdx = parseInt(trackIdxRaw, 10);
  if (!Number.isFinite(trackIdx) || trackIdx < 0 || trackIdx > 8) {
    throw new Error('invalid track index');
  }

  const download = songgen.trackDownload(jobId, trackIdx);
  if (!songgen.ownsUrl(download.url)) {
    throw new Error('refusing to proxy a url the configured song server does not claim');
  }
  return download;
}

module.exports = {
  applyCors,
  normalizeInput,
  createJob,
  pollJob,
  resolveDownload,
  capabilities: () => songgen.capabilities()
};
