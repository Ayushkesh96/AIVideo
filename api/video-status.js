/**
 * GET /api/video-status?job=<token>
 *
 * One poll tick against the provider that owns the job. Kept deliberately
 * cheap: the browser calls this every few seconds for the life of a
 * generation, and each call must finish well inside the function timeout.
 */

const { applyCors, pollJob } = require('./_video');

module.exports = async (req, res) => {
  applyCors(res);
  // Poll responses are point-in-time; a cached one would stall the studio on a
  // stale "queued".
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const token = req.query && req.query.job;
  if (!token) {
    return res.status(400).json({ success: false, error: 'job token is required' });
  }

  try {
    res.status(200).json(await pollJob(String(token)));
  } catch (err) {
    // A bad token is a client error — distinct from a job that failed.
    res.status(400).json({ success: false, status: 'failed', fallback: true, error: err.message });
  }
};
