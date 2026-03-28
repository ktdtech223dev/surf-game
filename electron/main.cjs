'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path  = require('path');
const http  = require('http');
const https = require('https');
const fs    = require('fs');
const url   = require('url');

const WINDOW_MIN_W  = 1024;
const WINDOW_MIN_H  = 600;
const RAILWAY_HOST  = 'surf-game-production.up.railway.app';

let mainWindow = null;
let devServer  = null;

// ── Local static file server + Railway API proxy ────────────────────────────

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.mjs':  'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.mp3':  'audio/mpeg',
  '.ogg':  'audio/ogg',
  '.wav':  'audio/wav',
};

function distDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'dist')
    : path.join(__dirname, '../dist');
}

/**
 * Proxy an /api/* request to the Railway server.
 * Reads the full body first, then forwards with all headers.
 */
function proxyToRailway(req, res) {
  const parsedUrl = url.parse(req.url);
  const railwayPath = parsedUrl.path; // e.g. /api/auth/register

  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);

    const options = {
      hostname: RAILWAY_HOST,
      port:     443,
      path:     railwayPath,
      method:   req.method,
      headers: {
        ...req.headers,
        host:             RAILWAY_HOST,
        'content-length': body.length,
      },
    };

    const proxy = https.request(options, (railRes) => {
      // Forward CORS headers so the page is happy
      const forwarded = {
        'content-type':                 railRes.headers['content-type'] || 'application/json',
        'access-control-allow-origin':  '*',
        'access-control-allow-headers': 'Content-Type, Authorization',
        'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
      };
      if (railRes.headers['authorization']) forwarded['authorization'] = railRes.headers['authorization'];
      res.writeHead(railRes.statusCode, forwarded);
      railRes.pipe(res);
    });

    proxy.on('error', (err) => {
      console.error('[Proxy] Railway request failed:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Could not reach game server' }));
    });

    if (body.length > 0) proxy.write(body);
    proxy.end();
  });
}

function startFileServer() {
  return new Promise((resolve) => {
    devServer = http.createServer((req, res) => {
      const parsedPath = url.parse(req.url).pathname;

      // ── OPTIONS preflight ────────────────────────────────────────────────
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin':  '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        });
        res.end();
        return;
      }

      // ── /api/* → proxy to Railway ────────────────────────────────────────
      if (parsedPath.startsWith('/api')) {
        proxyToRailway(req, res);
        return;
      }

      // ── Static files ─────────────────────────────────────────────────────
      let reqPath = parsedPath;
      if (reqPath === '/') reqPath = '/index.html';

      const safePath = path.join(distDir(), reqPath.replace(/\.\./g, ''));
      const ext      = path.extname(safePath).toLowerCase();
      const mime     = MIME[ext] || 'application/octet-stream';

      fs.readFile(safePath, (err, data) => {
        if (err) {
          fs.readFile(path.join(distDir(), 'index.html'), (e2, html) => {
            if (e2) { res.writeHead(404); res.end('Not found'); return; }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
          });
          return;
        }
        res.writeHead(200, { 'Content-Type': mime });
        res.end(data);
      });
    });

    devServer.listen(0, '127.0.0.1', () => resolve(devServer.address().port));
  });
}

// ── Window ─────────────────────────────────────────────────────────────────

async function createWindow() {
  const port = await startFileServer();

  mainWindow = new BrowserWindow({
    width:           1280,
    height:          720,
    minWidth:        WINDOW_MIN_W,
    minHeight:       WINDOW_MIN_H,
    frame:           false,
    backgroundColor: '#02040c',
    icon:            path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      preload:          path.join(__dirname, 'preload.cjs'),
      nodeIntegration:  false,
      contextIsolation: true,
      sandbox:          false,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}/`);
  mainWindow.on('closed', () => { mainWindow = null; });

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

// ── IPC ────────────────────────────────────────────────────────────────────

ipcMain.handle('window:minimize',    () => mainWindow?.minimize());
ipcMain.handle('window:maximize',    () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle('window:close',       () => mainWindow?.close());
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false);

// ── Window display modes ────────────────────────────────────────────────────
// 'windowed'           — normal window, resizable
// 'borderless'         — frameless maximized (no taskbar overlap on Windows)
// 'fullscreen'         — exclusive fullscreen
ipcMain.handle('window:setMode', (_, mode) => {
  if (!mainWindow) return;
  switch (mode) {
    case 'windowed':
      mainWindow.setFullScreen(false);
      mainWindow.unmaximize();
      mainWindow.setSize(1280, 720, true);
      mainWindow.center();
      mainWindow.webContents.send('titlebar-visible', true);
      break;
    case 'borderless':
      mainWindow.setFullScreen(false);
      mainWindow.maximize();
      mainWindow.webContents.send('titlebar-visible', true);
      break;
    case 'fullscreen':
      mainWindow.setFullScreen(true);
      mainWindow.webContents.send('titlebar-visible', false);
      break;
  }
});

ipcMain.handle('window:getMode', () => {
  if (!mainWindow) return 'windowed';
  if (mainWindow.isFullScreen()) return 'fullscreen';
  if (mainWindow.isMaximized()) return 'borderless';
  return 'windowed';
});

// ── Lifecycle ──────────────────────────────────────────────────────────────

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { devServer?.close(); app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
