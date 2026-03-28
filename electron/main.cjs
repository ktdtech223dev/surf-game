'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path  = require('path');
const http  = require('http');
const fs    = require('fs');
const url   = require('url');

const WINDOW_MIN_W = 1024;
const WINDOW_MIN_H = 600;

let mainWindow = null;
let devServer  = null;

// ── Local static file server ───────────────────────────────────────────────

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
