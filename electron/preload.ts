/**
 * KAF-INVENTAIRE - Electron Secure Preload Script
 * Exposes strictly typed and sanitized IPC methods via contextBridge.
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
  },
  db: {
    getStats: () => ipcRenderer.invoke('db:getStats'),
    getAssets: () => ipcRenderer.invoke('db:getAssets'),
    getAssetById: (id: string) => ipcRenderer.invoke('db:getAssetById', id),
    searchAssets: (query: string) => ipcRenderer.invoke('db:searchAssets', query),
    createAsset: (asset: any) => ipcRenderer.invoke('db:createAsset', asset),
    updateAsset: (id: string, fields: any) => ipcRenderer.invoke('db:updateAsset', id, fields),
    updateInventoryStatus: (id: string, status: string, bayLocation?: string, user?: string) => 
      ipcRenderer.invoke('db:updateInventoryStatus', id, status, bayLocation, user),
    getDiscoveries: () => ipcRenderer.invoke('db:getDiscoveries'),
    createDiscovery: (discovery: any) => ipcRenderer.invoke('db:createDiscovery', discovery),
    matchDiscovery: (id: string, assetId: string) => ipcRenderer.invoke('db:matchDiscovery', id, assetId),
    integrateDiscovery: (id: string, officialCode: string) => ipcRenderer.invoke('db:integrateDiscovery', id, officialCode),
    rejectDiscovery: (id: string, reason: string) => ipcRenderer.invoke('db:rejectDiscovery', id, reason),
    getCampaign: () => ipcRenderer.invoke('db:getCampaign'),
    closeZone: (zoneId: string, user: string) => ipcRenderer.invoke('db:closeZone', zoneId, user),
    reopenZone: (zoneId: string) => ipcRenderer.invoke('db:reopenZone', zoneId),
    lockCampaign: () => ipcRenderer.invoke('db:lockCampaign'),
    getAuditLogs: () => ipcRenderer.invoke('db:getAuditLogs'),
    addAuditLog: (entry: any) => ipcRenderer.invoke('db:addAuditLog', entry),
    getMutations: () => ipcRenderer.invoke('db:getMutations'),
    addMutation: (mutation: any) => ipcRenderer.invoke('db:addMutation', mutation),
    flushMutations: () => ipcRenderer.invoke('db:flushMutations'),
    clearMutations: () => ipcRenderer.invoke('db:clearMutations'),
    getConflicts: () => ipcRenderer.invoke('db:getConflicts'),
    resolveConflict: (conflictId: string, resolution: string) => ipcRenderer.invoke('db:resolveConflict', conflictId, resolution),
    getChecklist: () => ipcRenderer.invoke('db:getChecklist'),
    updateChecklist: (id: number, status: string) => ipcRenderer.invoke('db:updateChecklist', id, status),
    exportBackup: () => ipcRenderer.invoke('db:exportBackup'),
    importBackup: (backup: any) => ipcRenderer.invoke('db:importBackup', backup),
    resetSeed: () => ipcRenderer.invoke('db:resetSeed'),
    runIntegrityCheck: () => ipcRenderer.invoke('db:runIntegrityCheck'),
    exportSqlDump: () => ipcRenderer.invoke('db:exportSqlDump'),
  },
  system: {
    getAppInfo: () => ipcRenderer.invoke('system:getAppInfo'),
    printManifest: () => ipcRenderer.invoke('system:printManifest'),
    exportCsvFile: (filename: string, content: string) => ipcRenderer.invoke('system:exportCsvFile', filename, content),
    openDataFolder: () => ipcRenderer.invoke('system:openDataFolder'),
  }
});
