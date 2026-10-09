/**
 * KAF-INVENTAIRE - Electron Windows Main Process
 * Handles application lifecycle, SQLite storage engine, and native Windows integrations.
 */

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { LocalSQLiteEngine } from './database';

let mainWindow: BrowserWindow | null = null;
let dbEngine: LocalSQLiteEngine | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: '#0B0F17',
    title: 'KAF-INVENTAIRE | Precision Industrial Asset Management',
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  if (isDev) {
    const devUrl = process.env.ELECTRON_DEV_URL || 'http://localhost:3000';
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Initialize SQLite local engine in user's AppData directory
  dbEngine = new LocalSQLiteEngine({
    userDataPath: app.getPath('userData'),
  });
  await dbEngine.init();

  // Register Database IPC Handlers
  ipcMain.handle('db:getStats', async () => {
    return dbEngine ? dbEngine.getStats() : null;
  });

  ipcMain.handle('db:runIntegrityCheck', async () => {
    return dbEngine ? dbEngine.checkIntegrity() : 'ok';
  });

  ipcMain.handle('system:getAppInfo', async () => {
    return {
      appName: 'KAF-INVENTAIRE',
      version: app.getVersion(),
      dataDir: app.getPath('userData'),
    };
  });

  ipcMain.handle('system:openDataFolder', async () => {
    shell.openPath(app.getPath('userData'));
  });

  ipcMain.handle('system:exportCsvFile', async (_: any, filename: string, content: string) => {
    if (!mainWindow) return false;
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Exporter le Registre CSV',
      defaultPath: filename,
      filters: [{ name: 'CSV Document', extensions: ['csv'] }]
    });

    if (filePath) {
      fs.writeFileSync(filePath, content, 'utf-8');
      return true;
    }
    return false;
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (dbEngine) {
    dbEngine.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
