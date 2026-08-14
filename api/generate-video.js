const https = require('https');

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt = 'Cinematic cyberpunk samurai in rain 8k', cameraMotion = 'Orbit 360°' } = req.body || {};
    const cleanPrompt = encodeURIComponent(prompt.trim());
    const pollaiUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}%20cinematic%208k%20hyperrealistic%20masterpiece%20photorealistic?width=1280&height=720&nologo=true&seed=${Math.floor(Math.random()*999999)}`;

    https.get(pollaiUrl, (proxyRes) => {
      if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
        https.get(proxyRes.headers.location, (redirectRes) => {
          const chunks = [];
          redirectRes.on('data', chunk => chunks.push(chunk));
          redirectRes.on('end', () => {
            const buffer = Buffer.concat(chunks);
            res.status(200).json({
              success: true,
              type: 'ai_diffusion_keyframe',
              dataUrl: `data:image/jpeg;base64,${buffer.toString('base64')}`,
              prompt,
              cameraMotion
            });
          });
        }).on('error', (err) => {
          res.status(200).json({ success: false, fallback: true, error: err.message });
        });
      } else {
        const chunks = [];
        proxyRes.on('data', chunk => chunks.push(chunk));
        proxyRes.on('end', () => {
          const buffer = Buffer.concat(chunks);
          res.status(200).json({
            success: true,
            type: 'ai_diffusion_keyframe',
            dataUrl: `data:image/jpeg;base64,${buffer.toString('base64')}`,
            prompt,
            cameraMotion
          });
        });
      }
    }).on('error', (err) => {
      res.status(200).json({ success: false, fallback: true, error: err.message });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
