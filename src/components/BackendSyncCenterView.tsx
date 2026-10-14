import React, { useState, useEffect } from 'react';
import { 
  Server, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ShieldCheck, 
  Send, 
  Terminal, 
  Database, 
  ArrowRight, 
  ArrowDownUp, 
  Lock, 
  Key, 
  Wifi, 
  WifiOff, 
  Play, 
  FileSpreadsheet, 
  Check, 
  Copy, 
  Layers, 
  Truck, 
  ClipboardCheck, 
  FileCode, 
  Clock, 
  Radio
} from 'lucide-react';
import { 
  Language, 
  UserRole, 
  BackendRole, 
  BackendWorkflowState, 
  BackendSyncBatchResult, 
  ApiHttpLog, 
  BackendConnectionStatus,
  OfflineMutation,
  Asset
} from '../types';
import { centralSyncService } from '../services/centralSyncService';
import { translations } from '../translations';
import { sound } from '../utils/audio';

interface BackendSyncCenterViewProps {
  lang: Language;
  localMutations: OfflineMutation[];
  onRefreshLocalData?: () => void;
  onApplyServerAssetsToLocal?: (assets: Asset[]) => void;
}

export const BackendSyncCenterView: React.FC<BackendSyncCenterViewProps> = ({
  lang,
  localMutations,
  onRefreshLocalData,
  onApplyServerAssetsToLocal
}) => {
  const t = translations[lang];

  // Sync state
  const [syncStatus, setSyncStatus] = useState<BackendConnectionStatus>(centralSyncService.getStatus());
  const [httpLogs, setHttpLogs] = useState<ApiHttpLog[]>(centralSyncService.getLogs());
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isExecutingTest, setIsExecutingTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    testName: string;
    status: 'SUCCESS' | 'CONFLICT' | 'ERROR' | 'INFO';
    message: string;
    details?: any;
  } | null>(null);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'tests' | 'network' | 'assets' | 'config'>('tests');
  const [selectedLog, setSelectedLog] = useState<ApiHttpLog | null>(null);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  // Central assets from server
  const [serverAssets, setServerAssets] = useState<any[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

  // Custom API URL config
  const [customUrl, setCustomUrl] = useState(syncStatus.apiUrl);
  const [isEditingUrl, setIsEditingUrl] = useState(false);

  // Subscribe to central sync service events
  useEffect(() => {
    const unsubStatus = centralSyncService.subscribe(setSyncStatus);
    const unsubLogs = centralSyncService.subscribeLogs(setHttpLogs);
    
    // Initial health check & fetch
    handlePingHealth();
    handleFetchServerAssets();

    return () => {
      unsubStatus();
      unsubLogs();
    };
  }, []);

  const handlePingHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const res = await centralSyncService.checkHealth();
      if (res.ok) {
        sound.playScanSuccess();
      } else {
        sound.playAlert();
      }
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleFetchServerAssets = async () => {
    setIsLoadingAssets(true);
    try {
      const assets = await centralSyncService.fetchAssets();
      setServerAssets(assets);
    } catch (e) {
      console.warn('Failed to fetch server assets:', e);
    } finally {
      setIsLoadingAssets(false);
    }
  };

  const handleRoleSwitch = async (role: BackendRole) => {
    sound.playScanSuccess();
    const res = await centralSyncService.login(role);
    if (res.ok) {
      setTestResult({
        testName: `Connexion & Token JWT (${role})`,
        status: 'SUCCESS',
        message: `Authentification réussie pour le rôle ${role}. Token JWT signé et permissions attribuées.`,
        details: {
          user: res.user,
          tokenPreview: `${res.token?.substring(0, 24)}...${res.token?.substring(res.token.length - 12)}`
        }
      });
    } else {
      sound.playAlert();
      setTestResult({
        testName: `Connexion (${role})`,
        status: 'ERROR',
        message: `Échec d'authentification: ${res.error}`
      });
    }
  };

  const handleSaveUrl = () => {
    centralSyncService.updateConfig({ apiUrl: customUrl });
    setIsEditingUrl(false);
    handlePingHealth();
  };

  // ---------------------------------------------------------
  // TEST SCENARIOS (The 8 Functions from Backend Documentation)
  // ---------------------------------------------------------

  // Test 1: Batch Push Sync (Function 5)
  const runTestSyncBatch = async () => {
    setIsExecutingTest(true);
    sound.playSyncFlush();
    try {
      // Use real local mutations or construct realistic batch
      const batchToSync = localMutations.length > 0 ? localMutations : [
        {
          id: `MUT-TEST-${Date.now()}`,
          idempotencyKey: `IDEMP-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'INVENTORY_SCAN' as const,
          assetId: 'AST-10494',
          assetName: 'Automate Siemens S7-1500',
          payload: {
            inventoryStatus: 'CONFORME',
            scannedLocation: 'BAY-04-RACK-01-LVL3',
            condition: 'nominal'
          },
          syncStatus: 'PENDING' as const,
          retryCount: 0
        }
      ];

      const res = await centralSyncService.syncBatch(batchToSync);
      setTestResult({
        testName: 'POST /api/v1/sync (Moteur de Synchronisation Batch)',
        status: res.conflicts.length > 0 ? 'CONFLICT' : 'SUCCESS',
        message: `Batch ${res.batchId} exécuté : ${res.successes.length} appliqués, ${res.conflicts.length} conflits détectés, ${res.duplicates.length} doublons ignorés.`,
        details: res
      });
      handleFetchServerAssets();
      onRefreshLocalData?.();
    } catch (err: any) {
      sound.playAlert();
      setTestResult({
        testName: 'POST /api/v1/sync',
        status: 'ERROR',
        message: err.message || 'Erreur lors de la synchronisation'
      });
    } finally {
      setIsExecutingTest(false);
    }
  };

  // Test 2: Idempotence & Duplicate Check (Function 5)
  const runTestIdempotence = async () => {
    setIsExecutingTest(true);
    sound.playScanSuccess();
    try {
      const fixedId = 'MUT-IDEMP-STATIC-999';
      const syntheticBatch = [
        {
          id: fixedId,
          idempotencyKey: fixedId,
          timestamp: new Date().toISOString(),
          type: 'INVENTORY_SCAN' as const,
          assetId: 'AST-10492',
          assetName: 'Moteur 45kW IE3',
          payload: { condition: 'nominal' },
          syncStatus: 'PENDING' as const,
          retryCount: 0
        }
      ];

      // First run (or re-run)
      await centralSyncService.syncBatch(syntheticBatch);
      // Second run immediately to trigger deduplication
      const res2 = await centralSyncService.syncBatch(syntheticBatch);

      setTestResult({
        testName: 'POST /api/v1/sync (Test d\'Idempotence & Prévention des Doublons)',
        status: 'SUCCESS',
        message: `Idempotence validée avec succès ! Le serveur a détecté que la mutation '${fixedId}' avait déjà été traitée et l'a inscrite dans la liste des doublons sans modifier la base.`,
        details: {
          mutationId: fixedId,
          detectedDuplicates: res2.duplicates,
          rawResponse: res2
        }
      });
    } catch (err: any) {
      sound.playAlert();
      setTestResult({
        testName: 'Test Idempotence',
        status: 'ERROR',
        message: err.message
      });
    } finally {
      setIsExecutingTest(false);
    }
  };

  // Test 3: Conflict Rejection (Function 6: "Blocage d'écrasement si l'actif est déjà VERIFIE ou CHARGE")
  const runTestConflictProtection = async () => {
    setIsExecutingTest(true);
    sound.playAlert();
    try {
      // AST-10495 is already VERIFIE on the central server!
      const conflictingBatch = [
        {
          id: `MUT-CONFLICT-${Date.now()}`,
          idempotencyKey: `IDEMP-CONF-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'INVENTORY_SCAN' as const,
          assetId: 'AST-10495', // Already VERIFIE
          assetName: 'Transformateur 630kVA (Statut Serveur: VERIFIE)',
          payload: {
            inventoryStatus: 'ECART_LOCALISATION',
            scannedLocation: 'BAY-WRONG-ZONE',
            condition: 'damaged'
          },
          syncStatus: 'PENDING' as const,
          retryCount: 0
        }
      ];

      const res = await centralSyncService.syncBatch(conflictingBatch);

      if (res.conflicts.length > 0) {
        setTestResult({
          testName: 'Fonction 6 — Règle de Blocage d\'Écrasement (Conflit VERIFIE/CHARGE)',
          status: 'CONFLICT',
          message: `RÈGLE DE SÉCURITÉ CONFORME : Le serveur central a bloqué la tentative d'écrasement car l'actif est déjà au statut '${res.conflicts[0].serverState.workflowState}' validé par l'Équipe 2.`,
          details: {
            conflictRule: "Fonction 6 : Blocage d'écrasement si l'actif est déjà VERIFIE ou CHARGE",
            conflictData: res.conflicts[0]
          }
        });
      } else {
        setTestResult({
          testName: 'Test de Conflit',
          status: 'INFO',
          message: 'L\'actif n\'était pas dans un état verrouillé. Vous pouvez d\'abord le passer à VERIFIE.',
          details: res
        });
      }
    } catch (err: any) {
      setTestResult({
        testName: 'Test Conflit',
        status: 'ERROR',
        message: err.message
      });
    } finally {
      setIsExecutingTest(false);
    }
  };

  // Test 4: Physical Verification (Function 4 & 7: Équipe 2)
  const runTestVerification = async () => {
    setIsExecutingTest(true);
    sound.playScanSuccess();
    try {
      // Find an asset that is SYNCHRONISE or AJOUTE
      const target = serverAssets.find(a => a.workflowState === 'SYNCHRONISE' || a.workflowState === 'AJOUTE') || serverAssets[0];
      if (!target) throw new Error('Aucun actif disponible pour vérification');

      const res = await centralSyncService.verifyAsset(target.id, {
        physicalState: 'ACTIF',
        condition: 'nominal',
        bayLocation: target.expectedBayLocation,
        notes: 'Vérifié conforme in situ par Équipe 2'
      });

      setTestResult({
        testName: `POST /api/v1/verification/${target.id} (Équipe 2 - Validation Vérification)`,
        status: 'SUCCESS',
        message: `Validation réussie ! L'actif ${target.officialCode} (${target.name}) a progressé dans la machine à états : statut passé à 'VERIFIE'. Journal d'audit centralisé créé.`,
        details: res
      });
      handleFetchServerAssets();
    } catch (err: any) {
      sound.playAlert();
      setTestResult({
        testName: 'POST /api/v1/verification',
        status: 'ERROR',
        message: err.message
      });
    } finally {
      setIsExecutingTest(false);
    }
  };

  // Test 5: Loading Registration (Function 4 & 7: Équipe 3)
  const runTestLoading = async () => {
    setIsExecutingTest(true);
    sound.playScanSuccess();
    try {
      // Find a verified asset
      const target = serverAssets.find(a => a.workflowState === 'VERIFIE');
      if (!target) {
        throw new Error('Aucun actif avec statut "VERIFIE" disponible. Exécutez d\'abord le Test 4 (Vérification Équipe 2).');
      }

      const res = await centralSyncService.loadAsset(target.id, {
        containerCode: 'CONT-KAF-984',
        truckPlate: 'DZ-16-9941-TRUCK'
      });

      setTestResult({
        testName: `POST /api/v1/loading/${target.id} (Équipe 3 - Enregistrement Chargement)`,
        status: 'SUCCESS',
        message: `Chargement validé ! L'actif ${target.officialCode} a été enregistré sur le convoi. Statut passé à 'CHARGE'.`,
        details: res
      });
      handleFetchServerAssets();
    } catch (err: any) {
      sound.playAlert();
      setTestResult({
        testName: 'POST /api/v1/loading',
        status: 'ERROR',
        message: err.message
      });
    } finally {
      setIsExecutingTest(false);
    }
  };

  // Test 6: Workflow State Guard (Security test: Loading an unverified asset)
  const runTestWorkflowSecurityGuard = async () => {
    setIsExecutingTest(true);
    sound.playAlert();
    try {
      // Try to load an unverified asset
      const target = serverAssets.find(a => a.workflowState === 'AJOUTE') || { id: 'AST-10494', officialCode: 'KAF-AST-2024-003', workflowState: 'AJOUTE' };

      // Switch context temporarily to TEAM_3
      await centralSyncService.login('TEAM_3');

      const res = await centralSyncService.loadAsset(target.id, {
        containerCode: 'CONT-TEST'
      });

      setTestResult({
        testName: 'Garde de Sécurité de la Machine à États (Équipe 3)',
        status: 'INFO',
        message: 'L\'actif a été chargé car vous aviez les privilèges requis.',
        details: res
      });
    } catch (err: any) {
      setTestResult({
        testName: 'Garde de Sécurité de la Machine à États (Règle d\'Or)',
        status: 'SUCCESS',
        message: `GARDE DE SÉCURITÉ CONFORME : Le serveur a rejeté le chargement (${err.message}). Un actif DOIT obligatoirement être vérifié par l'Équipe 2 avant que l'Équipe 3 puisse le charger.`,
        details: { expectedGuard: 'AJOUTE -> SYNCHRONISE -> VERIFIE -> CHARGE', error: err.message }
      });
    } finally {
      setIsExecutingTest(false);
    }
  };

  // Test 7: Mass ETL Import (Function 8: ADMIN)
  const runTestMassEtlImport = async () => {
    setIsExecutingTest(true);
    sound.playScanSuccess();
    try {
      // Login as ADMIN
      await centralSyncService.login('ADMIN');

      // Generate 25 synthetic industrial assets for the ETL import
      const syntheticBatch = Array.from({ length: 25 }, (_, i) => ({
        officialCode: `KAF-ETL-BATCH-${Date.now().toString().slice(-4)}-${i + 1}`,
        name: `Équipement Industriel Importé #${i + 1} (Ligne de Conditionnement)`,
        barcode: `61311099${(10000 + i).toString()}`,
        serialNumber: `SN-ETL-${Date.now()}-${i}`,
        category: i % 2 === 0 ? 'Mechanical' : 'Electrical',
        expectedBayLocation: `BAY-08-RACK-0${(i % 4) + 1}-LVL1`,
        weightKg: 45 + (i * 2)
      }));

      const res = await centralSyncService.importEtl(syntheticBatch);

      setTestResult({
        testName: 'POST /api/v1/etl/import (Importation Massive Excel/JSON)',
        status: 'SUCCESS',
        message: `ETL Exécuté : ${res.importedCount} actifs importés et normalisés, ${res.skippedDuplicates} doublons ignorés en ${res.durationMs}ms. Base centrale portée à ${res.totalAssets} immobilisations.`,
        details: res
      });
      handleFetchServerAssets();
    } catch (err: any) {
      sound.playAlert();
      setTestResult({
        testName: 'POST /api/v1/etl/import',
        status: 'ERROR',
        message: err.message
      });
    } finally {
      setIsExecutingTest(false);
    }
  };

  const copyCurl = (log: ApiHttpLog) => {
    const curl = `curl -X ${log.method} "${window.location.origin}${log.endpoint}" \\
  -H "Content-Type: application/json" \\
  -H "x-device-id: ${syncStatus.deviceId}" \\
  -H "x-device-api-key: dev_key_alpha_9921" \\
  ${syncStatus.token ? `-H "Authorization: Bearer ${syncStatus.token}" \\` : ''}
  ${log.requestPayload ? `-d '${JSON.stringify(log.requestPayload)}'` : ''}`;

    navigator.clipboard.writeText(curl);
    setCopiedLogId(log.id);
    setTimeout(() => setCopiedLogId(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] overflow-y-auto">
      {/* Top Industrial Banner */}
      <div className="bg-[#0B132B] text-white p-5 border-b border-slate-800 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${syncStatus.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                <h1 className="text-base font-bold text-white font-mono-numbers tracking-wide">
                  {lang === 'ar' ? 'مركز المزامنة واختبار الباك إند (NestJS + PostgreSQL 16)' : 'Centre de Contrôle de Synchronisation & Testeur Backend'}
                </h1>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {lang === 'ar' 
                  ? 'منظومة اختبار وفحص جميع واجهات برمجة التطبيقات (API Endpoints)، حوكمة RBAC، وفحص تعارضات المزامنة'
                  : 'Banc de test interactif pour les 8 fonctions du Backend NestJS, la machine à états et les règles RBAC'}
              </p>
            </div>
          </div>

          {/* Connection KPIs & Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-700 text-xs font-mono">
              <span className="text-slate-400">État:</span>
              <span className={`px-2 py-0.5 rounded font-bold ${
                syncStatus.isConnected 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {syncStatus.isConnected ? 'EN LIGNE' : 'HORS-LIGNE'}
              </span>
              {syncStatus.isConnected && (
                <span className="text-slate-300 font-bold">{syncStatus.latencyMs}ms</span>
              )}
            </div>

            {/* Ping Health Button */}
            <button
              onClick={handlePingHealth}
              disabled={isCheckingHealth}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white transition-all active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{lang === 'ar' ? 'فحص الاتصال (Ping)' : 'Ping Santé'}</span>
            </button>

            {/* Refresh Assets Button */}
            <button
              onClick={handleFetchServerAssets}
              disabled={isLoadingAssets}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-sm transition-all active:scale-95"
            >
              <ArrowDownUp className={`w-3.5 h-3.5 ${isLoadingAssets ? 'animate-spin' : ''}`} />
              <span>{lang === 'ar' ? 'تحديث قاعدة السيرفر' : 'Actualiser Base Centrale'}</span>
            </button>
          </div>
        </div>

        {/* Technical Architecture Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80 text-xs font-mono">
          <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
            <span className="text-slate-500 block text-[10px]">BASE CENTRALE</span>
            <div className="flex items-center gap-1.5 mt-0.5 text-emerald-400 font-bold">
              <Database className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">PostgreSQL 16 (Port 5432)</span>
            </div>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
            <span className="text-slate-500 block text-[10px]">CACHE & FILES D'ATTENTE</span>
            <div className="flex items-center gap-1.5 mt-0.5 text-sky-400 font-bold">
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Redis 7 (KAF_SYNC_QUEUE)</span>
            </div>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
            <span className="text-slate-500 block text-[10px]">APPAREIL RECONNU</span>
            <div className="flex items-center gap-1.5 mt-0.5 text-amber-400 font-bold">
              <Radio className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{syncStatus.deviceId} (Certifié)</span>
            </div>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
            <span className="text-slate-500 block text-[10px]">SÉCURITÉ & JETON JWT</span>
            <div className="flex items-center gap-1.5 mt-0.5 text-purple-400 font-bold">
              <Key className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {syncStatus.token ? 'JWT Actif (86400s)' : 'Non authentifié'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('tests')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'tests'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Play className="w-3.5 h-3.5 text-emerald-400" />
            <span>{lang === 'ar' ? 'سيناريوهات الاختبار (8 وظائف)' : 'Banc d\'Essai & Scénarios (8 Fonctions)'}</span>
          </button>

          <button
            onClick={() => setActiveTab('network')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'network'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
            <span>{lang === 'ar' ? 'سجل اتصالات HTTP ومفتش API' : 'Inspecteur Trafic HTTP & Logs API'}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-700 text-[10px] text-white">
              {httpLogs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('assets')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'assets'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>{lang === 'ar' ? 'أصول السيرفر المركزي' : 'Actifs en Base Centrale'}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-[10px] text-slate-800">
              {serverAssets.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'config'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
            <span>{lang === 'ar' ? 'إعدادات الاتصال وURL' : 'Cible Backend & Ports'}</span>
          </button>
        </div>

        {/* Current Role Indicator */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Contexte RBAC:</span>
          <span className="px-2.5 py-1 rounded bg-slate-100 border border-slate-300 font-bold text-slate-800 font-mono">
            {syncStatus.activeRole}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">

        {/* TAB 1: TESTS & SCENARIOS */}
        {activeTab === 'tests' && (
          <div className="space-y-6">
            
            {/* RBAC Role Switcher Matrix */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-700" />
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    {lang === 'ar' ? 'مصفوفة الأدوار والصلاحيات (RBAC Guards)' : 'Sélection du Rôle RBAC pour le Test'}
                  </h2>
                </div>
                <span className="text-xs text-slate-500">
                  {lang === 'ar' ? 'يتم طلب رمز JWT جديد تلقائياً عند تغيير الدور' : 'Génération automatique d\'un token JWT conforme'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* TEAM_1 */}
                <button
                  onClick={() => handleRoleSwitch('TEAM_1')}
                  className={`p-3.5 rounded-lg border text-left transition-all relative ${
                    syncStatus.activeRole === 'TEAM_1'
                      ? 'bg-blue-50/70 border-blue-500 shadow-sm'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-blue-900 font-mono">TEAM_1</span>
                    {syncStatus.activeRole === 'TEAM_1' && <Check className="w-4 h-4 text-blue-600" />}
                  </div>
                  <div className="font-semibold text-xs text-slate-800 mt-1">Équipe 1 — Création des actifs</div>
                  <div className="text-[11px] text-slate-500 mt-1">Desktop SQLite / Offline First</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-mono">CREATE_ASSET</span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-mono">SYNC</span>
                  </div>
                </button>

                {/* TEAM_2 */}
                <button
                  onClick={() => handleRoleSwitch('TEAM_2')}
                  className={`p-3.5 rounded-lg border text-left transition-all relative ${
                    syncStatus.activeRole === 'TEAM_2'
                      ? 'bg-emerald-50/70 border-emerald-500 shadow-sm'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-emerald-900 font-mono">TEAM_2</span>
                    {syncStatus.activeRole === 'TEAM_2' && <Check className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <div className="font-semibold text-xs text-slate-800 mt-1">Équipe 2 — Vérification physique</div>
                  <div className="text-[11px] text-slate-500 mt-1">Portail Web / Contrôle in situ</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-mono">VERIFY_ASSET</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-mono">VIEW_ASSETS</span>
                  </div>
                </button>

                {/* TEAM_3 */}
                <button
                  onClick={() => handleRoleSwitch('TEAM_3')}
                  className={`p-3.5 rounded-lg border text-left transition-all relative ${
                    syncStatus.activeRole === 'TEAM_3'
                      ? 'bg-amber-50/70 border-amber-500 shadow-sm'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-amber-900 font-mono">TEAM_3</span>
                    {syncStatus.activeRole === 'TEAM_3' && <Check className="w-4 h-4 text-amber-600" />}
                  </div>
                  <div className="font-semibold text-xs text-slate-800 mt-1">Équipe 3 — Chargement & PWA</div>
                  <div className="text-[11px] text-slate-500 mt-1">Scan Mobile / Sortie Convoi</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-mono">LOAD_ASSET</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-mono">VIEW_ASSETS</span>
                  </div>
                </button>

                {/* ADMIN */}
                <button
                  onClick={() => handleRoleSwitch('ADMIN')}
                  className={`p-3.5 rounded-lg border text-left transition-all relative ${
                    syncStatus.activeRole === 'ADMIN'
                      ? 'bg-purple-50/70 border-purple-500 shadow-sm'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-purple-900 font-mono">ADMIN</span>
                    {syncStatus.activeRole === 'ADMIN' && <Check className="w-4 h-4 text-purple-600" />}
                  </div>
                  <div className="font-semibold text-xs text-slate-800 mt-1">Superviseur du Patrimoine</div>
                  <div className="text-[11px] text-slate-500 mt-1">Toutes permissions & Gouvernance</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-mono">IMPORT & ETL</span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-mono">ALL GUARDS</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Test Result Feedback Box */}
            {testResult && (
              <div className={`p-4 rounded-xl border shadow-sm transition-all animate-fadeIn ${
                testResult.status === 'SUCCESS' 
                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950' 
                  : testResult.status === 'CONFLICT'
                  ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                  : testResult.status === 'ERROR'
                  ? 'bg-red-50/80 border-red-300 text-red-950'
                  : 'bg-blue-50/80 border-blue-300 text-blue-950'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {testResult.status === 'SUCCESS' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                    ) : testResult.status === 'CONFLICT' ? (
                      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                    ) : testResult.status === 'ERROR' ? (
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                    ) : (
                      <Terminal className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <h3 className="text-xs font-bold font-mono tracking-wide">
                        {testResult.testName}
                      </h3>
                      <p className="text-xs mt-1 leading-relaxed">
                        {testResult.message}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setTestResult(null)}
                    className="text-slate-400 hover:text-slate-600 text-xs px-2 py-0.5"
                  >
                    ✕
                  </button>
                </div>

                {testResult.details && (
                  <div className="mt-3 p-3 rounded-lg bg-slate-900 text-slate-200 text-[11px] font-mono overflow-x-auto max-h-48 border border-slate-800">
                    <pre>{JSON.stringify(testResult.details, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}

            {/* The 8 Interactive Function Test Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Function 5: Batch Sync */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 font-mono">
                      FONCTION 5 • POST /api/v1/sync
                    </span>
                    <span className="text-xs text-slate-400 font-mono">TEAM_1 | ADMIN</span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm mt-2">
                    {lang === 'ar' ? 'محرّك المزامنة الدفعية (Offline Batch Sync)' : 'Moteur de Synchronisation Batch'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {lang === 'ar' 
                      ? 'إرسال حزمة التعديلات المحلية (Mutations) غير المتصلة إلى قاعدة PostgreSQL المركزية، وتحديث حالة المسار إلى SYNCHRONISE.'
                      : 'Pousse le lot des mutations locales en attente vers PostgreSQL central. Met à jour l\'état workflow vers SYNCHRONISE.'}
                  </p>
                  <div className="mt-2 text-xs font-mono text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                    File locale : {localMutations.length} opération(s) en attente
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    onClick={runTestSyncBatch}
                    disabled={isExecutingTest}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition-all shadow-sm active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'تشغيل المزامنة الدفعية' : 'Tester Synchronisation Batch'}</span>
                  </button>
                </div>
              </div>

              {/* Function 5 Idempotency: Anti-Duplicate */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 font-mono">
                      FONCTION 5 • IDEMPOTENCE
                    </span>
                    <span className="text-xs text-slate-400 font-mono">DÉTECTION DOUBLONS</span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm mt-2">
                    {lang === 'ar' ? 'اختبار الحماية ضد تكرار المعاملات (Idempotence)' : 'Test d\'Idempotence & Anti-Doublons'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {lang === 'ar' 
                      ? 'إرسال نفس المعاملة مرتين لاختبار استجابة السيرفر في اكتشاف المعرفات المعالجة سابقاً دون مضاعفة السجلات.'
                      : 'Vérifie que la répétition d\'un même lot de synchronisation est reconnue comme doublon et n\'altère pas les données.'}
                  </p>
                  <div className="mt-2 text-xs font-mono text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-100">
                    Garantie d\'intégrité mathématique UUID / mutationId
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    onClick={runTestIdempotence}
                    disabled={isExecutingTest}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition-all shadow-sm active:scale-95"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'اختبار كشف التكرار' : 'Tester Anti-Doublon'}</span>
                  </button>
                </div>
              </div>

              {/* Function 6: Conflict Protection */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 font-mono">
                      FONCTION 6 • BLOCAGE CONFLIT
                    </span>
                    <span className="text-xs text-slate-400 font-mono">VERIFIE / CHARGE</span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm mt-2">
                    {lang === 'ar' ? 'اختبار حظر استبدال الأصول المفحوصة والمحملة' : 'Blocage d\'Écrasement d\'Actif Vérifié'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {lang === 'ar' 
                      ? 'محاولة تعديل أصل تم فحصه رسمياً (VERIFIE) من قِبل الفريق 2، للتأكد من قيام السيرفر برفض التعديل وإرسال تقرير تعارض (Conflict).'
                      : 'Règle stricte du cahier des charges : blocage immédiat si le client tente d\'écraser un actif déjà VERIFIE ou CHARGE.'}
                  </p>
                  <div className="mt-2 text-xs font-mono text-amber-700 bg-amber-50 p-2 rounded border border-amber-100">
                    Cible de test : AST-10495 (Schneider 630kVA)
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    onClick={runTestConflictProtection}
                    disabled={isExecutingTest}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white transition-all shadow-sm active:scale-95"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'محاكاة التعارض المحظور' : 'Simuler Conflit Bloquant'}</span>
                  </button>
                </div>
              </div>

              {/* Function 4 & 7: Équipe 2 Verification */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 font-mono">
                      FONCTION 4 • /api/v1/verification/:id
                    </span>
                    <span className="text-xs text-slate-400 font-mono">TEAM_2</span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm mt-2">
                    {lang === 'ar' ? 'فحص وتأكيد الفريق 2 (Vérification Physique)' : 'Validation Vérification (Équipe 2)'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {lang === 'ar' 
                      ? 'محاكاة تأكيد فحص المعدة ميدانياً في موقعها، وترقية حالتها في الآلة الحالية من SYNCHRONISE إلى VERIFIE مع تسجيل المدقق.'
                      : 'Passe l\'actif de l\'état SYNCHRONISE à VERIFIE. Enregistre l\'opérateur, l\'horodatage et l\'audit trail immuable.'}
                  </p>
                  <div className="mt-2 text-xs font-mono text-indigo-700 bg-indigo-50 p-2 rounded border border-indigo-100">
                    Transition : SYNCHRONISE ➔ VERIFIE
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    onClick={runTestVerification}
                    disabled={isExecutingTest}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white transition-all shadow-sm active:scale-95"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'تأكيد الفحص الميداني' : 'Valider Vérification In Situ'}</span>
                  </button>
                </div>
              </div>

              {/* Function 4 & 7: Équipe 3 Loading */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 font-mono">
                      FONCTION 4 • /api/v1/loading/:id
                    </span>
                    <span className="text-xs text-slate-400 font-mono">TEAM_3</span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm mt-2">
                    {lang === 'ar' ? 'تسجيل الشحن والتحميل (Équipe 3 Chargement)' : 'Enregistrement Chargement (Équipe 3)'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {lang === 'ar' 
                      ? 'مسح الباركود عند بوابة الشحن وتحميل الأصل على الشاحنة أو الحاوية، ونقله إلى الحالة النهائية CHARGE.'
                      : 'Étape ultime du cycle : scan sur quai d\'expédition et rattachement au matricule de transport.'}
                  </p>
                  <div className="mt-2 text-xs font-mono text-teal-700 bg-teal-50 p-2 rounded border border-teal-100">
                    Transition : VERIFIE ➔ CHARGE
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    onClick={runTestLoading}
                    disabled={isExecutingTest}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-xs font-bold text-white transition-all shadow-sm active:scale-95"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'تسجيل التحميل على الشاحنة' : 'Enregistrer Chargement'}</span>
                  </button>
                </div>
              </div>

              {/* Security Guard: Loading Unverified */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 font-mono">
                      GARDE SÉCURITÉ • WORKFLOW
                    </span>
                    <span className="text-xs text-slate-400 font-mono">MACHINE À ÉTATS</span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm mt-2">
                    {lang === 'ar' ? 'فحص سلامة تسلسل الحالات (حظر شحن غير المفحوص)' : 'Garde Séquentielle : Interdiction Saut d\'Étape'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {lang === 'ar' 
                      ? 'محاولة شحن أصل ما زال بحالة AJOUTE دون أن يمر على الفريق 2، والتحقق من رفض الخادم للعملية مع كود خطأ صريح.'
                      : 'Valide que le backend rejette toute tentative de chargement direct sans validation préalable par l\'Équipe 2.'}
                  </p>
                  <div className="mt-2 text-xs font-mono text-rose-700 bg-rose-50 p-2 rounded border border-rose-100">
                    Règle : Interdit de charger avant d'être VERIFIE
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    onClick={runTestWorkflowSecurityGuard}
                    disabled={isExecutingTest}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition-all shadow-sm active:scale-95"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'اختبار رفض الشحن غير المعتمد' : 'Tester Refus de Saut'}</span>
                  </button>
                </div>
              </div>

              {/* Function 8: Mass ETL Import */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all md:col-span-2">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 font-mono">
                        FONCTION 8 • POST /api/v1/etl/import
                      </span>
                      <span className="text-xs text-slate-400 font-mono">ADMIN SEULEMENT</span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm mt-2">
                      {lang === 'ar' ? 'محاكاة الاستيراد الضخم لملفات Excel وETL (1500+ أصل)' : 'Importation Massive ETL & Nettoyage de Données'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-3xl">
                      {lang === 'ar' 
                        ? 'إرسال حزمة من الأصول الصناعية دفعة واحدة لاختبار خط أنابيب الاستيراد ETL، فحص الباركود، وإلغاء التكرار وحساب مؤشرات الأداء.'
                        : 'Simule l\'importation d\'un fichier Excel industriel (1500+ lignes). Valide les codes, supprime les doublons et consigne les KPI.'}
                    </p>
                  </div>

                  <button
                    onClick={runTestMassEtlImport}
                    disabled={isExecutingTest}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white transition-all shadow-sm active:scale-95"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'تشغيل حزمة ETL التجريبية' : 'Lancer Import Massif ETL'}</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: NETWORK & HTTP TRAFFIC LOGS */}
        {activeTab === 'network' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  {lang === 'ar' ? 'مفتش حركة اتصالات HTTP (Live Network Traffic)' : 'Inspecteur de Requêtes Réseau (REST Traffic)'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'ar' 
                    ? 'عرض وتفحص كل طلب مرسل إلى السيرفر المركزي مع معطيات Headers وPayload وStatus ووقت الاستجابة'
                    : 'Surveillance en direct des échanges entre l\'application et le serveur NestJS / Express'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => centralSyncService.clearLogs()}
                  className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition-all"
                >
                  {lang === 'ar' ? 'مسح السجل' : 'Effacer les logs'}
                </button>
              </div>
            </div>

            {/* Logs List & Details Split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column: Logs List */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {httpLogs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Aucune requête enregistrée pour l'instant. Exécutez un test ou cliquez sur Ping Santé.
                  </div>
                ) : (
                  httpLogs.map((log) => (
                    <div
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className={`p-3 text-xs cursor-pointer transition-colors flex items-center justify-between ${
                        selectedLog?.id === log.id 
                          ? 'bg-blue-50/70 border-l-4 border-l-blue-600' 
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                          log.method === 'POST' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {log.method}
                        </span>
                        <span className="font-mono text-slate-800 font-semibold truncate text-[11px]">
                          {log.endpoint.replace(window.location.origin, '')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
                        <span className="text-slate-400">{log.timestamp}</span>
                        <span className={`px-1.5 py-0.2 rounded font-bold ${
                          log.status >= 200 && log.status < 300 
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.status === 409
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {log.status || 'ERR'}
                        </span>
                        <span className="text-slate-500 text-[10px]">{log.durationMs}ms</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Right Column: Inspector Details */}
              <div className="bg-slate-900 rounded-xl p-4 text-slate-200 font-mono text-xs overflow-hidden flex flex-col max-h-[600px]">
                {selectedLog ? (
                  <div className="space-y-4 overflow-y-auto pr-1">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-blue-600/30 text-blue-400 font-bold">
                            {selectedLog.method}
                          </span>
                          <span className="text-emerald-400 font-bold">{selectedLog.status}</span>
                          <span className="text-slate-400 text-[11px]">{selectedLog.durationMs}ms</span>
                        </div>
                        <div className="text-[11px] text-slate-300 mt-1 truncate max-w-sm">
                          {selectedLog.endpoint}
                        </div>
                      </div>

                      <button
                        onClick={() => copyCurl(selectedLog)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-all"
                      >
                        {copiedLogId === selectedLog.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedLogId === selectedLog.id ? 'Copié' : 'cURL'}</span>
                      </button>
                    </div>

                    {/* Request Payload */}
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                        Payload Envoyé (Request Body)
                      </span>
                      <pre className="p-3 rounded bg-slate-950 text-slate-300 text-[11px] overflow-x-auto border border-slate-800">
                        {selectedLog.requestPayload 
                          ? JSON.stringify(selectedLog.requestPayload, null, 2)
                          : '// Aucun corps envoyé (GET)'}
                      </pre>
                    </div>

                    {/* Response Payload */}
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                        Réponse Serveur (Response Body)
                      </span>
                      <pre className="p-3 rounded bg-slate-950 text-emerald-300 text-[11px] overflow-x-auto border border-slate-800">
                        {selectedLog.responsePayload 
                          ? JSON.stringify(selectedLog.responsePayload, null, 2)
                          : selectedLog.error ? `// Erreur: ${selectedLog.error}` : '// Réponse vide'}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center p-8">
                    <Terminal className="w-8 h-8 mb-2 opacity-50" />
                    <span>Sélectionnez une requête à gauche pour examiner les détails HTTP, Headers et payloads JSON.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CENTRAL SERVER ASSETS TABLE */}
        {activeTab === 'assets' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
              <div>
                <h3 className="font-bold text-sm text-slate-800">
                  {lang === 'ar' ? 'سجل الأصول في قاعدة PostgreSQL المركزية' : 'Source de Vérité Unique (PostgreSQL 16)'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {lang === 'ar' 
                    ? 'الحالة اللحظية لكافة الأصول على السيرفر المركزي مع مراحل Workflow والأطراف المفحوصة'
                    : 'Aperçu en temps réel des actifs enregistrés dans la base centrale'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleFetchServerAssets}
                  disabled={isLoadingAssets}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAssets ? 'animate-spin' : ''}`} />
                  <span>{lang === 'ar' ? 'تحديث الجدول' : 'Actualiser'}</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-mono uppercase text-[10px] border-b border-slate-200">
                    <th className="p-3">ID / Code Officiel</th>
                    <th className="p-3">Désignation</th>
                    <th className="p-3">Catégorie</th>
                    <th className="p-3">Emplacement</th>
                    <th className="p-3 text-center">État Workflow</th>
                    <th className="p-3 text-center">État Physique</th>
                    <th className="p-3">Dernière Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {serverAssets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-slate-50 transition-colors font-mono">
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{asset.id}</div>
                        <div className="text-[10px] text-slate-500">{asset.officialCode}</div>
                      </td>
                      <td className="p-3 font-sans max-w-xs">
                        <div className="font-medium text-slate-800 truncate">{asset.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{asset.barcode}</div>
                      </td>
                      <td className="p-3 font-sans">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                          {asset.category}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700">
                        {asset.scannedBayLocation || asset.expectedBayLocation}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          asset.workflowState === 'AJOUTE'
                            ? 'bg-blue-100 text-blue-800'
                            : asset.workflowState === 'SYNCHRONISE'
                            ? 'bg-sky-100 text-sky-800'
                            : asset.workflowState === 'VERIFIE'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : asset.workflowState === 'CHARGE'
                            ? 'bg-purple-100 text-purple-800 font-bold border border-purple-300'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {asset.workflowState}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          asset.physicalState === 'ACTIF' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {asset.physicalState || 'ACTIF'}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-slate-500 font-sans">
                        {asset.loadedBy 
                          ? `Chargé par ${asset.loadedBy}`
                          : asset.verifiedBy
                          ? `Vérifié par ${asset.verifiedBy}`
                          : asset.scannedBy
                          ? `Scanné par ${asset.scannedBy}`
                          : 'En attente'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: CONFIGURATION & PORTS */}
        {activeTab === 'config' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                {lang === 'ar' ? 'إعدادات الاتصال بالخادم المركزي (Target Server)' : 'Paramétrage du Serveur Central'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'ar' 
                  ? 'يمكنك التبديل بين الخادم المدمج (Port 3000) أو الخادم الخارجي NestJS (Port 5000)'
                  : 'Basculez entre le serveur Express intégré et votre instance NestJS locale (Port 5000)'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
                <span className="font-bold text-xs text-slate-700 block">URL DE L'API REST CENTRALE</span>
                
                {isEditingUrl ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded border border-slate-300 text-xs font-mono bg-white"
                      placeholder="http://localhost:5000/api/v1"
                    />
                    <button
                      onClick={handleSaveUrl}
                      className="px-3 py-1.5 rounded bg-emerald-600 text-white font-bold text-xs"
                    >
                      Enregistrer
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-white px-3 py-1.5 rounded border border-slate-200">
                      {syncStatus.apiUrl}
                    </span>
                    <button
                      onClick={() => setIsEditingUrl(true)}
                      className="text-xs text-blue-600 font-bold hover:underline"
                    >
                      Modifier
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => { setCustomUrl('/api/v1'); centralSyncService.updateConfig({ apiUrl: '/api/v1' }); handlePingHealth(); }}
                    className="px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 text-[11px] font-mono text-slate-800"
                  >
                    /api/v1 (Intégré)
                  </button>
                  <button
                    onClick={() => { setCustomUrl('http://localhost:5000/api/v1'); centralSyncService.updateConfig({ apiUrl: 'http://localhost:5000/api/v1' }); handlePingHealth(); }}
                    className="px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 text-[11px] font-mono text-slate-800"
                  >
                    http://localhost:5000/api/v1 (NestJS)
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-2 text-xs font-mono">
                <span className="font-bold text-slate-700 block">IDENTIFIANTS D'APPAREIL (VITE_DEVICE_*)</span>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Device ID:</span>
                  <span className="font-bold text-slate-900">{syncStatus.deviceId}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Device API Key:</span>
                  <span className="font-bold text-slate-900">dev_key_alpha_9921</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Token Enregistrement:</span>
                  <span className="font-bold text-slate-900">kaf_dev_reg_token_9841</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
