/**
 * REAL TEXT-TO-VIDEO CLIENT
 *
 * Drives the two-phase backend: submit a generation, then poll until the
 * provider hands back a finished clip. This is the path that produces an
 * actual video of the prompt — a real model rendering real motion.
 *
 * The keyframe synthesizer in ai-synth.js is what runs when this cannot: it
 * interpolates stills under a virtual camera, which looks cinematic but is not
 * a video model. Keeping the two clearly separated matters, because only one
 * of them can honour a prompt like "the dog turns its head".
 */

(function () {
  const CREATE_ENDPOINT = '/api/video-create';
  const STATUS_ENDPOINT = '/api/video-status';
  const PROVIDERS_ENDPOINT = '/api/video-providers';

  // Video models run from ~20s (LTX, Wan fast) to several minutes (Veo 4K,
  // Sora). The ceiling is generous; the backoff keeps the request count sane.
  const POLL_START_MS = 2000;
  const POLL_MAX_MS = 6000;
  const POLL_GROWTH = 1.25;
  const MAX_WAIT_MS = 10 * 60 * 1000;

  let capabilitiesPromise = null;

  function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
      const id = setTimeout(resolve, ms);
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(id);
          reject(new DOMException('aborted', 'AbortError'));
        }, { once: true });
      }
    });
  }

  /**
   * Which providers this deployment can actually reach. Cached: it only
   * changes on redeploy, and the studio asks for it on every panel open.
   */
  function capabilities(force) {
    if (!capabilitiesPromise || force) {
      capabilitiesPromise = fetch(PROVIDERS_ENDPOINT, { headers: { Accept: 'application/json' } })
        .then(res => (res.ok ? res.json() : null))
        .then(data => data || offlineCapabilities())
        .catch(() => offlineCapabilities());
    }
    return capabilitiesPromise;
  }

  function offlineCapabilities() {
    return { success: false, providers: [], configured: [], active: null, maxResolution: 0, fallbackOnly: true };
  }

  /**
   * Runs a full generation.
   *
   * Resolves with { ok: true, videoUrl, ... } on success, or
   * { ok: false, fallback: true, error } when the studio should render the
   * clip locally instead. It rejects only on abort — a provider being
   * unavailable is an expected outcome, not an exception.
   */
  async function generate(opts) {
    const options = opts || {};
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
    const signal = options.signal;

    onProgress({ phase: 'submitting', progress: 0.01, detail: 'Submitting to video model' });

    let created;
    try {
      const res = await fetch(CREATE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: options.prompt,
          aspectRatio: options.aspectRatio || '16:9',
          quality: options.quality || '1080p',
          durationSec: options.durationSec || 5,
          negativePrompt: options.negativePrompt || '',
          provider: options.provider || '',
          modelKey: options.modelKey || '',
          seed: options.seed,
          audio: options.audio !== false
        }),
        signal
      });
      created = await res.json();
    } catch (err) {
      if (err && err.name === 'AbortError') throw err;
      return { ok: false, fallback: true, error: `Could not reach the generation API: ${err.message}` };
    }

    if (!created || !created.success || !created.job) {
      return {
        ok: false,
        fallback: true,
        reason: created && created.reason,
        error: (created && created.error) || 'The generation service did not accept the request.',
        hint: created && created.hint
      };
    }

    const label = created.modelLabel || created.providerLabel || 'video model';
    onProgress({ phase: 'queued', progress: 0.05, detail: `Queued on ${label}`, provider: created.provider });

    const startedAt = Date.now();
    let wait = POLL_START_MS;

    while (Date.now() - startedAt < MAX_WAIT_MS) {
      await sleep(wait, signal);
      wait = Math.min(POLL_MAX_MS, Math.round(wait * POLL_GROWTH));

      let status;
      try {
        const res = await fetch(`${STATUS_ENDPOINT}?job=${encodeURIComponent(created.job)}`, {
          headers: { Accept: 'application/json' },
          signal
        });
        status = await res.json();
      } catch (err) {
        if (err && err.name === 'AbortError') throw err;
        // A dropped poll is not a dead job; the next tick usually recovers.
        continue;
      }

      if (!status) continue;

      if (status.status === 'succeeded' && status.videoUrl) {
        onProgress({ phase: 'succeeded', progress: 1, detail: `Rendered by ${status.modelLabel || label}` });
        return {
          ok: true,
          videoUrl: status.videoUrl,
          proxied: Boolean(status.proxied),
          provider: status.provider || created.provider,
          modelLabel: status.modelLabel || label,
          request: created.request
        };
      }

      if (status.status === 'failed') {
        return {
          ok: false,
          fallback: true,
          provider: status.provider || created.provider,
          error: status.error || 'The video model failed to render this prompt.'
        };
      }

      // Providers rarely report true percentages, so the bar is driven by the
      // coarse phase they do report rather than pretending to precision.
      const progress = Number.isFinite(status.progress) ? status.progress : 0.4;
      onProgress({
        phase: status.status || 'running',
        progress: Math.max(0.05, Math.min(0.97, progress)),
        detail: status.detail || `Rendering on ${label}`,
        provider: status.provider || created.provider,
        elapsedMs: Date.now() - startedAt
      });
    }

    return {
      ok: false,
      fallback: true,
      error: `The video model did not finish within ${Math.round(MAX_WAIT_MS / 60000)} minutes.`
    };
  }

  /**
   * Fetches a finished clip as a Blob so it can be downloaded and replayed
   * without a second network round trip. Falls back to the bare URL if the
   * provider CDN refuses a cross-origin read.
   */
  async function toBlob(videoUrl) {
    try {
      const res = await fetch(videoUrl);
      if (!res.ok) return null;
      return await res.blob();
    } catch (err) {
      return null;
    }
  }

  window.AIVideoEngine = { capabilities, generate, toBlob };
})();
