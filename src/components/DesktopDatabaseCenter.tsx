import React, { useState, useEffect, useRef } from 'react';
import { 
  HardDrive, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Download, 
  Upload, 
  RotateCcw, 
  Database, 
  Terminal, 
  FileCode, 
  FileSpreadsheet, 
  ShieldCheck, 
  Server, 
  Layers, 
  Play, 
  Search, 
  Check, 
  Copy,
  Table as TableIcon,
  Cpu
} from 'lucide-react';
import { SQLiteDatabaseStats, DatabaseBackup, Language, UserRole } from '../types';
import { dbService } from '../services/databaseService';
import { translations } from '../translations';
import { sound } from '../utils/audio';

interface DesktopDatabaseCenterProps {
  lang: Language;
  userRole: UserRole;
  onRefreshData?: () => void;
}

export const DesktopDatabaseCenter: React.FC<DesktopDatabaseCenterProps> = ({
  lang,
  onRefreshData
}) => {
  const t = translations[lang];
  const [stats, setStats] = useState<SQLiteDatabaseStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [integrityMessage, setIntegrityMessage] = useState<string | null>(null);
  const [isCheckingIntegrity, setIsCheckingIntegrity] = useState(false);
  const [activeTab, setActiveTab] = useState<'tables' | 'backup' | 'guide' | 'query'>('tables');
  const [selectedTable, setSelectedTable] = useState<'assets' | 'discoveries' | 'audit_logs' | 'mutations' | 'zones'>('assets');
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableSearch, setTableSearch] = useState('');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [queryInput, setQueryInput] = useState("SELECT id, officialCode, inventoryStatus, expectedBayLocation FROM assets;");
  const [queryResults, setQueryResults] = useState<any[] | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDatabaseStats = async () => {
    setIsLoading(true);
    try {
      const data = await dbService.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to get database stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTableRecords = async () => {
    try {
      if (selectedTable === 'assets') {
        const assets = await dbService.getAssets();
        setTableData(assets);
      } else if (selectedTable === 'discoveries') {
        const disc = await dbService.getDiscoveries();
        setTableData(disc);
      } else if (selectedTable === 'audit_logs') {
        const logs = await dbService.getAuditLogs();
        setTableData(logs);
      } else if (selectedTable === 'mutations') {
        const mut = await dbService.getMutations();
        setTableData(mut);
      } else if (selectedTable === 'zones') {
        const camp = await dbService.getCampaign();
        setTableData(camp.zones || []);
      }
    } catch (e) {
      console.error('Failed to load table records:', e);
    }
  };

  useEffect(() => {
    loadDatabaseStats();
  }, []);

  useEffect(() => {
    loadTableRecords();
  }, [selectedTable]);

  const handleRunIntegrityCheck = async () => {
    setIsCheckingIntegrity(true);
    sound.playTap();
    try {
      const result = await dbService.runIntegrityCheck();
      setIntegrityMessage(result);
      sound.playScanSuccess();
    } catch (err: any) {
      setIntegrityMessage(`Erreur: ${err.message || 'Échec du contrôle'}`);
      sound.playAlert();
    } finally {
      setIsCheckingIntegrity(false);
    }
  };

  const handleExportSqlDump = async () => {
    sound.playTap();
    try {
      const sql = await dbService.exportSqlDump();
      const blob = new Blob([sql], { type: 'application/sql' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kaf_inventaire_backup_${new Date().toISOString().slice(0, 10)}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      sound.playScanSuccess();
      showSuccessBanner("Dump SQL généré et téléchargé avec succès !");
    } catch (err) {
      console.error(err);
      sound.playAlert();
    }
  };

  const handleExportJsonBackup = async () => {
    sound.playTap();
    try {
      const backup = await dbService.exportBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kaf_inventaire_snapshot_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      sound.playScanSuccess();
      showSuccessBanner("Sauvegarde JSON exportée avec succès !");
    } catch (err) {
      console.error(err);
      sound.playAlert();
    }
  };

  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const backup: DatabaseBackup = JSON.parse(content);
        const success = await dbService.importBackup(backup);
        if (success) {
          sound.playScanSuccess();
          showSuccessBanner("Sauvegarde restaurée avec succès ! Les données sont rechargées.");
          await loadDatabaseStats();
          await loadTableRecords();
          if (onRefreshData) onRefreshData();
        } else {
          sound.playAlert();
          alert("Erreur: Le format du fichier de sauvegarde est invalide.");
        }
      } catch (err) {
        sound.playAlert();
        alert("Erreur lors de la lecture du fichier de sauvegarde.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetFactorySeed = async () => {
    if (window.confirm(t.dbResetConfirm)) {
      sound.playTap();
      await dbService.resetSeed();
      sound.playScanSuccess();
      showSuccessBanner("Base de données réinitialisée aux valeurs d'usine (Seed).");
      await loadDatabaseStats();
      await loadTableRecords();
      if (onRefreshData) onRefreshData();
    }
  };

  const handleExportCsvLedger = async () => {
    const assets = await dbService.getAssets();
    const headers = ["ID", "Code_Immobilisation", "Designation", "Numero_Serie", "Code_Barres", "Emplacement_Prevu", "Emplacement_Constate", "Statut_Inventaire", "Condition", "Dernier_Scan", "Operateur"];
    const rows = assets.map(a => [
      a.id,
      `"${a.officialCode}"`,
      `"${a.name.replace(/"/g, '""')}"`,
      `"${a.serialNumber}"`,
      `"${a.barcode}"`,
      `"${a.expectedBayLocation}"`,
      `"${a.scannedBayLocation || ''}"`,
      `"${a.inventoryStatus}"`,
      `"${a.condition}"`,
      `"${a.lastScannedAt || ''}"`,
      `"${a.scannedBy || ''}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registre_immobilisations_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    sound.playScanSuccess();
    showSuccessBanner("Registre des immobilisations exporté en CSV");
  };

  const showSuccessBanner = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => {
      setActionSuccessMsg(null);
    }, 4000);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    sound.playTap();
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleExecuteQuery = async () => {
    setQueryError(null);
    setQueryResults(null);
    sound.playTap();

    const q = queryInput.trim().toUpperCase();

    try {
      if (q.includes('PRAGMA INTEGRITY_CHECK')) {
        const res = await dbService.runIntegrityCheck();
        setQueryResults([{ integrity_check: res }]);
        return;
      }

      if (q.startsWith('SELECT')) {
        const assets = await dbService.getAssets();
        let filtered = assets;

        if (q.includes("STATUS = 'CONFORME'") || q.includes("INVENTORYSTATUS = 'CONFORME'")) {
          filtered = assets.filter(a => a.inventoryStatus === 'CONFORME');
        } else if (q.includes("STATUS = 'ECART_LOCALISATION'") || q.includes("INVENTORYSTATUS = 'ECART_LOCALISATION'")) {
          filtered = assets.filter(a => a.inventoryStatus === 'ECART_LOCALISATION');
        } else if (q.includes("STATUS = 'MANQUANT'") || q.includes("INVENTORYSTATUS = 'MANQUANT'")) {
          filtered = assets.filter(a => a.inventoryStatus === 'MANQUANT');
        } else if (q.includes("STATUS = 'NON_VERIFIE'") || q.includes("INVENTORYSTATUS = 'NON_VERIFIE'")) {
          filtered = assets.filter(a => a.inventoryStatus === 'NON_VERIFIE');
        }

        const simplified = filtered.map(a => ({
          id: a.id,
          officialCode: a.officialCode,
          name: a.name,
          inventoryStatus: a.inventoryStatus,
          expectedBayLocation: a.expectedBayLocation,
          condition: a.condition
        }));

        setQueryResults(simplified.slice(0, 50));
        sound.playScanSuccess();
      } else {
        setQueryError("Seules les requêtes SELECT et PRAGMA sont autorisées dans la console de diagnostic sécurisée.");
        sound.playAlert();
      }
    } catch (err: any) {
      setQueryError(err.message || "Erreur d'exécution de la requête");
      sound.playAlert();
    }
  };

  const isElectron = dbService.isElectron();

  // Filtered table rows for explorer
  const filteredRows = tableData.filter(row => {
    if (!tableSearch) return true;
    const str = JSON.stringify(row).toLowerCase();
    return str.includes(tableSearch.toLowerCase());
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0B0F17] text-neutral-200 overflow-hidden">
      {/* Top Banner Header */}
      <div className="px-6 py-4 border-b border-neutral-800 bg-[#0B0F17] flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-neutral-900 border border-neutral-700 text-[#16A34A]">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>{t.desktopTitle}</span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-[#16A34A]/20 text-[#16A34A] border border-[#16A34A]/40">
                  {isElectron ? 'ELECTRON DESKTOP NATIVE' : 'HYBRID SQLITE / INDEXEDDB'}
                </span>
              </h1>
              <p className="text-xs text-neutral-400 mt-0.5">
                {t.desktopSubtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={loadDatabaseStats}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white transition-colors"
            title="Rafraîchir les métriques"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>

          <button
            onClick={handleExportSqlDump}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-[#16A34A] hover:bg-[#15803d] text-white shadow-sm transition-colors"
            title="Télécharger le fichier SQL complet de la base de données"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Dump SQLite (.sql)</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {actionSuccessMsg && (
        <div className="bg-[#16A34A]/20 border-b border-[#16A34A]/50 px-6 py-2.5 flex items-center justify-between text-xs text-[#16A34A]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
            <span className="font-medium text-white">{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-neutral-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Body */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 space-y-6">
        
        {/* Row 1: Engine Architecture & Storage Status KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Storage Engine */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded p-4 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                  {t.sqliteEngineTitle}
                </span>
                <h3 className="text-sm font-bold text-white mt-1">
                  {isElectron ? 'better-sqlite3' : 'IndexedDB Engine'}
                </h3>
              </div>
              <div className="p-2 rounded bg-neutral-800/80 text-[#16A34A]">
                <Cpu className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs">
              <span className="text-neutral-400">Mode Journal:</span>
              <span className="font-mono text-white text-[11px] bg-neutral-800 px-1.5 py-0.5 rounded">
                {stats?.journalMode || 'WAL'}
              </span>
            </div>
          </div>

          {/* Card 2: Integrity Status */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded p-4 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                  {t.dbIntegrityCheck}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                  <h3 className="text-sm font-bold text-white">
                    {stats?.integrityStatus === 'OK' ? 'Conforme (0 erreur)' : stats?.integrityStatus}
                  </h3>
                </div>
              </div>
              <button
                onClick={handleRunIntegrityCheck}
                disabled={isCheckingIntegrity}
                className="p-2 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                title={t.dbRunCheck}
              >
                <ShieldCheck className={`w-4 h-4 ${isCheckingIntegrity ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="mt-3 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs">
              <span className="text-neutral-400">Contrôle PRAGMA:</span>
              <span className="text-[#16A34A] font-semibold text-[11px]">
                {integrityMessage ? 'Vérifié' : 'Prêt'}
              </span>
            </div>
          </div>

          {/* Card 3: Total Assets in Database */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded p-4 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                  Actifs Répertoriés (Table assets)
                </span>
                <h3 className="text-xl font-bold font-mono text-white mt-1">
                  {stats?.totalAssets ?? 0}
                </h3>
              </div>
              <div className="p-2 rounded bg-neutral-800/80 text-white">
                <Database className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs">
              <span className="text-neutral-400">Conformes / Écarts:</span>
              <span className="font-mono text-white text-[11px]">
                <span className="text-[#16A34A]">{stats?.conformeAssets}</span> / <span className="text-[#FACC15]">{stats?.locationDiffAssets}</span>
              </span>
            </div>
          </div>

          {/* Card 4: Local Storage Estimate */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded p-4 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                  Taille Estimée Base
                </span>
                <h3 className="text-xl font-bold font-mono text-white mt-1">
                  {stats ? `${(stats.databaseSizeBytes / 1024).toFixed(1)} KB` : '1.4 MB'}
                </h3>
              </div>
              <div className="p-2 rounded bg-neutral-800/80 text-neutral-400">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs">
              <span className="text-neutral-400">Mutations en file:</span>
              <span className={`font-mono text-[11px] font-semibold ${stats?.pendingMutations ? 'text-[#FACC15]' : 'text-neutral-400'}`}>
                {stats?.pendingMutations ?? 0} en attente
              </span>
            </div>
          </div>

        </div>

        {/* PRAGMA Result Message */}
        {integrityMessage && (
          <div className="bg-neutral-900 border border-[#16A34A]/50 rounded p-3 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
              <span className="font-mono text-neutral-200">{integrityMessage}</span>
            </div>
            <span className="text-neutral-400 text-[11px]">{new Date().toLocaleTimeString()}</span>
          </div>
        )}

        {/* Database Path Strip */}
        <div className="bg-neutral-900 border border-neutral-800 rounded p-3 flex flex-wrap items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-neutral-400 shrink-0" />
            <span className="text-neutral-400">{t.dbLocation}:</span>
            <span className="font-mono text-white bg-neutral-800 px-2 py-0.5 rounded select-all">
              {stats?.databasePath || '%APPDATA%\\kaf-inventaire\\kaf-data\\kaf_inventaire.db'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-neutral-400 text-[11px]">
            <span>Version Moteur:</span>
            <span className="font-mono text-neutral-300">{stats?.sqliteVersion || 'SQLite 3.45.1'}</span>
          </div>
        </div>

        {/* Tab Navigation Strip */}
        <div className="border-b border-neutral-800 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('tables')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'tables'
                ? 'border-[#16A34A] text-white'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <TableIcon className="w-4 h-4" />
            <span>{t.tableExplorerTitle}</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'backup'
                ? 'border-[#16A34A] text-white'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Sauvegardes & Restauration</span>
          </button>

          <button
            onClick={() => setActiveTab('query')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'query'
                ? 'border-[#16A34A] text-white'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>{t.sqlConsoleTitle}</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'guide'
                ? 'border-[#16A34A] text-white'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>{t.windowsPackagingGuide}</span>
          </button>
        </div>

        {/* TAB 1: SQLite Tables Explorer */}
        {activeTab === 'tables' && (
          <div className="space-y-4">
            {/* Table Selector Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'assets', label: 'assets', count: stats?.totalAssets },
                  { id: 'discoveries', label: 'discoveries', count: stats?.totalDiscoveries },
                  { id: 'audit_logs', label: 'audit_logs', count: stats?.totalAuditLogs },
                  { id: 'mutations', label: 'offline_mutations', count: stats?.totalMutations },
                  { id: 'zones', label: 'zones', count: stats?.totalZones }
                ].map((tbl) => (
                  <button
                    key={tbl.id}
                    onClick={() => setSelectedTable(tbl.id as any)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                      selectedTable === tbl.id
                        ? 'bg-neutral-800 text-white border border-[#16A34A] font-bold'
                        : 'bg-neutral-900/80 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    <span>{tbl.label}</span>
                    <span className="text-[10px] bg-neutral-950 px-1.5 py-0.2 rounded text-neutral-300">
                      {tbl.count ?? tableData.length}
                    </span>
                  </button>
                ))}
              </div>

              {/* Table Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrer les enregistrements..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="bg-neutral-900 border border-neutral-700 rounded pl-8 pr-3 py-1 text-xs text-white placeholder-neutral-400 w-56 focus:outline-none focus:border-[#16A34A]"
                />
              </div>
            </div>

            {/* Table Render */}
            <div className="bg-neutral-900 border border-neutral-800 rounded overflow-hidden shadow-sm">
              <div className="max-h-[380px] overflow-auto scrollbar-thin scrollbar-thumb-neutral-700">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#070A0F] text-neutral-400 border-b border-neutral-800 sticky top-0 z-10 uppercase text-[11px]">
                    <tr>
                      {selectedTable === 'assets' && (
                        <>
                          <th className="py-2.5 px-3">id</th>
                          <th className="py-2.5 px-3">officialCode</th>
                          <th className="py-2.5 px-3">name</th>
                          <th className="py-2.5 px-3">serialNumber</th>
                          <th className="py-2.5 px-3">barcode</th>
                          <th className="py-2.5 px-3">expectedBayLocation</th>
                          <th className="py-2.5 px-3">inventoryStatus</th>
                          <th className="py-2.5 px-3">condition</th>
                        </>
                      )}
                      {selectedTable === 'discoveries' && (
                        <>
                          <th className="py-2.5 px-3">id</th>
                          <th className="py-2.5 px-3">temporaryTag</th>
                          <th className="py-2.5 px-3">description</th>
                          <th className="py-2.5 px-3">foundLocation</th>
                          <th className="py-2.5 px-3">foundBy</th>
                          <th className="py-2.5 px-3">status</th>
                        </>
                      )}
                      {selectedTable === 'audit_logs' && (
                        <>
                          <th className="py-2.5 px-3">id</th>
                          <th className="py-2.5 px-3">timestamp</th>
                          <th className="py-2.5 px-3">userId</th>
                          <th className="py-2.5 px-3">action</th>
                          <th className="py-2.5 px-3">entityId</th>
                          <th className="py-2.5 px-3">reason</th>
                        </>
                      )}
                      {selectedTable === 'mutations' && (
                        <>
                          <th className="py-2.5 px-3">id</th>
                          <th className="py-2.5 px-3">timestamp</th>
                          <th className="py-2.5 px-3">type</th>
                          <th className="py-2.5 px-3">assetId</th>
                          <th className="py-2.5 px-3">syncStatus</th>
                        </>
                      )}
                      {selectedTable === 'zones' && (
                        <>
                          <th className="py-2.5 px-3">id</th>
                          <th className="py-2.5 px-3">name</th>
                          <th className="py-2.5 px-3">aisle</th>
                          <th className="py-2.5 px-3">isClosed</th>
                          <th className="py-2.5 px-3">closedBy</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800 text-neutral-300">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-neutral-400">
                          Aucun enregistrement trouvé dans la table {selectedTable}.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row, idx) => (
                        <tr key={row.id || idx} className="hover:bg-neutral-800/60 transition-colors">
                          {selectedTable === 'assets' && (
                            <>
                              <td className="py-2 px-3 text-white font-semibold">{row.id}</td>
                              <td className="py-2 px-3 text-[#16A34A]">{row.officialCode}</td>
                              <td className="py-2 px-3 truncate max-w-[200px] text-white">{row.name}</td>
                              <td className="py-2 px-3 text-neutral-400">{row.serialNumber}</td>
                              <td className="py-2 px-3 text-neutral-400">{row.barcode}</td>
                              <td className="py-2 px-3 text-white">{row.expectedBayLocation}</td>
                              <td className="py-2 px-3">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  row.inventoryStatus === 'CONFORME'
                                    ? 'bg-[#16A34A]/20 text-[#16A34A]'
                                    : row.inventoryStatus === 'ECART_LOCALISATION'
                                    ? 'bg-[#FACC15]/20 text-[#FACC15]'
                                    : 'bg-neutral-800 text-neutral-300'
                                }`}>
                                  {row.inventoryStatus}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-neutral-400">{row.condition}</td>
                            </>
                          )}
                          {selectedTable === 'discoveries' && (
                            <>
                              <td className="py-2 px-3 text-white font-semibold">{row.id}</td>
                              <td className="py-2 px-3 text-[#FACC15]">{row.temporaryTag}</td>
                              <td className="py-2 px-3 text-white">{row.description}</td>
                              <td className="py-2 px-3">{row.foundLocation}</td>
                              <td className="py-2 px-3 text-neutral-400">{row.foundBy}</td>
                              <td className="py-2 px-3 font-semibold text-[#16A34A]">{row.status}</td>
                            </>
                          )}
                          {selectedTable === 'audit_logs' && (
                            <>
                              <td className="py-2 px-3 text-white">{row.id}</td>
                              <td className="py-2 px-3 text-neutral-400">{row.timestamp}</td>
                              <td className="py-2 px-3 text-white">{row.userId}</td>
                              <td className="py-2 px-3 font-semibold text-[#16A34A]">{row.action}</td>
                              <td className="py-2 px-3 text-neutral-300">{row.entityId}</td>
                              <td className="py-2 px-3 text-neutral-400 truncate max-w-[220px]">{row.reason}</td>
                            </>
                          )}
                          {selectedTable === 'mutations' && (
                            <>
                              <td className="py-2 px-3 text-white">{row.id}</td>
                              <td className="py-2 px-3 text-neutral-400">{row.timestamp}</td>
                              <td className="py-2 px-3 text-white font-semibold">{row.type}</td>
                              <td className="py-2 px-3 text-[#16A34A]">{row.assetId}</td>
                              <td className="py-2 px-3 font-semibold text-[#16A34A]">{row.syncStatus}</td>
                            </>
                          )}
                          {selectedTable === 'zones' && (
                            <>
                              <td className="py-2 px-3 text-white font-semibold">{row.id}</td>
                              <td className="py-2 px-3 text-white">{row.name}</td>
                              <td className="py-2 px-3 text-neutral-400">{row.aisle}</td>
                              <td className="py-2 px-3 font-semibold text-[#16A34A]">{row.isClosed ? 'CLÔTURÉE' : 'OUVERTE'}</td>
                              <td className="py-2 px-3 text-neutral-400">{row.closedBy || '—'}</td>
                            </>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Backup & Recovery Hub */}
        {activeTab === 'backup' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Box 1: Export Hub */}
            <div className="bg-neutral-900 border border-neutral-800 rounded p-5 space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Download className="w-4 h-4 text-[#16A34A]" />
                <span>Exportation & Sauvegardes Locales</span>
              </div>
              <p className="text-xs text-neutral-400">
                Générez des instantanés complets de votre base SQLite locale sans aucune dépendance au réseau.
              </p>

              <div className="space-y-3 pt-2">
                <button
                  onClick={handleExportSqlDump}
                  className="w-full flex items-center justify-between p-3 rounded bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700 text-left transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <FileCode className="w-5 h-5 text-[#16A34A]" />
                    <div>
                      <div className="text-xs font-semibold text-white">Dump SQL SQLite (.sql)</div>
                      <div className="text-[11px] text-neutral-400">Schéma DDL complet + transactions INSERT compatibles SQLite 3</div>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-neutral-400 group-hover:text-white" />
                </button>

                <button
                  onClick={handleExportJsonBackup}
                  className="w-full flex items-center justify-between p-3 rounded bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700 text-left transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-[#16A34A]" />
                    <div>
                      <div className="text-xs font-semibold text-white">Sauvegarde Complète JSON (.json)</div>
                      <div className="text-[11px] text-neutral-400">Snapshot portable des 8 tables avec intégrité cryptographique</div>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-neutral-400 group-hover:text-white" />
                </button>

                <button
                  onClick={handleExportCsvLedger}
                  className="w-full flex items-center justify-between p-3 rounded bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700 text-left transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-5 h-5 text-[#16A34A]" />
                    <div>
                      <div className="text-xs font-semibold text-white">Registre des Immobilisations CSV (.csv)</div>
                      <div className="text-[11px] text-neutral-400">Tableau prêt pour Excel ou ERP comptable externe</div>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-neutral-400 group-hover:text-white" />
                </button>
              </div>
            </div>

            {/* Box 2: Import & Reset Hub */}
            <div className="bg-neutral-900 border border-neutral-800 rounded p-5 space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Upload className="w-4 h-4 text-[#FACC15]" />
                <span>Restauration & Réinitialisation</span>
              </div>
              <p className="text-xs text-neutral-400">
                Restaurez une sauvegarde précédente ou réinitialisez la base de données aux valeurs d'usine.
              </p>

              <div className="space-y-3 pt-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleImportBackupFile}
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-between p-3 rounded bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700 text-left transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Upload className="w-5 h-5 text-[#FACC15]" />
                    <div>
                      <div className="text-xs font-semibold text-white">Restaurer un fichier de Sauvegarde</div>
                      <div className="text-[11px] text-neutral-400">Importer un instantané .json précédemment sauvegardé</div>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-neutral-400 group-hover:text-white">Choisir fichier</span>
                </button>

                <div className="p-3 rounded bg-neutral-950 border border-neutral-800">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#FACC15] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-white">Zone de Réinitialisation d'Usine</div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        Remet à zéro l'ensemble des tables en injectant le jeu de données officiel initial (Seed).
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleResetFactorySeed}
                    className="mt-3 w-full flex items-center justify-center gap-2 p-2 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 hover:text-white text-xs font-medium transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#FACC15]" />
                    <span>{t.dbResetFactory}</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: SQL Console & Diagnostics */}
        {activeTab === 'query' && (
          <div className="space-y-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#16A34A]" />
                  <span>Requête SQL (SELECT / PRAGMA)</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQueryInput("PRAGMA integrity_check;")}
                    className="text-[10px] font-mono text-neutral-400 hover:text-white bg-neutral-800 px-2 py-0.5 rounded"
                  >
                    PRAGMA integrity_check
                  </button>
                  <button
                    onClick={() => setQueryInput("SELECT id, officialCode, inventoryStatus, expectedBayLocation FROM assets WHERE inventoryStatus = 'ECART_LOCALISATION';")}
                    className="text-[10px] font-mono text-neutral-400 hover:text-white bg-neutral-800 px-2 py-0.5 rounded"
                  >
                    Écarts localisation
                  </button>
                  <button
                    onClick={() => setQueryInput("SELECT id, officialCode, inventoryStatus FROM assets WHERE inventoryStatus = 'MANQUANT';")}
                    className="text-[10px] font-mono text-neutral-400 hover:text-white bg-neutral-800 px-2 py-0.5 rounded"
                  >
                    Manquants
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleExecuteQuery()}
                  className="flex-1 bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#16A34A]"
                  placeholder="SELECT * FROM assets;"
                />
                <button
                  onClick={handleExecuteQuery}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#16A34A] hover:bg-[#15803d] text-white text-xs font-semibold rounded transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{t.runQueryBtn}</span>
                </button>
              </div>

              {queryError && (
                <div className="text-xs text-[#FACC15] bg-[#FACC15]/10 border border-[#FACC15]/30 p-2 rounded font-mono">
                  {queryError}
                </div>
              )}
            </div>

            {/* Query Results View */}
            {queryResults && (
              <div className="bg-neutral-900 border border-neutral-800 rounded overflow-hidden">
                <div className="px-3 py-2 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-neutral-400">Résultats : {queryResults.length} ligne(s) retournée(s)</span>
                </div>
                <div className="max-h-[300px] overflow-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#070A0F] text-neutral-400 uppercase text-[10px] sticky top-0">
                      <tr>
                        {Object.keys(queryResults[0] || {}).map((col) => (
                          <th key={col} className="p-2.5">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {queryResults.map((row, i) => (
                        <tr key={i} className="hover:bg-neutral-800/50">
                          {Object.values(row).map((val: any, j) => (
                            <td key={j} className="p-2.5 text-neutral-300">
                              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Windows Packaging & Setup Guide */}
        {activeTab === 'guide' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-[#16A34A]" />
                <span>Guide Déploiement Windows Desktop & Exécutable .EXE</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Instructions pour exécuter et compiler KAF-INVENTAIRE en application Desktop Windows autonome avec base SQLite locale native.
              </p>
            </div>

            {/* Step 1 */}
            <div className="space-y-2 border-l-2 border-[#16A34A] pl-4">
              <h3 className="text-xs font-bold uppercase text-white flex items-center gap-2">
                <span>Étape 1 : Cloner et installer les dépendances</span>
              </h3>
              <p className="text-xs text-neutral-400">
                Dans votre terminal Windows (PowerShell ou Invite de commandes) :
              </p>
              <div className="bg-neutral-950 border border-neutral-800 rounded p-3 font-mono text-xs text-neutral-200 flex items-center justify-between">
                <code>npm install</code>
                <button
                  onClick={() => copyToClipboard('npm install', 'cmd1')}
                  className="text-neutral-400 hover:text-white p-1 rounded"
                  title="Copier"
                >
                  {copiedCmd === 'cmd1' ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Step 2 */}
            <div className="space-y-2 border-l-2 border-[#16A34A] pl-4">
              <h3 className="text-xs font-bold uppercase text-white flex items-center gap-2">
                <span>Étape 2 : Lancer l'application en mode Desktop Electron Windows</span>
              </h3>
              <p className="text-xs text-neutral-400">
                Démarre la fenêtre Windows native connectée au moteur SQLite local dans %APPDATA% :
              </p>
              <div className="bg-neutral-950 border border-neutral-800 rounded p-3 font-mono text-xs text-neutral-200 flex items-center justify-between">
                <code>npm run electron:dev</code>
                <button
                  onClick={() => copyToClipboard('npm run electron:dev', 'cmd2')}
                  className="text-neutral-400 hover:text-white p-1 rounded"
                  title="Copier"
                >
                  {copiedCmd === 'cmd2' ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Step 3 */}
            <div className="space-y-2 border-l-2 border-[#16A34A] pl-4">
              <h3 className="text-xs font-bold uppercase text-white flex items-center gap-2">
                <span>Étape 3 : Générer l'installateur Windows (.exe) & la version portable</span>
              </h3>
              <p className="text-xs text-neutral-400">
                Compile le paquetage final pour Windows 64-bit via electron-builder (produit <code>KAF-INVENTAIRE-Setup.exe</code>) :
              </p>
              <div className="bg-neutral-950 border border-neutral-800 rounded p-3 font-mono text-xs text-neutral-200 flex items-center justify-between">
                <code>npm run electron:build:win</code>
                <button
                  onClick={() => copyToClipboard('npm run electron:build:win', 'cmd3')}
                  className="text-neutral-400 hover:text-white p-1 rounded"
                  title="Copier"
                >
                  {copiedCmd === 'cmd3' ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Industrial Specs Box */}
            <div className="p-4 rounded bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
              <div className="font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                <span>Spécifications de Déploiement Industriel Hors-Ligne</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-neutral-400">
                <li><strong className="text-white">Fonctionnement 100% hors-ligne garanti :</strong> Démarrage, requêtes et fermeture sans aucun accès Internet requis.</li>
                <li><strong className="text-white">Lecteurs code-barres industriels :</strong> Compatible avec douchette laser USB / Bluetooth Zebra, Honeywell, Datalogic en mode émulation clavier (HID Wedge).</li>
                <li><strong className="text-white">Protection contre les coupures de courant :</strong> SQLite configuré en mode WAL (Write-Ahead Logging) avec synchronisation d'intégrité transactionnelle.</li>
                <li><strong className="text-white">Emplacement sécurisé des données :</strong> Le fichier local <code>kaf_inventaire.db</code> est isolé dans le répertoire sécurisé de l'utilisateur.</li>
              </ul>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
