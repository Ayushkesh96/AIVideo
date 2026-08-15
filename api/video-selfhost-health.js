/**
 * GET /api/video-selfhost-health
 *
 * Live readiness check for the self-hosted (ComfyUI) provider — separate from
 * /api/video-providers because it does real network I/O against the user's
 * own GPU box (a /system_stats call, plus one /object_info call per node type
 * in the active workflow) and can take a few seconds, where the rest of
 * capability discovery is instant and answers from env vars alone.
 *
 * Returns { configured: false } when COMFYUI_URL isn't set — that's a normal
 * state, not an error. Never 500s on the box being unreachable or missing a
 * model; that's exactly what this endpoint exists to report.
 */

const { applyCors } = require('./_video');
const providers = require('./_providers');

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

  const provider = providers.byId('selfhosted');
  if (!provider || typeof provider.checkHealth !== 'function') {
    return res.status(200).json({ success: true, configured: false });
  }

  try {
    const health = await provider.checkHealth();
    res.status(200).json(Object.assign({ success: true }, health));
  } catch (err) {
    // checkHealth() is designed to never throw; this is a last resort so a
    // bug in it still reaches the client as a readable message.
    res.status(200).json({ success: true, configured: true, reachable: false, error: err.message });
  }
};
