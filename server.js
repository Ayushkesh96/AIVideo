/**
 * Local dev server.
 *
 * Rather than reimplementing the API routes (which is how the local server and
 * the deployed functions drift apart), this adapts a raw Node response into the
 * small Express-ish surface @vercel/node provides — res.status().json() plus
 * req.query and a parsed req.body — and then runs the real handler modules from
 * api/. What you test here is the code that ships.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

loadDotEnv();

// Required after loadDotEnv so provider adapters see the keys at require time.
const ROUTES = {
  '/api/generate-video': require('./api/generate-video'),
  '/api/video-create': require('./api/video-create'),
  '/api/video-direct': require('./api/video-direct'),
  '/api/video-status': require('./api/video-status'),
  '/api/video-proxy': require('./api/video-proxy'),
  '/api/video-providers': require('./api/video-providers')
};

let PORT = parseInt(process.env.PORT, 10) || 5173;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

/**
 * Minimal .env reader so local runs pick up provider keys without adding a
 * dependency. Vercel injects these itself, so this never runs in production.
 */
function loadDotEnv() {
  const file = path.join(__dirname, '.env');
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (err) {
    return;
  }
  text.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) return;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // A real environment variable always wins over the file.
    if (process.env[key] === undefined) process.env[key] = value;
  });
}

/** Gives the raw response the subset of the Vercel helper API the routes use. */
function adaptResponse(res) {
  res.status = code => {
    res.statusCode = code;
    return res;
  };
  res.json = payload => {
    if (!res.headersSent) res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
    return res;
  };
  return res;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    req.on('data', chunk => {
      bytes += chunk.length;
      // Reference images arrive as data URLs, so this has to allow more than a
      // plain JSON form would.
      if (bytes > 20 * 1024 * 1024) {
        req.destroy();
        return reject(new Error('request body too large'));
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsed.pathname;

  const handler = ROUTES[pathname];
  if (handler) {
    adaptResponse(res);
    req.query = Object.fromEntries(parsed.searchParams.entries());

    if (req.method === 'POST' || req.method === 'PUT') {
      try {
        const raw = await readBody(req);
        try {
          req.body = raw ? JSON.parse(raw) : {};
        } catch (err) {
          req.body = raw;
        }
      } catch (err) {
        return res.status(413).json({ success: false, error: err.message });
      }
    }

    try {
      await handler(req, res);
    } catch (err) {
      console.error(`[${pathname}]`, err);
      if (!res.headersSent) res.status(500).json({ success: false, error: err.message });
      else res.destroy();
    }
    return;
  }

  if (pathname.startsWith('/api/')) {
    return adaptResponse(res).status(404).json({ success: false, error: 'Unknown API route' });
  }

  // Static files. Resolve first, then confirm the result stays inside the
  // project — otherwise "/../.env" would serve the provider keys.
  const requestedPath = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
  const filePath = path.normalize(path.join(__dirname, requestedPath));
  if (!filePath.startsWith(__dirname + path.sep) && filePath !== path.join(__dirname, 'index.html')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Single-page app: unknown paths fall through to the shell.
        return fs.readFile(path.join(__dirname, 'index.html'), (e2, shell) => {
          if (e2) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return res.end('404 Not Found');
          }
          res.writeHead(200, { 'Content-Type': MIME_TYPES['.html'] });
          res.end(shell);
        });
      }
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end(`Server Error: ${err.code}`);
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

function startServer(port) {
  server.listen(port, () => {
    const configured = require('./api/_providers').configured().map(p => p.label);
    console.log(`AIVideo studio running at http://localhost:${port}`);
    console.log(
      configured.length
        ? `Video providers active: ${configured.join(', ')}`
        : 'No video provider keys found — the studio will use the local keyframe engine. Set FAL_KEY, GEMINI_API_KEY, REPLICATE_API_TOKEN, RUNWAYML_API_SECRET or LUMAAI_API_KEY in .env for real text-to-video.'
    );
  });
}

server.on('error', e => {
  if (e.code === 'EADDRINUSE') {
    PORT++;
    setTimeout(() => startServer(PORT), 100);
  } else {
    console.error(e);
  }
});

startServer(PORT);
