'use strict';

const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path  = require('path');
const http  = require('http');
const fs    = require('fs');
const url   = require('url');

// ── Config ─────────────────────────────────────────────────────────────────
const PRODUCTION_SERVER = 'surf-game-production.up.railway.app';
const WINDOW_MIN_W = 1024;
const WINDOW_MIN_H = 600;

let mainWindow = null;
let devServer  = null;
let devPort    = null;

// ── Local static file server ───────────────────────────────────────────────
// Serves the Vite-built dist/ folder over HTTP so WebSocket connections work.

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
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'dist');
  }
  return path.join(__dirname, '../dist');
}

function startFileServer() {
  return new Promise((resolve) => {
    devServer = http.createServer((req, res) => {
      let reqPath = url.parse(req.url).pathname;
      if (reqPath === '/') reqPath = '/index.html';

      const safePath = path.join(distDir(), reqPath.replace(/\.\./g, ''));
      const ext      = path.extname(safePath).toLowerCase();
      const mime     = MIME[ext] || 'application/octet-stream';

      fs.readFile(safePath, (err, data) => {
        if (err) {
          // SPA fallback — serve index.html for unknown routes
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

    devServer.listen(0, '127.0.0.1', () => {
      devPort = devServer.address().port;
      resolve(devPort);
    });
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
    frame:           false,       // custom title bar
    backgroundColor: '#02040c',
    icon:            path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      nodeIntegration:  false,
      contextIsolation: true,
      sandbox:          false,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}/`);

  mainWindow.on('closed', () => { mainWindow = null; });

  // Open DevTools in dev mode
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

// ── IPC — window controls ──────────────────────────────────────────────────

ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle('window:close',    () => mainWindow?.close());
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false);

// ── App lifecycle ──────────────────────────────────────────────────────────

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  devServer?.close();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
