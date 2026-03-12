const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const port = process.env.VITE_DEV_SERVER_PORT || 5174;
const devUrl = `http://localhost:${port}`;

const distPath = path.join(__dirname, '..', 'dist');
const preloadPath = path.join(__dirname, 'preload.cjs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#c0c0c0',
    title: 'Mason Admin',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: preloadPath,
    },
  });

  win.once('ready-to-show', () => win.show());

  win.on('maximize', () => win.webContents.send('window:maximized', true));
  win.on('unmaximize', () => win.webContents.send('window:unmaximized'));

  if (isDev) {
    win.loadURL(devUrl);
    win.webContents.openDevTools();
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
    if (w) (w.isMaximized() ? w.unmaximize() : w.maximize());
  });
  ipcMain.on('window:close', (e) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (w) w.close();
  });
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
