const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  onMaximized: (fn) => {
    ipcRenderer.on('window:maximized', (_e, value) => fn(value));
  },
  onUnmaximized: (fn) => {
    ipcRenderer.on('window:unmaximized', () => fn());
  },
});
