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
      preload: fs.existsSync(path.join(__dirname, 'preload.cjs'))
        ? path.join(__dirname, 'preload.cjs')
        : path.join(__dirname, 'preload.js'),
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

  // Assets IPC Handlers
  ipcMain.handle('db:getAssets', async () => {
    return dbEngine ? dbEngine.getAssets() : [];
  });

  ipcMain.handle('db:getAssetById', async (_: any, id: string) => {
    return dbEngine ? dbEngine.getAssetById(id) : null;
  });

  ipcMain.handle('db:searchAssets', async (_: any, query: string) => {
    return dbEngine ? dbEngine.searchAssets(query) : [];
  });

  ipcMain.handle('db:createAsset', async (_: any, asset: any) => {
    if (!dbEngine) throw new Error('Database not initialized');
    return dbEngine.createAsset(asset);
  });

  ipcMain.handle('db:updateAsset', async (_: any, id: string, fields: any) => {
    if (!dbEngine) throw new Error('Database not initialized');
    return dbEngine.updateAsset(id, fields);
  });

  ipcMain.handle('db:updateInventoryStatus', async (_: any, id: string, status: string, bayLocation?: string, user?: string) => {
    if (!dbEngine) throw new Error('Database not initialized');
    return dbEngine.updateInventoryStatus(id, status, bayLocation, user);
  });

  // Discoveries IPC Handlers
  ipcMain.handle('db:getDiscoveries', async () => {
    return dbEngine ? dbEngine.getDiscoveries() : [];
  });

  ipcMain.handle('db:createDiscovery', async (_: any, discovery: any) => {
    if (!dbEngine) throw new Error('Database not initialized');
    return dbEngine.createDiscovery(discovery);
  });

  ipcMain.handle('db:matchDiscovery', async (_: any, id: string, assetId: string) => {
    if (!dbEngine) throw new Error('Database not initialized');
    dbEngine.matchDiscovery(id, assetId);
    return true;
  });

  ipcMain.handle('db:integrateDiscovery', async (_: any, id: string, officialCode: string) => {
    if (!dbEngine) throw new Error('Database not initialized');
    return dbEngine.integrateDiscovery(id, officialCode);
  });

  ipcMain.handle('db:rejectDiscovery', async (_: any, id: string, reason: string) => {
    if (!dbEngine) throw new Error('Database not initialized');
    dbEngine.rejectDiscovery(id, reason);
    return true;
  });

  // Campaign & Zones IPC Handlers
  ipcMain.handle('db:getCampaign', async () => {
    return dbEngine ? dbEngine.getCampaign() : null;
  });

  ipcMain.handle('db:closeZone', async (_: any, zoneId: string, user: string) => {
    if (!dbEngine) throw new Error('Database not initialized');
    dbEngine.closeZone(zoneId, user);
    return true;
  });

  ipcMain.handle('db:reopenZone', async (_: any, zoneId: string) => {
    if (!dbEngine) throw new Error('Database not initialized');
    dbEngine.reopenZone(zoneId);
    return true;
  });

  ipcMain.handle('db:lockCampaign', async () => {
    if (!dbEngine) throw new Error('Database not initialized');
    dbEngine.lockCampaign();
    return true;
  });

  // Audit Logs IPC Handlers
  ipcMain.handle('db:getAuditLogs', async () => {
    return dbEngine ? dbEngine.getAuditLogs() : [];
  });

  ipcMain.handle('db:addAuditLog', async (_: any, entry: any) => {
    if (!dbEngine) throw new Error('Database not initialized');
    return dbEngine.addAuditLog(entry);
  });

  // Offline Mutations IPC Handlers
  ipcMain.handle('db:getMutations', async () => {
    return dbEngine ? dbEngine.getMutations() : [];
  });

  ipcMain.handle('db:addMutation', async (_: any, mutation: any) => {
    if (!dbEngine) throw new Error('Database not initialized');
    return dbEngine.addMutation(mutation);
  });

  ipcMain.handle('db:flushMutations', async () => {
    return dbEngine ? dbEngine.flushMutations() : 0;
  });

  ipcMain.handle('db:clearMutations', async () => {
    if (!dbEngine) throw new Error('Database not initialized');
    dbEngine.clearMutations();
    return true;
  });

  // Conflicts IPC Handlers
  ipcMain.handle('db:getConflicts', async () => {
    return dbEngine ? dbEngine.getConflicts() : [];
  });

  ipcMain.handle('db:resolveConflict', async (_: any, conflictId: string, resolution: string) => {
    if (!dbEngine) throw new Error('Database not initialized');
    dbEngine.resolveConflict(conflictId, resolution);
    return true;
  });

  // Checklist IPC Handlers
  ipcMain.handle('db:getChecklist', async () => {
    return dbEngine ? dbEngine.getChecklist() : [];
  });

  ipcMain.handle('db:updateChecklist', async (_: any, id: number, status: string) => {
    if (!dbEngine) throw new Error('Database not initialized');
    dbEngine.updateChecklist(id, status);
    return true;
  });

  // Backup & Restore IPC Handlers
  ipcMain.handle('db:exportBackup', async () => {
    return dbEngine ? dbEngine.exportBackup() : null;
  });

  ipcMain.handle('db:importBackup', async (_: any, backup: any) => {
    if (!dbEngine) throw new Error('Database not initialized');
    return dbEngine.importBackup(backup);
  });

  ipcMain.handle('db:resetSeed', async () => {
    if (!dbEngine) throw new Error('Database not initialized');
    return true;
  });

  ipcMain.handle('db:exportSqlDump', async () => {
    return dbEngine ? dbEngine.exportSqlDump() : '';
  });

  // User & Permission Management (RBAC) IPC Handlers
  ipcMain.handle('db:getUsers', async () => {
    return dbEngine ? dbEngine.getUsers() : [];
  });

  ipcMain.handle('db:createUser', async (_: any, user: any) => {
    if (!dbEngine) throw new Error('Database engine not initialized');
    return dbEngine.createUser(user);
  });

  ipcMain.handle('db:updateUser', async (_: any, id: string, fields: any) => {
    if (!dbEngine) throw new Error('Database engine not initialized');
    return dbEngine.updateUser(id, fields);
  });

  ipcMain.handle('db:setUserActiveStatus', async (_: any, id: string, isActive: boolean) => {
    if (!dbEngine) throw new Error('Database engine not initialized');
    dbEngine.setUserActiveStatus(id, isActive);
    return true;
  });

  ipcMain.handle('db:resetUserPassword', async (_: any, id: string, newPasswordHash: string) => {
    if (!dbEngine) throw new Error('Database engine not initialized');
    dbEngine.resetUserPassword(id, newPasswordHash);
    return true;
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
