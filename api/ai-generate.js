/**
 * POST /api/ai-generate
 *
 * Runs the AI Director (full scene/shot breakdown) or the Prompt Enhancer
 * (single-shot rewrite) against Claude. Returns 200 with fallback: true when
 * no key is configured, or when Claude itself fails — the studio has a local
 * simulated generator for both, so neither is a client error.
 */

const { applyCors } = require('./_video');
const ai = require('./_ai');

const MODES = new Set(['breakdown', 'enhance']);
const MAX_PROMPT_CHARS = 2000;

module.exports = async (req, res) => {
  applyCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch (err) { body = {}; }
  }

  const mode = MODES.has(body.mode) ? body.mode : null;
  const prompt = String(body.prompt || '').trim().slice(0, MAX_PROMPT_CHARS);

  if (!mode || !prompt) {
    return res.status(400).json({ success: false, error: 'A mode ("breakdown" or "enhance") and a prompt are required.' });
  }

  if (!ai.isConfigured()) {
    return res.status(200).json({
      success: false,
      fallback: true,
      reason: 'no_provider_configured',
      error: 'ANTHROPIC_API_KEY is not configured on this deployment.',
      hint: 'Set ANTHROPIC_API_KEY in the environment to enable live Claude generation.'
    });
  }

  try {
    if (mode === 'breakdown') {
      const breakdown = await ai.generateFilmBreakdown(prompt);
      return res.status(200).json({ success: true, breakdown, model: ai.capabilities().model });
    }

    const text = await ai.enhanceShotPrompt({
      prompt,
      lens: body.lens ? String(body.lens).slice(0, 40) : '',
      rig: body.rig ? String(body.rig).slice(0, 40) : '',
      cameraBody: body.cameraBody ? String(body.cameraBody).slice(0, 60) : ''
    });
    return res.status(200).json({ success: true, text, model: ai.capabilities().model });
  } catch (err) {
    // A down or misconfigured key must not kill the flow — the studio still
    // has the rule-based fallback generator for both modes.
    res.status(200).json({ success: false, fallback: true, reason: 'provider_error', error: err.message });
  }
};
