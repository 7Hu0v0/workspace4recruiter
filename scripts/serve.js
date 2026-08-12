#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const root = path.resolve(__dirname, '..');
const startPort = Number(process.env.PORT || process.argv[2] || 8080);
const maxPort = startPort + 20;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

function send(res, status, body, type) {
  res.writeHead(status, {
    'Content-Type': type || 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function resolveFile(reqUrl) {
  const parsed = new URL(reqUrl, 'http://localhost');
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname === '/') pathname = '/demo.html';
  const file = path.normalize(path.join(root, pathname));
  if (!file.startsWith(root)) return null;
  return file;
}

function createServer() {
  return http.createServer((req, res) => {
    const file = resolveFile(req.url || '/');
    if (!file) return send(res, 403, 'Forbidden');
    fs.stat(file, (statErr, stat) => {
      const target = !statErr && stat.isDirectory() ? path.join(file, 'index.html') : file;
      fs.readFile(target, (readErr, body) => {
        if (readErr) return send(res, 404, 'Not found');
        send(res, 200, body, types[path.extname(target).toLowerCase()] || 'application/octet-stream');
      });
    });
  });
}

function listen(port) {
  const server = createServer();
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && port < maxPort) return listen(port + 1);
    console.error(err && err.message ? err.message : err);
    process.exit(1);
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`Recruiter Workbench is running:`);
    console.log(`  Demo:      http://localhost:${port}/demo.html`);
    console.log(`  Workbench: http://localhost:${port}/index.html`);
    if (port !== startPort) {
      console.log(`Port ${startPort} was busy, so ${port} is being used.`);
    }
  });
}

listen(startPort);
