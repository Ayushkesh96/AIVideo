/**
 * POST /api/song-create
 *
 * Submits a song generation and returns a job id to poll with. Returns 200
 * even when no song server is configured: that's a state the studio has to
 * explain to the user, not a client error.
 */

const { applyCors, createJob } = require('./_song');

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
