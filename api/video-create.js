/**
 * POST /api/video-create
 *
 * Submits a text-to-video generation and returns a job token to poll with.
 * Returns 200 even when no provider is configured: "fall back to the local
 * engine" is a valid outcome for the studio, not a client error.
 */

const { applyCors, createJob } = require('./_video');

module.exports = async (req, res) => {
  applyCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // @vercel/node parses JSON bodies, but a string slips through when the
    // content-type is missing.
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body || '{}'); } catch (err) { body = {}; }
    }

    res.status(200).json(await createJob(body));
  } catch (err) {
    // Only validation errors reach here; createJob swallows provider failures.
    res.status(400).json({ success: false, fallback: true, error: err.message });
  }
};
