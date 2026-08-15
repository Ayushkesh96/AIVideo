/**
 * GET /api/song-status?job=<id>
 *
 * One poll tick against the configured song server. Kept cheap: the browser
 * calls this every few seconds for the life of a generation.
 */

const { applyCors, pollJob } = require('./_song');

module.exports = async (req, res) => {
  applyCors(res);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const jobId = req.query && req.query.job;
  if (!jobId) {
    return res.status(400).json({ success: false, error: 'job id is required' });
  }

  try {
    res.status(200).json(await pollJob(String(jobId)));
  } catch (err) {
    res.status(400).json({ success: false, status: 'failed', fallback: true, error: err.message });
  }
};
