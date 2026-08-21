/**
 * Claude (Anthropic) text adapter for the AI Director and Prompt Enhancer.
 *
 * Lives outside the route files for the same reason _video.js does: the
 * Vercel functions and the local dev server in server.js must run the exact
 * same code.
 *
 * Unlike the video providers, this is a single fixed model — there is no
 * registry to pick from, so it stays its own small module rather than living
 * under _providers/ (that directory's `pick()`/`configured()` machinery is
 * built around swapping between several interchangeable adapters).
 */

const { requestJson, HttpError } = require('./_http');

const BASE = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-sonnet-5';

const BREAKDOWN_SYSTEM_PROMPT = `You are a Hollywood film director and cinematographer AI.
Convert the user's film vision into a structured JSON production breakdown containing scenes, shots, lenses, motion rigs, and reusable @elements.
Strictly return valid JSON only matching this schema, with no markdown code fences and no prose before or after it:
{
  "scenes": [
    {
      "title": "string",
      "shots": [
        {
          "title": "string",
          "prompt": "detailed prompt with @Element tags",
          "lens": "16mm | 24mm | 35mm | 50mm | 85mm | 135mm",
          "cameraMovement": "Orbit 360° | Dolly | Truck | Crane | Handheld | FPV Drone",
          "aspectRatio": "16:9",
          "elementRefs": ["tag1", "tag2"]
        }
      ]
    }
  ],
  "elements": [
    { "name": "string", "aka": "string", "type": "character | location | prop | style", "description": "string", "tags": "string" }
  ]
}`;

function apiKey() {
  return process.env.ANTHROPIC_API_KEY || '';
}

function model() {
  return (process.env.ANTHROPIC_MODEL || DEFAULT_MODEL).trim();
}

function isConfigured() {
  return Boolean(apiKey());
}

function capabilities() {
  return { configured: isConfigured(), model: isConfigured() ? model() : null };
}

/** One-shot call to the Messages API. Returns the assistant's text reply. */
async function callClaude({ system, user, maxTokens }) {
  if (!isConfigured()) {
    throw new Error('ANTHROPIC_API_KEY is not configured on this deployment.');
  }

  const payload = {
    model: model(),
    max_tokens: maxTokens || 4096,
    system,
    messages: [{ role: 'user', content: user }]
  };

  let data;
  try {
    data = await requestJson(BASE, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey(),
        'anthropic-version': ANTHROPIC_VERSION,
        'Content-Type': 'application/json'
      },
      body: payload,
      timeoutMs: 60000
    });
  } catch (err) {
    if (err instanceof HttpError) {
      throw new Error(`Claude request failed: ${err.message}`);
    }
    throw err;
  }

  const block = Array.isArray(data && data.content) ? data.content.find(b => b.type === 'text') : null;
  if (!block || typeof block.text !== 'string') {
    throw new Error('Claude returned no text content.');
  }
  return block.text;
}

/** AI Director: turns a one-line film vision into a full scene/shot breakdown. */
async function generateFilmBreakdown(visionPrompt) {
  const text = await callClaude({
    system: BREAKDOWN_SYSTEM_PROMPT,
    user: visionPrompt,
    maxTokens: 4096
  });

  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error('Claude returned malformed JSON for the breakdown.');
  }
  if (!parsed || !Array.isArray(parsed.scenes)) {
    throw new Error('Claude response was missing the expected scenes.');
  }
  return parsed;
}

/** Prompt Enhancer: rewrites one shot prompt into a richer cinematic prompt. */
async function enhanceShotPrompt({ prompt, lens, rig, cameraBody }) {
  const system = `You are a Hollywood cinematographer and director. Rewrite the user prompt into a rich, detailed visual cinematic prompt specifying shot on ${cameraBody || 'ARRI Alexa Mini'} with a ${lens || '24mm'} lens and ${rig || 'Dolly'} motion choreography. Reply with the rewritten prompt only — no preamble, no quotes.`;
  const text = await callClaude({ system, user: prompt, maxTokens: 400 });
  return text.trim();
}

module.exports = {
  isConfigured,
  capabilities,
  generateFilmBreakdown,
  enhanceShotPrompt
};
