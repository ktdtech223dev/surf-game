'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// ── Production game server ─────────────────────────────────────────────────
// The NetworkClient uses this to connect to the Railway game server instead of
// localhost. Set before any game code runs.
window.__gameServer__ = 'surf-game-production.up.railway.app';

// ── Window controls (exposed to renderer) ─────────────────────────────────
contextBridge.exposeInMainWorld('electron', {
  minimize:    () => ipcRenderer.invoke('window:minimize'),
  maximize:    () => ipcRenderer.invoke('window:maximize'),
  close:       () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // Listen for maximize/unmaximize to update the button icon
  onMaximizeChange: (fn) => {
    ipcRenderer.on('maximize-change', (_, isMax) => fn(isMax));
  },
});
