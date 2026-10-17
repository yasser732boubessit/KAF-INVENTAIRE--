// electron/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome
  },
  db: {
    getStats: () => import_electron.ipcRenderer.invoke("db:getStats"),
    getAssets: () => import_electron.ipcRenderer.invoke("db:getAssets"),
    getAssetById: (id) => import_electron.ipcRenderer.invoke("db:getAssetById", id),
    searchAssets: (query) => import_electron.ipcRenderer.invoke("db:searchAssets", query),
    createAsset: (asset) => import_electron.ipcRenderer.invoke("db:createAsset", asset),
    updateAsset: (id, fields) => import_electron.ipcRenderer.invoke("db:updateAsset", id, fields),
    updateInventoryStatus: (id, status, bayLocation, user) => import_electron.ipcRenderer.invoke("db:updateInventoryStatus", id, status, bayLocation, user),
    getDiscoveries: () => import_electron.ipcRenderer.invoke("db:getDiscoveries"),
    createDiscovery: (discovery) => import_electron.ipcRenderer.invoke("db:createDiscovery", discovery),
    matchDiscovery: (id, assetId) => import_electron.ipcRenderer.invoke("db:matchDiscovery", id, assetId),
    integrateDiscovery: (id, officialCode) => import_electron.ipcRenderer.invoke("db:integrateDiscovery", id, officialCode),
    rejectDiscovery: (id, reason) => import_electron.ipcRenderer.invoke("db:rejectDiscovery", id, reason),
    getCampaign: () => import_electron.ipcRenderer.invoke("db:getCampaign"),
    closeZone: (zoneId, user) => import_electron.ipcRenderer.invoke("db:closeZone", zoneId, user),
    reopenZone: (zoneId) => import_electron.ipcRenderer.invoke("db:reopenZone", zoneId),
    lockCampaign: () => import_electron.ipcRenderer.invoke("db:lockCampaign"),
    getAuditLogs: () => import_electron.ipcRenderer.invoke("db:getAuditLogs"),
    addAuditLog: (entry) => import_electron.ipcRenderer.invoke("db:addAuditLog", entry),
    getMutations: () => import_electron.ipcRenderer.invoke("db:getMutations"),
    addMutation: (mutation) => import_electron.ipcRenderer.invoke("db:addMutation", mutation),
    flushMutations: () => import_electron.ipcRenderer.invoke("db:flushMutations"),
    clearMutations: () => import_electron.ipcRenderer.invoke("db:clearMutations"),
    getConflicts: () => import_electron.ipcRenderer.invoke("db:getConflicts"),
    resolveConflict: (conflictId, resolution) => import_electron.ipcRenderer.invoke("db:resolveConflict", conflictId, resolution),
    getChecklist: () => import_electron.ipcRenderer.invoke("db:getChecklist"),
    updateChecklist: (id, status) => import_electron.ipcRenderer.invoke("db:updateChecklist", id, status),
    exportBackup: () => import_electron.ipcRenderer.invoke("db:exportBackup"),
    importBackup: (backup) => import_electron.ipcRenderer.invoke("db:importBackup", backup),
    resetSeed: () => import_electron.ipcRenderer.invoke("db:resetSeed"),
    runIntegrityCheck: () => import_electron.ipcRenderer.invoke("db:runIntegrityCheck"),
    exportSqlDump: () => import_electron.ipcRenderer.invoke("db:exportSqlDump"),
    getUsers: () => import_electron.ipcRenderer.invoke("db:getUsers"),
    createUser: (user) => import_electron.ipcRenderer.invoke("db:createUser", user),
    updateUser: (id, fields) => import_electron.ipcRenderer.invoke("db:updateUser", id, fields),
    setUserActiveStatus: (id, isActive) => import_electron.ipcRenderer.invoke("db:setUserActiveStatus", id, isActive),
    resetUserPassword: (id, newPasswordHash) => import_electron.ipcRenderer.invoke("db:resetUserPassword", id, newPasswordHash)
  },
  system: {
    getAppInfo: () => import_electron.ipcRenderer.invoke("system:getAppInfo"),
    printManifest: () => import_electron.ipcRenderer.invoke("system:printManifest"),
    exportCsvFile: (filename, content) => import_electron.ipcRenderer.invoke("system:exportCsvFile", filename, content),
    openDataFolder: () => import_electron.ipcRenderer.invoke("system:openDataFolder")
  }
});
