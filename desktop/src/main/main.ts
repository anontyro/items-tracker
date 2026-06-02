import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { registerSettingsIpc } from './ipc/settingsIpc';
import { settingsService } from './services/settingsService';

// Keep a global reference of the window object to prevent garbage collection
let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, isDev ? '../preload.js' : 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 12 },
  });

  // Load the renderer
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  // Register IPC handlers after window is created
  if (mainWindow) {
    registerSettingsIpc(mainWindow);
    console.log('IPC handlers registered');
  }

  // Register app info handlers
  ipcMain.handle('app:get-version', () => app.getVersion());
  ipcMain.handle('app:get-platform', () => process.platform);

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Check settings for quit behavior
  const quitOnClose = settingsService.get('quitOnWindowClose');
  
  // On macOS, apps typically stay running when all windows are closed
  if (process.platform !== 'darwin' || quitOnClose) {
    app.quit();
  }
});

app.on('quit', () => {
  // Cleanup
  mainWindow = null;
});

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Focus existing window if a second instance is launched
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });
}
