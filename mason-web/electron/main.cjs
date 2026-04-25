const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const port = process.env.VITE_DEV_SERVER_PORT || 5173;
const devUrl = `http://127.0.0.1:${port}`;

const distPath = path.join(__dirname, '..', 'dist');
const preloadPath = path.join(__dirname, 'preload.cjs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1380,
    height: 860,
    minWidth: 1080,
    minHeight: 700,
    frame: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    titleBarOverlay: false,
    trafficLightPosition: process.platform === 'darwin' ? { x: 16, y: 15 } : undefined,
    backgroundColor: '#08060c',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: preloadPath,
    },
  });

  win.once('ready-to-show', () => win.show());

  if (isDev) {
    win.loadURL(devUrl);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(distPath, 'index.html'));
  }
}

app.whenReady().then(() => {
  ipcMain.on('window:minimize', (e) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (w) w.minimize();
  });

  ipcMain.on('window:maximize', (e) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (!w) return;
    if (w.isMaximized()) {
      w.unmaximize();
      return;
    }
    w.maximize();
  });

  ipcMain.on('window:close', (e) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (w) w.close();
  });

  ipcMain.handle('window:platform', () => process.platform);
  ipcMain.handle('window:isMaximized', (e) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    return w ? w.isMaximized() : false;
  });

  app.on('browser-window-created', (_event, window) => {
    window.on('maximize', () => window.webContents.send('window:maximized', true));
    window.on('unmaximize', () => window.webContents.send('window:maximized', false));
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
