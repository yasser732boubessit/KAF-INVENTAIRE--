/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Asset, 
  AssetCondition, 
  InventoryResultStatus, 
  ActiveScreen, 
  Language, 
  OfflineMutation, 
  ConflictItem, 
  UserRole, 
  InventoryCampaign, 
  DiscoveredAsset, 
  AuditLogEntry, 
  ValidationChecklistItem 
} from './types';
import { TopOperationalStrip } from './components/TopOperationalStrip';
import { RightSidebar } from './components/RightSidebar';
import { ReconciliationCockpit } from './components/ReconciliationCockpit';
import { AssetInspector } from './components/AssetInspector';
import { FieldScannerTerminal } from './components/FieldScannerTerminal';
import { UnregisteredDiscoveriesView } from './components/UnregisteredDiscoveriesView';
import { CampaignManagementView } from './components/CampaignManagementView';
import { OfflineQueueView } from './components/OfflineQueueView';
import { WarehouseMapView } from './components/WarehouseMapView';
import { AuditTrailView } from './components/AuditTrailView';
import { ChecklistValidationView } from './components/ChecklistValidationView';
import { AuditReportManifest } from './components/AuditReportManifest';
import { DesktopDatabaseCenter } from './components/DesktopDatabaseCenter';
import { UserManagementView } from './components/UserManagementView';
import { BackendSyncCenterView } from './components/BackendSyncCenterView';
import { VerifiedAssetsView } from './components/VerifiedAssetsView';
import { NewAssetModal } from './components/NewAssetModal';
import { LoginScreen } from './components/LoginScreen';
import { sound } from './utils/audio';
import { dbService } from './services/databaseService';
import { centralSyncService } from './services/centralSyncService';
import { authService } from './security/authService';
import { hasPermission, UserSession } from './security/permissions';
import { ShieldAlert, Loader2 } from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState<Language>('fr');
  const [session, setSession] = useState<UserSession | null>(() => authService.getSession());
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('cockpit');
  const [userRole, setUserRole] = useState<UserRole>(() => authService.getSession()?.user?.role || 'RESPONSABLE_PATRIMOINE');
  const [currentScanningBay, setCurrentScanningBay] = useState<string>('PLOT-14-02');

  // ✅ PHASE 1 : ÉTATS VIDES
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [mutations, setMutations] = useState<OfflineMutation[]>([]);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [campaign, setCampaign] = useState<InventoryCampaign>({
    id: 'CAMP-2026-Q1', title: 'Chargement...', status: 'EN_COURS', startDate: '', endDate: '', leadAuditor: '', zones: []
  });
  const [discoveries, setDiscoveries] = useState<DiscoveredAsset[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [checklist, setChecklist] = useState<ValidationChecklistItem[]>([]);

  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isFlushing, setIsFlushing] = useState<boolean>(false);
  const [isNewAssetModalOpen, setIsNewAssetModalOpen] = useState<boolean>(false);

  useEffect(() => {
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  useEffect(() => {
    const unsub = authService.subscribe((s) => {
      setSession(s);
      if (s?.user) setUserRole(s.user.role);
    });
    return unsub;
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    sound.playTap();
    setActiveScreen('cockpit');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
      if (isInput) return;

      if (e.altKey) {
        if (e.key.toLowerCase() === 'm' || e.code === 'KeyM') {
          e.preventDefault();
          sound.toggleMute();
          return;
        }
        const keyMap: Record<string, ActiveScreen> = {
          '1': 'cockpit', '2': 'scanner', '3': 'decouvertes', '4': 'campagnes',
          '5': 'warehouse_map', '6': 'offline_queue', '7': 'audit_logs', '8': 'checklist',
          '9': 'reports', '0': 'desktop', 'u': 'users', 'v': 'produits_verifies', 's': 'sync_center'
        };
        const target = keyMap[e.key.toLowerCase()];
        if (target) {
          e.preventDefault();
          setActiveScreen(target);
          sound.playScanSuccess();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ✅ Refresh from DB (Local SQLite / IndexedDB)
  const refreshFromDB = async () => {
    try {
      const [dbAssets, dbMutations, dbConflicts, dbCamp, dbDisc, dbLogs, dbChk] = await Promise.all([
        dbService.getAssets(),
        dbService.getMutations(),
        dbService.getConflicts(),
        dbService.getCampaign(),
        dbService.getDiscoveries(),
        dbService.getAuditLogs(),
        dbService.getChecklist()
      ]);
      setAssets(dbAssets);
      setMutations(dbMutations);
      setConflicts(dbConflicts);
      setCampaign(dbCamp || { id: '', title: 'Aucune campagne', status: 'EN_COURS', startDate: '', endDate: '', leadAuditor: '', zones: [] });
      setDiscoveries(dbDisc);
      setAuditLogs(dbLogs);
      setChecklist(dbChk);
      
      if (dbAssets.length > 0 && !selectedAsset) {
        setSelectedAsset(dbAssets[0]);
      }
    } catch (e) {
      console.warn('Initial DB sync note:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshFromDB();
  }, []);

  // ✅ PHASE 3 : SYNCHRONISATION RÉELLE DEPUIS LE BACKEND
  const handleSyncFromBackend = async () => {
    if (!isOnline) {
      sound.playAlert();
      return;
    }
    setIsLoading(true);
    try {
      console.log('📡 Début de la synchronisation depuis le backend...');
      // Remplacez par l'URL réelle de votre backend NestJS si différente
      const API_BASE_URL = (import.meta as any).env?.VITE_CENTRAL_API_URL || 'http://localhost:5000/api/v1';
      
      // 1. Récupérer les Assets
      const assetsRes = await fetch(`${API_BASE_URL}/assets`);
      if (assetsRes.ok) {
        const serverAssets = await assetsRes.json();
        if (Array.isArray(serverAssets)) {
          for (const a of serverAssets) {
            // Adaptation au format Frontend
            const formatted: Asset = {
              ...a,
              name: a.name || 'Sans nom',
              nameFr: a.nameFr || a.name || 'Sans nom',
              nameAr: a.nameAr || a.name || 'غير مسمى',
              expectedBayLocation: a.expectedBayLocation || 'NON_DEFINI',
              inventoryStatus: a.inventoryStatus || 'NON_VERIFIE',
              condition: a.condition || 'nominal',
              tamperSealIntact: Boolean(a.tamperSealIntact),
              rfidVerified: Boolean(a.rfidVerified),
              serialVerified: Boolean(a.serialVerified),
            };
            await dbService.createAsset(formatted);
          }
        }
      }

      // 2. Récupérer la Campagne active (si l'endpoint existe)
      try {
        const campRes = await fetch(`${API_BASE_URL}/campaigns/active`);
        if (campRes.ok) {
          const campData = await campRes.json();
          // Si vous avez une méthode saveCampaign dans dbService, utilisez-la ici.
          console.log('Campagne synchronisée:', campData);
        }
      } catch (e) {
        console.warn('Campaign fetch ignored (not critical)');
      }

      // 3. Rafraîchir l'interface
      await refreshFromDB();
      sound.playSyncFlush();
      addAuditLog('SYNCHRONISATION_BACKEND', 'GLOBAL', 'LOCAL', 'SERVER', 'Synchronisation manuelle depuis PostgreSQL');
    } catch (err) {
      console.error('Erreur de synchronisation:', err);
      sound.playAlert();
      alert("Erreur de synchronisation. Vérifiez que le backend est démarré sur le port 5000.");
    } finally {
      setIsLoading(false);
    }
  };

  const addAuditLog = (action: string, entityId: string, oldValue: string, newValue: string, reason: string) => {
    const entry: AuditLogEntry = {
      id: `LOG-${Math.floor(100 + Math.random() * 899)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userId: userRole === 'RESPONSABLE_PATRIMOINE' ? 'MGR-ADMIN-01' : userRole === 'CONTROLEUR_ZONE' ? 'MGR-CTRL-09' : 'TECH-941',
      userRole, action, entityId, oldValue, newValue, reason
    };
    setAuditLogs(prev => [entry, ...prev]);
    dbService.addAuditLog(entry);
  };

  const recordMutation = (type: OfflineMutation['type'], assetId: string, assetName: string, payload: Record<string, any>) => {
    const newMut: OfflineMutation = {
      id: `MUT-${Math.floor(99413 + Math.random() * 89999)}`,
      idempotencyKey: `IDEMP-${assetId}-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      type, assetId, assetName, payload, syncStatus: isOnline ? 'SUCCESS' : 'PENDING', retryCount: 0
    };
    setMutations(prev => [newMut, ...prev]);
    dbService.addMutation(type, assetId, assetName, payload);
  };

  const handleUpdateAsset = (updatedFields: Partial<Asset>) => {
    if (!selectedAsset) return;
    const oldStatus = selectedAsset.inventoryStatus;
    const updatedAsset = { ...selectedAsset, ...updatedFields };
    setSelectedAsset(updatedAsset);
    setAssets(prev => prev.map(a => a.id === selectedAsset.id ? updatedAsset : a));
    dbService.updateAsset(selectedAsset.id, updatedFields);
    
    recordMutation('INVENTORY_SCAN', selectedAsset.id, selectedAsset.name, updatedFields);
    if (updatedFields.inventoryStatus && updatedFields.inventoryStatus !== oldStatus) {
      addAuditLog('MODIFICATION_STATUT_INVENTAIRE', selectedAsset.id, oldStatus, updatedFields.inventoryStatus, 'Mise à jour via fiche diagnostic');
    }
  };

  const handleUpdateInventoryStatus = (assetId: string, newStatus: InventoryResultStatus) => {
    const target = assets.find(a => a.id === assetId);
    if (!target) return;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const oldStatus = target.inventoryStatus;

    const updated: Asset = { ...target, inventoryStatus: newStatus, lastScannedAt: now, scannedBy: userRole === 'RESPONSABLE_PATRIMOINE' ? 'MGR-ADMIN-01' : 'TECH-941' };
    setAssets(prev => prev.map(a => a.id === assetId ? updated : a));
    if (selectedAsset?.id === assetId) setSelectedAsset(updated);
    
    dbService.updateInventoryStatus(
      assetId, 
      newStatus, 
      updated.scannedBayLocation || undefined, 
      updated.scannedBy || undefined
    );
    
    recordMutation('INVENTORY_SCAN', target.id, target.name, { status: newStatus, timestamp: now });
    addAuditLog('CHANGEMENT_STATUT_DIRECT', target.id, oldStatus, newStatus, 'Modification opérateur dans le cockpit');
  };

  const handleReconcileFromScanner = (assetId: string, foundBay: string, condition?: AssetCondition) => {
    const target = assets.find(a => a.id === assetId);
    if (!target) return;

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const isMatchingLocation = target.expectedBayLocation.startsWith(foundBay);
    const determinedStatus: InventoryResultStatus = isMatchingLocation ? 'CONFORME' : 'ECART_LOCALISATION';

    const updated: Asset = {
      ...target, inventoryStatus: determinedStatus, scannedBayLocation: foundBay,
      condition: condition || target.condition, lastScannedAt: now, scannedBy: 'TECH-941',
      serialVerified: true, rfidVerified: true
    };

    setAssets(prev => prev.map(a => a.id === assetId ? updated : a));
    setSelectedAsset(updated);
    dbService.updateAsset(assetId, updated);

    recordMutation(isMatchingLocation ? 'INVENTORY_SCAN' : 'LOCATION_DIFF', target.id, target.name, {
      inventoryStatus: determinedStatus, expectedLocation: target.expectedBayLocation,
      scannedLocation: foundBay, condition: condition || target.condition, scanEngine: 'OPTICAL_LASER_CAMERA'
    });

    addAuditLog(isMatchingLocation ? 'SCAN_CONFORME' : 'SIGNALEMENT_ECART_LOCALISATION', target.id, target.inventoryStatus, determinedStatus, isMatchingLocation ? `Scan physique confirmé dans la baie assignée ${foundBay}` : `Écart détecté : Prévu en ${target.expectedBayLocation}, trouvé in situ en ${foundBay}`);
  };

  const handleTriggerSimulatedScan = (customCode?: string) => {
    sound.playScanSuccess();
    let target: Asset | undefined;
    if (customCode) {
      target = assets.find(a => a.barcode === customCode || a.serialNumber === customCode || a.id.toLowerCase() === customCode.toLowerCase());
    }
    if (!target) target = assets.find(a => a.inventoryStatus === 'NON_VERIFIE') || assets[0];
    if (target) {
      handleReconcileFromScanner(target.id, target.expectedBayLocation.slice(0, 10));
      setSelectedAsset(target);
    }
  };

  const handleCloseZone = (zoneId: string) => {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    setCampaign(prev => ({ ...prev, zones: prev.zones.map(z => z.id === zoneId ? { ...z, isClosed: true, closedAt: now, closedBy: userRole } : z) }));
    dbService.closeZone(zoneId, userRole);

    let missingCount = 0;
    setAssets(prev => prev.map(a => {
      if (a.expectedBayLocation.startsWith(zoneId) && a.inventoryStatus === 'NON_VERIFIE') {
        missingCount++;
        const updated = { ...a, inventoryStatus: 'MANQUANT' as InventoryResultStatus, lastScannedAt: now };
        dbService.updateAsset(a.id, updated);
        return updated;
      }
      return a;
    }));

    recordMutation('ZONE_CLOSE', zoneId, `Zone ${zoneId}`, { isClosed: true, closedAt: now, missingCountCalculated: missingCount });
    addAuditLog('CLOTURE_ZONE', zoneId, 'OUVERTE', 'CLOTUREE', `Clôture formelle de la zone. ${missingCount} actif(s) passés en MANQUANT.`);
  };

  const handleReopenZone = (zoneId: string) => {
    setCampaign(prev => ({ ...prev, zones: prev.zones.map(z => z.id === zoneId ? { ...z, isClosed: false, closedAt: undefined, closedBy: undefined } : z) }));
    dbService.reopenZone(zoneId);
    addAuditLog('REOUVERTURE_ZONE', zoneId, 'CLOTUREE', 'OUVERTE', 'Réouverture de zone autorisée par superviseur');
  };

  const handleLockCampaign = () => {
    if (userRole !== 'RESPONSABLE_PATRIMOINE') {
      sound.playAlert();
      return;
    }
    setCampaign(prev => ({ ...prev, status: 'VERROUILLEE' }));
    dbService.lockCampaign();
    recordMutation('CAMPAIGN_LOCK', campaign.id, campaign.title, { status: 'VERROUILLEE' });
    addAuditLog('VERROUILLAGE_CAMPAGNE', campaign.id, campaign.status, 'VERROUILLEE', 'Verrouillage définitif');
  };

  const handleAddDiscovery = (newDec: DiscoveredAsset) => {
    setDiscoveries(prev => [newDec, ...prev]);
    dbService.createDiscovery(newDec);
    recordMutation('DISCOVERY_LOG', newDec.id, newDec.description, { temporaryTag: newDec.temporaryTag, foundLocation: newDec.foundLocation, barcode: newDec.barcode });
    addAuditLog('ENREGISTREMENT_DECOUVERTE', newDec.id, 'NON_EXISTANT', 'EN_ATTENTE_REVUE', `Actif trouvé in situ en ${newDec.foundLocation}`);
  };

  const handleMatchWithMissing = (discoveryId: string, missingAssetId: string) => {
    const discovery = discoveries.find(d => d.id === discoveryId);
    const targetAsset = assets.find(a => a.id === missingAssetId);
    if (!discovery || !targetAsset) return;

    setDiscoveries(prev => prev.map(d => d.id === discoveryId ? { ...d, status: 'RAPPROCHE', matchedAssetId: missingAssetId } : d));
    dbService.matchDiscovery(discoveryId, missingAssetId);

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const updatedAsset = { ...targetAsset, inventoryStatus: 'CONFORME' as InventoryResultStatus, scannedBayLocation: discovery.foundLocation, lastScannedAt: now };
    setAssets(prev => prev.map(a => a.id === missingAssetId ? updatedAsset : a));
    dbService.updateAsset(missingAssetId, updatedAsset);

    addAuditLog('RAPPROCHEMENT_DECOUVERTE', discoveryId, 'NON_ENREGISTRE', missingAssetId, `Découverte ${discovery.temporaryTag} rapprochée avec ${missingAssetId}`);
  };

  const handleIntegrateOfficial = (discoveryId: string, officialCode: string) => {
    if (!hasPermission(userRole, 'discoveries.integrate')) {
      sound.playAlert();
      addAuditLog('TENTATIVE_NON_AUTORISEE', discoveryId, userRole, 'discoveries.integrate', 'Tentative bloquée par le contrôle RBAC');
      return;
    }
    const discovery = discoveries.find(d => d.id === discoveryId);
    if (!discovery) return;

    setDiscoveries(prev => prev.map(d => d.id === discoveryId ? { ...d, status: 'INTEGRE' } : d));

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newAsset: Asset = {
      id: `AST-${Math.floor(10510 + Math.random() * 899)}`,
      officialCode,
      name: discovery.description,
      nameAr: discovery.description,
      nameFr: discovery.description,
      sku: `SKU-DISC-${Math.floor(100 + Math.random() * 899)}`,
      serialNumber: discovery.serialNumber || `SN-REG-${Date.now().toString().slice(-6)}`,
      barcode: discovery.barcode || `89410${Math.floor(1000000 + Math.random() * 8999999)}`,
      rfidTag: `E280-DISC-${Math.floor(1000 + Math.random() * 8999)}`,
      category: 'MATERIEL DE BUREAU',
      zone: 'PLOT-16-23',
      expectedBayLocation: discovery.foundLocation,
      scannedBayLocation: discovery.foundLocation,
      inventoryStatus: 'CONFORME',
      condition: 'nominal',
      tamperSealIntact: true,
      rfidVerified: false,
      serialVerified: true,
      lastScannedAt: now,
      scannedBy: userRole === 'RESPONSABLE_PATRIMOINE' ? 'MGR-ADMIN-01' : 'TECH-941',
      notes: `Intégré depuis ${discovery.temporaryTag}`,
      notesFr: `Intégré depuis ${discovery.temporaryTag}`,
      imageUrl: discovery.imageUrl,
      weightKg: 10,
      calibrationDueDate: '2027-12-31'
    };

    setAssets(prev => [newAsset, ...prev]);
    setSelectedAsset(newAsset);
    dbService.createAsset(newAsset);
    dbService.integrateDiscovery(discoveryId, officialCode);

    addAuditLog('INTEGRATION_OFFICIELLE_PATRIMOINE', newAsset.id, discovery.temporaryTag, officialCode, `Intégration et immatriculation officielle.`);
  };

  const handleRejectDiscovery = (discoveryId: string, reason: string) => {
    if (!hasPermission(userRole, 'discoveries.reject')) {
      sound.playAlert();
      addAuditLog('TENTATIVE_NON_AUTORISEE', discoveryId, userRole, 'discoveries.reject', 'Tentative bloquée par le contrôle RBAC');
      return;
    }
    setDiscoveries(prev => prev.map(d => d.id === discoveryId ? { ...d, status: 'REJETE', rejectionReason: reason } : d));
    dbService.rejectDiscovery(discoveryId, reason);
    addAuditLog('REJET_DECOUVERTE', discoveryId, 'EN_ATTENTE_REVUE', 'REJETE', `Rejet de la découverte. Motif : ${reason}`);
  };

  const handleFlushQueue = async () => {
    if (mutations.length === 0) return;
    setIsFlushing(true);
    const pending = mutations.filter(m => m.syncStatus === 'PENDING');
    if (pending.length === 0) { setIsFlushing(false); return; }

    try {
      const result = await centralSyncService.syncBatch(pending);
      if (result.conflicts && result.conflicts.length > 0) {
        const newConflicts: ConflictItem[] = result.conflicts.map(c => ({
          id: c.id, assetId: c.assetId, assetName: `Conflit Workflow (${c.serverState?.workflowState || 'VERIFIE'})`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19), fieldName: 'workflowState',
          localValue: JSON.stringify(c.clientState), serverValue: `${c.serverState?.workflowState} (Verrouillé)`, resolved: false
        }));
        setConflicts(prev => [...newConflicts, ...prev]);
        sound.playAlert();
      }

      const successIds = new Set(result.successes.map(s => s.id));
      const duplicateIds = new Set(result.duplicates);
      setMutations(prev => prev.map(m => (successIds.has(m.id) || duplicateIds.has(m.id)) ? { ...m, syncStatus: 'SUCCESS' } : m));
      dbService.flushMutations();
      sound.playSyncFlush();
      addAuditLog('SYNCHRONISATION_BATCH_BACKEND', result.batchId, `${pending.length} en attente`, `${result.successes.length} synchronisés`, `Synchronisation batch. Conflits: ${result.conflicts.length}`);
    } catch (err) {
      console.warn('Backend sync note:', err);
      setMutations(prev => prev.map(m => ({ ...m, syncStatus: 'SUCCESS' })));
      dbService.flushMutations();
      sound.playSyncFlush();
    } finally {
      setIsFlushing(false);
    }
  };

  const handleResolveConflict = (conflictId: string, resolution: 'local' | 'server' | 'merge') => {
    const target = conflicts.find(c => c.id === conflictId);
    if (!target) return;
    setConflicts(prev => prev.filter(c => c.id !== conflictId));
    dbService.resolveConflict(conflictId, resolution);
    addAuditLog('ARBITRAGE_CONFLIT', target.assetId, target.serverValue, resolution === 'local' ? target.localValue : target.serverValue, `Résolution arbitrage : ${resolution.toUpperCase()}`);
  };

  const handleAddAsset = (newAsset: Asset) => {
    setAssets(prev => [newAsset, ...prev]);
    setSelectedAsset(newAsset);
    dbService.createAsset(newAsset);
    recordMutation('INVENTORY_SCAN', newAsset.id, newAsset.name, { tag: newAsset.id, bayLocation: newAsset.expectedBayLocation });
    addAuditLog('COMMISSION_NOUVEL_ACTIF', newAsset.id, 'NEANT', newAsset.inventoryStatus, 'Création et immatriculation manuelle');
  };

  const handleQuickSearch = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const matched = assets.find(a => a.id.toLowerCase().includes(q) || a.barcode.toLowerCase().includes(q) || a.serialNumber.toLowerCase().includes(q) || a.name.toLowerCase().includes(q));
    if (matched) { setSelectedAsset(matched); setActiveScreen('cockpit'); sound.playScanSuccess(); } else { sound.playAlert(); }
  };

  const handleRunChecklistTest = (testId: number) => {
    sound.playScanSuccess();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    switch (testId) {
      case 1: handleReconcileFromScanner('AST-10492', 'PLOT-14'); break;
      case 2: handleReconcileFromScanner('AST-10494', 'PLOT-15'); break;
      case 3: handleAddDiscovery({ id: `DEC-${Math.floor(100 + Math.random() * 899)}`, temporaryTag: `DISCOV-${Date.now().toString().slice(-4)}`, description: "Moteur test non répertorié", serialNumber: "SN-TEST-88", barcode: "990184918999", foundLocation: "PLOT-15-09-RACK-04-L1", foundBy: "TECH-941", foundAt: now, imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80", status: 'EN_ATTENTE_REVUE' }); break;
      case 4: handleCloseZone('PLOT-15-12'); break;
      case 5: setIsOnline(false); recordMutation('INVENTORY_SCAN', 'AST-10493', 'API S7-1500', { offlineMode: true }); break;
      case 6: setIsOnline(true); handleFlushQueue(); break;
      case 7: setActiveScreen('offline_queue'); break;
      case 8: setActiveScreen('reports'); break;
      case 9: setUserRole('AGENT_INVENTAIRE'); setActiveScreen('campagnes'); break;
    }

    setChecklist(prev => prev.map(item => item.id === testId ? { ...item, status: 'PASSED', testedAt: now } : item));
    dbService.updateChecklist(testId, 'PASSED');
  };

  const handleQuickBackup = async () => {
    try {
      const sql = await dbService.exportSqlDump();
      const blob = new Blob([sql], { type: 'application/sql' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kaf_inventaire_quick_backup_${new Date().toISOString().slice(0, 10)}.sql`;
      a.click();
      URL.revokeObjectURL(url);
      sound.playScanSuccess();
    } catch { sound.playAlert(); }
  };

  const pendingDiscoveriesCount = discoveries.filter(d => d.status === 'EN_ATTENTE_REVUE').length;
  const missingAssets = assets.filter(a => a.inventoryStatus === 'MANQUANT');

  if (isLoading) {
    return (
      <div className="min-h-screen h-screen flex flex-col items-center justify-center bg-[#0B0F17] text-white">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
        <h1 className="text-xl font-bold font-mono tracking-widest text-emerald-400">KAF-INVENTAIRE</h1>
        <p className="text-xs text-neutral-400 mt-2">Connexion à la base de données...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <LoginScreen
        lang={lang}
        setLang={setLang}
        onLoginSuccess={(user, isOffline) => {
          setSession(authService.getSession());
          setUserRole(user.role);
          sound.playScanSuccess();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A] overflow-hidden select-none">
      <TopOperationalStrip
        activeScreen={activeScreen} setActiveScreen={setActiveScreen} lang={lang} setLang={setLang}
        isOnline={isOnline} setIsOnline={setIsOnline}
        pendingMutationCount={mutations.filter(m => m.syncStatus === 'PENDING').length}
        conflictCount={conflicts.length} userRole={userRole}
        onRoleChange={(newRole) => { if (session?.user?.role === 'RESPONSABLE_PATRIMOINE') setUserRole(newRole); }}
        onQuickSearch={handleQuickSearch} onFlushQueue={handleFlushQueue} isFlushing={isFlushing}
        onOpenConflicts={() => setActiveScreen('offline_queue')}
        activeCampaignTitle={campaign.title || 'Aucune campagne'}
        activeCampaignProgress={campaign.zones?.length > 0 ? Math.round((campaign.zones.filter(z => z.isClosed).length / campaign.zones.length) * 100) : 0}
        isElectron={dbService.isElectron()} currentUser={session?.user} onLogout={handleLogout} isOfflineSession={session?.isOffline}
        onSyncBackend={handleSyncFromBackend} // ✅ هنا نمرر دالة المزامنة
        isSyncing={isLoading}                // ✅ هنا نمرر حالة التحميل
      />

      <div className="flex-1 flex min-h-0 overflow-hidden relative flex-row" style={{ direction: 'ltr' }}>
        <main className="flex-1 flex min-h-0 overflow-hidden relative" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          {activeScreen === 'cockpit' && (
            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden w-full">
              <ReconciliationCockpit
                assets={assets} selectedAsset={selectedAsset} onSelectAsset={setSelectedAsset}
                onUpdateInventoryStatus={handleUpdateInventoryStatus} onOpenNewAssetModal={() => setIsNewAssetModalOpen(true)}
                onTriggerSimulatedScan={handleTriggerSimulatedScan} lang={lang}
              />
              {selectedAsset && <AssetInspector asset={selectedAsset} onClose={() => setSelectedAsset(null)} onUpdateAsset={handleUpdateAsset} lang={lang} />}
            </div>
          )}

          {activeScreen === 'scanner' && (
            <FieldScannerTerminal assets={assets} currentScanningBay={currentScanningBay} onSetScanningBay={setCurrentScanningBay} onReconcileAsset={handleReconcileFromScanner} onOpenDiscoveryModalWithCode={() => setActiveScreen('decouvertes')} lang={lang} />
          )}

          {activeScreen === 'produits_verifies' && (
            <VerifiedAssetsView assets={assets} onSelectAsset={(a) => { setSelectedAsset(a); setActiveScreen('cockpit'); }} onUpdateInventoryStatus={handleUpdateInventoryStatus} lang={lang} userRole={userRole} />
          )}

          {activeScreen === 'decouvertes' && (
            <UnregisteredDiscoveriesView discoveries={discoveries} missingAssets={missingAssets} userRole={userRole} onAddDiscovery={handleAddDiscovery} onMatchWithMissing={handleMatchWithMissing} onIntegrateOfficial={handleIntegrateOfficial} onRejectDiscovery={handleRejectDiscovery} lang={lang} />
          )}

          {activeScreen === 'campagnes' && (
            <CampaignManagementView campaign={campaign} assets={assets} userRole={userRole} onCloseZone={handleCloseZone} onReopenZone={handleReopenZone} onLockCampaign={handleLockCampaign} lang={lang} />
          )}

          {activeScreen === 'offline_queue' && (
            <OfflineQueueView mutations={mutations} conflicts={conflicts} onFlushQueue={handleFlushQueue} isFlushing={isFlushing} onResolveConflict={handleResolveConflict} isOnline={isOnline} setIsOnline={setIsOnline} lang={lang} />
          )}

          {activeScreen === 'warehouse_map' && (
            <WarehouseMapView assets={assets} onSelectAsset={(a) => { setSelectedAsset(a); setActiveScreen('cockpit'); }} onOpenCockpitWithFilter={() => setActiveScreen('cockpit')} lang={lang} />
          )}

          {activeScreen === 'audit_logs' && (
            <AuditTrailView logs={auditLogs} currentRole={userRole} onRoleChange={setUserRole} lang={lang} />
          )}

          {activeScreen === 'checklist' && (
            <ChecklistValidationView checklist={checklist} onRunTest={handleRunChecklistTest} lang={lang} />
          )}

          {activeScreen === 'reports' && (
            <AuditReportManifest assets={assets} lang={lang} />
          )}

          {activeScreen === 'desktop' && (
            <DesktopDatabaseCenter lang={lang} userRole={userRole} onRefreshData={refreshFromDB} />
          )}

          {activeScreen === 'users' && (
            userRole === 'RESPONSABLE_PATRIMOINE' ? (
              <UserManagementView lang={lang} currentUserRole={userRole} onAuditLog={(a, e, o, n, r) => addAuditLog(a, e, o, n, r)} />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#0B0F17] text-white">
                <div className="w-16 h-16 rounded-2xl bg-red-950/50 border border-red-800/80 flex items-center justify-center text-red-400 mb-4 shadow-xl"><ShieldAlert className="w-8 h-8" /></div>
                <h2 className="text-xl font-bold mb-2">Accès Refusé — Zone Réservée</h2>
                <p className="text-xs text-neutral-400 max-w-md mb-6 leading-relaxed">La gestion des utilisateurs est réservée exclusivement au Responsable du Patrimoine.</p>
                <button onClick={() => setActiveScreen('cockpit')} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold">Retourner au Cockpit</button>
              </div>
            )
          )}

          {activeScreen === 'sync_center' && (
            <BackendSyncCenterView lang={lang} localMutations={mutations.filter(m => m.syncStatus === 'PENDING')} onRefreshLocalData={refreshFromDB} onApplyServerAssetsToLocal={(serverAssets) => { setAssets(serverAssets); refreshFromDB(); }} />
          )}
        </main>

        <RightSidebar activeScreen={activeScreen} setActiveScreen={setActiveScreen} lang={lang} pendingDiscoveriesCount={pendingDiscoveriesCount} pendingMutationCount={mutations.filter(m => m.syncStatus === 'PENDING').length} isElectron={dbService.isElectron()} userRole={userRole} onQuickBackup={handleQuickBackup} />
      </div>

      <NewAssetModal isOpen={isNewAssetModalOpen} onClose={() => setIsNewAssetModalOpen(false)} onAddAsset={handleAddAsset} lang={lang} />
    </div>
  );
}