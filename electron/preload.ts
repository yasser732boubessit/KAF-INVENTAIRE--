/**
 * KAF-INVENTAIRE - Electron Secure Preload Script
 * Exposes typed IPC methods via contextBridge.
 * 
 * ✅ NEW: syncUsers exposed
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
    // Stats
    getStats: () => ipcRenderer.invoke('db:getStats'),
    runIntegrityCheck: () => ipcRenderer.invoke('db:runIntegrityCheck'),
    exportSqlDump: () => ipcRenderer.invoke('db:exportSqlDump'),

    // Assets
    getAssets: () => ipcRenderer.invoke('db:getAssets'),
    getAssetById: (id: string) => ipcRenderer.invoke('db:getAssetById', id),
    searchAssets: (query: string) => ipcRenderer.invoke('db:searchAssets', query),
    createAsset: (asset: any) => ipcRenderer.invoke('db:createAsset', asset),
    updateAsset: (id: string, fields: any) => ipcRenderer.invoke('db:updateAsset', id, fields),
    updateInventoryStatus: (id: string, status: string, bayLocation?: string, user?: string) =>
      ipcRenderer.invoke('db:updateInventoryStatus', id, status, bayLocation, user),

    // Discoveries
    getDiscoveries: () => ipcRenderer.invoke('db:getDiscoveries'),
    createDiscovery: (discovery: any) => ipcRenderer.invoke('db:createDiscovery', discovery),
    matchDiscovery: (id: string, assetId: string) => ipcRenderer.invoke('db:matchDiscovery', id, assetId),
    integrateDiscovery: (id: string, officialCode: string) => ipcRenderer.invoke('db:integrateDiscovery', id, officialCode),
    rejectDiscovery: (id: string, reason: string) => ipcRenderer.invoke('db:rejectDiscovery', id, reason),

    // Campaign
    getCampaign: () => ipcRenderer.invoke('db:getCampaign'),
    closeZone: (zoneId: string, user: string) => ipcRenderer.invoke('db:closeZone', zoneId, user),
    reopenZone: (zoneId: string) => ipcRenderer.invoke('db:reopenZone', zoneId),
    lockCampaign: () => ipcRenderer.invoke('db:lockCampaign'),

    // Audit
    getAuditLogs: () => ipcRenderer.invoke('db:getAuditLogs'),
    addAuditLog: (entry: any) => ipcRenderer.invoke('db:addAuditLog', entry),

    // Mutations
    getMutations: () => ipcRenderer.invoke('db:getMutations'),
    addMutation: (mutation: any) => ipcRenderer.invoke('db:addMutation', mutation),
    flushMutations: () => ipcRenderer.invoke('db:flushMutations'),
    clearMutations: () => ipcRenderer.invoke('db:clearMutations'),

    // Conflicts
    getConflicts: () => ipcRenderer.invoke('db:getConflicts'),
    resolveConflict: (conflictId: string, resolution: string) => ipcRenderer.invoke('db:resolveConflict', conflictId, resolution),

    // Checklist
    getChecklist: () => ipcRenderer.invoke('db:getChecklist'),
    updateChecklist: (id: number, status: string) => ipcRenderer.invoke('db:updateChecklist', id, status),

    // Backup
    exportBackup: () => ipcRenderer.invoke('db:exportBackup'),
    importBackup: (backup: any) => ipcRenderer.invoke('db:importBackup', backup),
    resetSeed: () => ipcRenderer.invoke('db:resetSeed'),

    // Users
    getUsers: () => ipcRenderer.invoke('db:getUsers'),
    createUser: (user: any) => ipcRenderer.invoke('db:createUser', user),
    updateUser: (id: string, fields: any) => ipcRenderer.invoke('db:updateUser', id, fields),
    setUserActiveStatus: (id: string, isActive: boolean) => ipcRenderer.invoke('db:setUserActiveStatus', id, isActive),
    resetUserPassword: (id: string, newPasswordHash: string) => ipcRenderer.invoke('db:resetUserPassword', id, newPasswordHash),

    // ✅ NEW: Sync users from server
    syncUsers: (users: any[]) => ipcRenderer.invoke('db:syncUsers', users),
  },
  system: {
    getAppInfo: () => ipcRenderer.invoke('system:getAppInfo'),
    printManifest: () => ipcRenderer.invoke('system:printManifest'),
    exportCsvFile: (filename: string, content: string) => ipcRenderer.invoke('system:exportCsvFile', filename, content),
    openDataFolder: () => ipcRenderer.invoke('system:openDataFolder'),
  }
});