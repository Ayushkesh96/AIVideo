const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

let PORT = 5173;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Free Public Open-Source AI Video Model Endpoints
async function fetchFreeAIVideo(prompt, cameraMotion) {
  return new Promise((resolve) => {
    // Query HuggingFace free public inference space
    const cleanPrompt = encodeURIComponent(prompt.trim());
    const pollaiUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}%20cinematic%208k%20hyperrealistic%20masterpiece%20photorealistic?width=1280&height=720&nologo=true&seed=${Math.floor(Math.random()*999999)}`;

    https.get(pollaiUrl, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Handle redirect
        https.get(res.headers.location, (redirectRes) => {
          const chunks = [];
          redirectRes.on('data', chunk => chunks.push(chunk));
          redirectRes.on('end', () => {
            const buffer = Buffer.concat(chunks);
            resolve({
              success: true,
              type: 'ai_diffusion_keyframe',
              dataUrl: `data:image/jpeg;base64,${buffer.toString('base64')}`,
              prompt: prompt,
              cameraMotion: cameraMotion
            });
          });
        }).on('error', () => resolve(null));
      } else {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            success: true,
            type: 'ai_diffusion_keyframe',
            dataUrl: `data:image/jpeg;base64,${buffer.toString('base64')}`,
            prompt: prompt,
            cameraMotion: cameraMotion
          });
        });
      }
    }).on('error', (err) => {
      console.log("Free AI generator fallback active:", err.message);
      resolve(null);
    });
  });
}

const server = http.createServer(async (req, res) => {
  let reqUrl = req.url.split('?')[0];

  // API Endpoint: /api/generate-video (100% Free, Zero Purchase API)
  if (req.method === 'POST' && reqUrl === '/api/generate-video') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const params = JSON.parse(body || '{}');
        const prompt = params.prompt || 'Cinematic cyberpunk city in rain 8k';
        const cameraMotion = params.cameraMotion || 'Orbit 360°';

        const aiResult = await fetchFreeAIVideo(prompt, cameraMotion);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(aiResult || { success: false, fallback: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (reqUrl === '/') reqUrl = '/index.html';

  const filePath = path.join(__dirname, reqUrl);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

function startServer(port) {
  server.listen(port, () => {
    console.log(`Higgsfield AI server running at http://localhost:${port}`);
  });
}

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    PORT++;
    setTimeout(() => startServer(PORT), 100);
  } else {
    console.error(e);
  }
});

startServer(PORT);
