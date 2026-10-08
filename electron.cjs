const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1680,
    height: 980,
    minWidth: 1280,
    minHeight: 768,
    title: 'Eagle Eye™ — Factory Test Diagnostics & Tolerance Margin Analyzer',
    backgroundColor: '#080c14',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // In development, load from Vite dev server if running, or load built dist/index.html
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000/').catch(() => {
      mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // Remove default menu bar for clean industrial workstation appearance
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
