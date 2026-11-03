import http from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import path from 'node:path';
import { build, root } from './build.mjs';

const output = path.join(root, 'dist');
const port = Number(process.env.PORT || 8000);
const watchMode = process.argv.includes('--watch');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.avif': 'image/avif', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8' };

if (watchMode) await build();
else if (!(await stat(path.join(output, 'index.html')).catch(() => null))) {
  console.error('Build the site first with npm run build, or use npm run dev.');
  process.exit(1);
}

const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let filename = path.resolve(output, `.${pathname}`);
    if (filename !== output && !filename.startsWith(output + path.sep)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    let info = await stat(filename).catch(() => null);
    if (info?.isDirectory()) {
      if (!pathname.endsWith('/')) {
        response.writeHead(301, { Location: `${pathname}/${new URL(request.url, 'http://localhost').search}` }).end();
        return;
      }
      filename = path.join(filename, 'index.html');
      info = await stat(filename).catch(() => null);
    }
    const exists = info?.isFile();
    if (!exists) filename = path.join(output, '404.html');
    response.writeHead(exists ? 200 : 404, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    if (request.method === 'HEAD') response.end();
    else response.end(await readFile(filename));
  } catch {
    if (!response.headersSent) response.writeHead(400);
    response.end('Unable to serve this request.');
  }
});

server.on('error', (error) => {
  console.error(`Preview server: ${error.message}`);
  process.exit(1);
});
server.listen(port, '127.0.0.1', () => console.log(`Beyond Lenses → http://localhost:${port}${watchMode ? '\nWatching src/, content/, and public/. Refresh your browser after changes.' : ''}`));

if (watchMode) {
  const watchers = new Map();
  let timer;
  let building = false;
  let queued = false;
  const rebuild = async () => {
    if (building) { queued = true; return; }
    building = true;
    try {
      await build();
      console.log('Rebuilt. Refresh to see your changes.');
      await discover();
    } catch (error) {
      console.error(`Build failed: ${error.message}`);
    } finally {
      building = false;
      if (queued) { queued = false; schedule(); }
    }
  };
  const schedule = () => { clearTimeout(timer); timer = setTimeout(rebuild, 150); };
  const discover = async () => {
    const visit = async (directory) => {
      if (!watchers.has(directory)) watchers.set(directory, watch(directory, schedule));
      for (const item of await readdir(directory, { withFileTypes: true })) if (item.isDirectory()) await visit(path.join(directory, item.name));
    };
    for (const folder of ['src', 'content', 'public']) await visit(path.join(root, folder));
  };
  await discover();
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
    clearTimeout(timer);
    for (const watcher of watchers.values()) watcher.close();
    server.close(() => process.exit(0));
  });
}
