'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Point the game's NetworkClient at the production Railway server
window.__gameServer__ = 'surf-game-production.up.railway.app';

contextBridge.exposeInMainWorld('electron', {
  minimize:    () => ipcRenderer.invoke('window:minimize'),
  maximize:    () => ipcRenderer.invoke('window:maximize'),
  close:       () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // Display modes
  setWindowMode: (mode) => ipcRenderer.invoke('window:setMode', mode),
  getWindowMode: ()     => ipcRenderer.invoke('window:getMode'),

  // Events
  onMaximizeChange:   (fn) => ipcRenderer.on('maximize-change',   (_, v) => fn(v)),
  onTitlebarVisible:  (fn) => ipcRenderer.on('titlebar-visible',  (_, v) => fn(v)),
});
