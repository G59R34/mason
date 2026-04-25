const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopWindow', {
  isDesktop: true,
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  getPlatform: () => ipcRenderer.invoke('window:platform'),
  getIsMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onMaximizedChange: (fn) => {
    const listener = (_event, isMaximized) => fn(Boolean(isMaximized));
    ipcRenderer.on('window:maximized', listener);
    return () => ipcRenderer.removeListener('window:maximized', listener);
  },
});
