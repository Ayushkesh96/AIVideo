/**
 * GET /api/ai-providers
 *
 * Capability discovery for the AI Director and Prompt Enhancer, mirroring
 * /api/video-providers. The studio calls this to decide whether to show
 * "LIVE LLM" or "SIMULATED" without triggering an actual generation.
 */

const { applyCors } = require('./_video');
const ai = require('./_ai');

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

  res.status(200).json(Object.assign({ success: true }, ai.capabilities()));
};
