import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

async function readFileSafe(filePath) {
  try {
    return await fs.readFile(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function serveFile(res, filePath) {
  const data = await readFileSafe(filePath);
  if (!data) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(data);
}

function resolveRequest(urlPath) {
  if (urlPath === '/' || urlPath === '') {
    return path.join(distDir, 'index.html');
  }
  return path.join(distDir, urlPath);
}

const PORT = Number(process.env.PORT) || 4173;

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }
  const filePath = resolveRequest(req.url);
  try {
    await serveFile(res, filePath);
  } catch (error) {
    console.error('Failed to serve request', error);
    res.writeHead(500);
    res.end('Server error');
  }
});

server.listen(PORT, () => {
  console.log(`Preview server running at http://localhost:${PORT}`);
});
