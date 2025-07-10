#!/usr/bin/env node
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const PORT = process.env.PORT || 3000;
const DEMO_DIR = join(__dirname, 'dist', 'demo');

const server = createServer(async (req, res) => {
  try {
    // Parse URL and ignore query parameters
    const url = new URL(req.url, `http://localhost:${PORT}`);
    let pathname = url.pathname;

    // Handle root and /demo/ routes
    if (pathname === '/') {
      pathname = '/demo/index-landing.html';
    } else if (pathname === '/demo' || pathname === '/demo/') {
      pathname = '/demo/index.html';
    }

    let filePath = join(DEMO_DIR, pathname);

    // Handle routes without extensions
    if (!extname(filePath) && !pathname.endsWith('/')) {
      filePath += '.html';
    }

    const content = await readFile(filePath);
    const ext = extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.writeHead(404);
      res.end('Not found');
    } else {
      res.writeHead(500);
      res.end('Internal server error');
    }
  }
});

server.listen(PORT, () => {
  console.log(`Demo server running at http://localhost:${PORT}`);
  console.log(`- Landing page: http://localhost:${PORT}/`);
  console.log(`- Chat demo: http://localhost:${PORT}/demo/index.html`);
  console.log(`- iframe demo: http://localhost:${PORT}/demo/iframe.html`);
});
