/**
 * GET /api/song-providers
 *
 * Capability discovery for the song studio: is a server configured, and what
 * vocabulary (genres) should the UI offer. Mirrors video-providers.js.
 */

const { applyCors, capabilities } = require('./_song');

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

  try {
    res.status(200).json(Object.assign({ success: true }, capabilities()));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
