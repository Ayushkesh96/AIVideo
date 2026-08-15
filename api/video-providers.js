/**
 * GET /api/video-providers
 *
 * Capability discovery. The studio calls this on load to learn which real
 * models are reachable, what resolutions to offer (4K is only shown if some
 * configured provider can actually produce it), and whether it should present
 * itself as running on a real model or on the local fallback engine.
 *
 * Returns only which keys are *present* — never their values.
 */

const { applyCors, capabilities } = require('./_video');

module.exports = async (req, res) => {
  applyCors(res);
  // Keys can change with a redeploy; a long cache would strand the UI on a
  // stale capability set.
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
