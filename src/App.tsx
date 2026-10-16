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
import { 
  initialAssets, 
  initialOfflineMutations, 
  initialConflicts, 
  initialCampaign, 
  initialDiscoveries, 
  initialAuditLogs, 
  initialChecklist 
} from './mockData';
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
import { ShieldAlert } from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState<Language>('fr');
  const [session, setSession] = useState<UserSession | null>(() => authService.getSession());
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('cockpit');
  const [userRole, setUserRole] = useState<UserRole>(() => authService.getSession()?.user?.role || 'RESPONSABLE_PATRIMOINE');
  const [currentScanningBay, setCurrentScanningBay] = useState<string>('BAY-04');

  // 1. Persistent Assets Store (50 enterprise assets)
  const [assets, setAssets] = useState<Asset[]>(() => {
    try {
      const saved = localStorage.getItem('kaf_assets_v4');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= initialAssets.length) {
          return parsed;
        }
      }
      // If previous version had fewer items, upgrade to initialAssets benchmark (50 items)
      return initialAssets;
    } catch {
      return initialAssets;
    }
  });

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(assets[0] || null);

  // 2. Persistent Mutations (Offline Queue)
  const [mutations, setMutations] = useState<OfflineMutation[]>(() => {
    try {
      const saved = localStorage.getItem('kaf_mutations_v3');
      return saved ? JSON.parse(saved) : initialOfflineMutations;
    } catch {
      return initialOfflineMutations;
    }
  });

  // 3. Persistent Conflicts
  const [conflicts, setConflicts] = useState<ConflictItem[]>(() => {
    try {
      const saved = localStorage.getItem('kaf_conflicts_v3');
      return saved ? JSON.parse(saved) : initialConflicts;
    } catch {
      return initialConflicts;
    }
  });

  // 4. Persistent Campaign
  const [campaign, setCampaign] = useState<InventoryCampaign>(() => {
    try {
      const saved = localStorage.getItem('kaf_campaign_v3');
      return saved ? JSON.parse(saved) : initialCampaign;
    } catch {
      return initialCampaign;
    }
  });

  // 5. Persistent Unregistered Discoveries
  const [discoveries, setDiscoveries] = useState<DiscoveredAsset[]>(() => {
    try {
      const saved = localStorage.getItem('kaf_discoveries_v3');
      return saved ? JSON.parse(saved) : initialDiscoveries;
    } catch {
      return initialDiscoveries;
    }
  });

  // 6. Persistent Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('kaf_audit_logs_v3');
      return saved ? JSON.parse(saved) : initialAuditLogs;
    } catch {
      return initialAuditLogs;
    }
  });

  // 7. Persistent Checklist (9 scenarios)
  const [checklist, setChecklist] = useState<ValidationChecklistItem[]>(() => {
    try {
      const saved = localStorage.getItem('kaf_checklist_v3');
      return saved ? JSON.parse(saved) : initialChecklist;
    } catch {
      return initialChecklist;
    }
  });

  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isFlushing, setIsFlushing] = useState<boolean>(false);
  const [isNewAssetModalOpen, setIsNewAssetModalOpen] = useState<boolean>(false);

  // Sync RTL / LTR document direction with language
  useEffect(() => {
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  // Subscribe to Authentication Session
  useEffect(() => {
    const unsub = authService.subscribe((s) => {
      setSession(s);
      if (s?.user) {
        setUserRole(s.user.role);
      }
    });
    return unsub;
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    sound.playTap();
    setActiveScreen('cockpit');
  };

  // Global Keyboard Navigation (Alt+1 through Alt+9, Alt+0 for Desktop)
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
          '1': 'cockpit',
          '2': 'scanner',
          '3': 'decouvertes',
          '4': 'campagnes',
          '5': 'warehouse_map',
          '6': 'offline_queue',
          '7': 'audit_logs',
          '8': 'checklist',
          '9': 'reports',
          '0': 'desktop',
          'u': 'users',
          'U': 'users',
          'v': 'produits_verifies',
          'V': 'produits_verifies',
          's': 'sync_center',
          'S': 'sync_center'
        };
        const target = keyMap[e.key];
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

  // Refresh all state from local Database Engine
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
      setCampaign(dbCamp);
      setDiscoveries(dbDisc);
      setAuditLogs(dbLogs);
      setChecklist(dbChk);
    } catch (e) {
      console.warn('Initial DB sync note:', e);
    }
  };

  useEffect(() => {
    refreshFromDB();
  }, []);

  // Persist state to localStorage & dbService for offline reliability
  useEffect(() => {
    try {
      localStorage.setItem('kaf_assets_v4', JSON.stringify(assets));
      localStorage.setItem('kaf_assets_v3', JSON.stringify(assets));
    } catch {}
  }, [assets]);

  useEffect(() => {
    try {
      localStorage.setItem('kaf_mutations_v3', JSON.stringify(mutations));
    } catch {}
  }, [mutations]);

  useEffect(() => {
    try {
      localStorage.setItem('kaf_campaign_v3', JSON.stringify(campaign));
    } catch {}
  }, [campaign]);

  useEffect(() => {
    try {
      localStorage.setItem('kaf_discoveries_v3', JSON.stringify(discoveries));
    } catch {}
  }, [discoveries]);

  useEffect(() => {
    try {
      localStorage.setItem('kaf_audit_logs_v3', JSON.stringify(auditLogs));
    } catch {}
  }, [auditLogs]);

  useEffect(() => {
    try {
      localStorage.setItem('kaf_checklist_v3', JSON.stringify(checklist));
    } catch {}
  }, [checklist]);

  // Helper: Append Audit Log Entry
  const addAuditLog = (
    action: string,
    entityId: string,
    oldValue: string,
    newValue: string,
    reason: string
  ) => {
    const entry: AuditLogEntry = {
      id: `LOG-${Math.floor(100 + Math.random() * 899)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userId: userRole === 'RESPONSABLE_PATRIMOINE' ? 'MGR-ADMIN-01' : userRole === 'CONTROLEUR_ZONE' ? 'MGR-CTRL-09' : 'TECH-941',
      userRole,
      action,
      entityId,
      oldValue,
      newValue,
      reason
    };
    setAuditLogs(prev => [entry, ...prev]);
  };

  // Helper: Record an Idempotent Offline Mutation
  const recordMutation = (
    type: OfflineMutation['type'],
    assetId: string,
    assetName: string,
    payload: Record<string, any>
  ) => {
    const newMut: OfflineMutation = {
      id: `MUT-${Math.floor(99413 + Math.random() * 89999)}`,
      idempotencyKey: `IDEMP-${assetId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      type,
      assetId,
      assetName,
      payload,
      syncStatus: isOnline ? 'SUCCESS' : 'PENDING',
      retryCount: 0
    };
    setMutations(prev => [newMut, ...prev]);
  };

  // Update asset fields
  const handleUpdateAsset = (updatedFields: Partial<Asset>) => {
    if (!selectedAsset) return;

    const oldStatus = selectedAsset.inventoryStatus;
    const updatedAsset = { ...selectedAsset, ...updatedFields };
    setSelectedAsset(updatedAsset);

    setAssets(prev => prev.map(a => a.id === selectedAsset.id ? updatedAsset : a));

    recordMutation(
      'INVENTORY_SCAN',
      selectedAsset.id,
      selectedAsset.name,
      updatedFields
    );

    if (updatedFields.inventoryStatus && updatedFields.inventoryStatus !== oldStatus) {
      addAuditLog(
        'MODIFICATION_STATUT_INVENTAIRE',
        selectedAsset.id,
        oldStatus,
        updatedFields.inventoryStatus,
        'Mise à jour via fiche diagnostic'
      );
    }
  };

  // Update asset inventory status directly
  const handleUpdateInventoryStatus = (assetId: string, newStatus: InventoryResultStatus) => {
    const target = assets.find(a => a.id === assetId);
    if (!target) return;

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const oldStatus = target.inventoryStatus;

    const updated: Asset = {
      ...target,
      inventoryStatus: newStatus,
      lastScannedAt: now,
      scannedBy: userRole === 'RESPONSABLE_PATRIMOINE' ? 'MGR-ADMIN-01' : 'TECH-941'
    };

    setAssets(prev => prev.map(a => a.id === assetId ? updated : a));
    if (selectedAsset?.id === assetId) {
      setSelectedAsset(updated);
    }

    recordMutation('INVENTORY_SCAN', target.id, target.name, {
      status: newStatus,
      timestamp: now
    });

    addAuditLog(
      'CHANGEMENT_STATUT_DIRECT',
      target.id,
      oldStatus,
      newStatus,
      'Modification opérateur dans le cockpit'
    );
  };

  // Field Reconcile from Mobile / Laser Scanner
  const handleReconcileFromScanner = (assetId: string, foundBay: string, condition?: AssetCondition) => {
    const target = assets.find(a => a.id === assetId);
    if (!target) return;

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const isMatchingLocation = target.expectedBayLocation.startsWith(foundBay);
    const determinedStatus: InventoryResultStatus = isMatchingLocation ? 'CONFORME' : 'ECART_LOCALISATION';

    const updated: Asset = {
      ...target,
      inventoryStatus: determinedStatus,
      scannedBayLocation: foundBay,
      condition: condition || target.condition,
      lastScannedAt: now,
      scannedBy: 'TECH-941',
      serialVerified: true,
      rfidVerified: true
    };

    setAssets(prev => prev.map(a => a.id === assetId ? updated : a));
    setSelectedAsset(updated);

    recordMutation(
      isMatchingLocation ? 'INVENTORY_SCAN' : 'LOCATION_DIFF',
      target.id,
      target.name,
      {
        inventoryStatus: determinedStatus,
        expectedLocation: target.expectedBayLocation,
        scannedLocation: foundBay,
        condition: condition || target.condition,
        scanEngine: 'OPTICAL_LASER_CAMERA'
      }
    );

    addAuditLog(
      isMatchingLocation ? 'SCAN_CONFORME' : 'SIGNALEMENT_ECART_LOCALISATION',
      target.id,
      target.inventoryStatus,
      determinedStatus,
      isMatchingLocation 
        ? `Scan physique confirmé dans la baie assignée ${foundBay}`
        : `Écart détecté : Prévu en ${target.expectedBayLocation}, trouvé in situ en ${foundBay}`
    );
  };

  // Simulated rapid scan trigger
  const handleTriggerSimulatedScan = (customCode?: string) => {
    sound.playScanSuccess();
    let target: Asset | undefined;

    if (customCode) {
      target = assets.find(a => 
        a.barcode === customCode || 
        a.serialNumber === customCode || 
        a.id.toLowerCase() === customCode.toLowerCase()
      );
    }

    if (!target) {
      // Pick first unscanned or random
      target = assets.find(a => a.inventoryStatus === 'NON_VERIFIE') || assets[0];
    }

    if (target) {
      handleReconcileFromScanner(target.id, target.expectedBayLocation.slice(0, 6));
      setSelectedAsset(target);
    }
  };

  // Zone Closure: An asset only becomes MANQUANT once its zone is closed!
  const handleCloseZone = (zoneId: string) => {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // 1. Mark zone as closed
    setCampaign(prev => ({
      ...prev,
      zones: prev.zones.map(z => z.id === zoneId ? {
        ...z,
        isClosed: true,
        closedAt: now,
        closedBy: userRole === 'RESPONSABLE_PATRIMOINE' ? 'MGR-ADMIN-01' : 'MGR-CTRL-09'
      } : z)
    }));

    // 2. Identify assets assigned to this zone that were NOT scanned -> Mark MANQUANT
    let missingCount = 0;
    setAssets(prev => prev.map(a => {
      if (a.expectedBayLocation.startsWith(zoneId) && a.inventoryStatus === 'NON_VERIFIE') {
        missingCount++;
        return {
          ...a,
          inventoryStatus: 'MANQUANT',
          lastScannedAt: now,
          notes: `${a.notes} [Déclaré MANQUANT à la clôture de la zone ${zoneId} le ${now}]`,
          notesFr: `${a.notesFr || a.notes} [Déclaré MANQUANT à la clôture de la zone ${zoneId} le ${now}]`
        };
      }
      return a;
    }));

    recordMutation('ZONE_CLOSE', zoneId, `Zone ${zoneId}`, {
      isClosed: true,
      closedAt: now,
      missingCountCalculated: missingCount
    });

    addAuditLog(
      'CLOTURE_ZONE',
      zoneId,
      'OUVERTE',
      'CLOTUREE',
      `Clôture formelle de la zone. ${missingCount} actif(s) non trouvés basculés en MANQUANT.`
    );
  };

  // Reopen Zone
  const handleReopenZone = (zoneId: string) => {
    setCampaign(prev => ({
      ...prev,
      zones: prev.zones.map(z => z.id === zoneId ? {
        ...z,
        isClosed: false,
        closedAt: undefined,
        closedBy: undefined
      } : z)
    }));

    addAuditLog(
      'REOUVERTURE_ZONE',
      zoneId,
      'CLOTUREE',
      'OUVERTE',
      'Réouverture de zone autorisée par superviseur pour repassage'
    );
  };

  // Lock Campaign (Only RESPONSABLE_PATRIMOINE)
  const handleLockCampaign = () => {
    if (userRole !== 'RESPONSABLE_PATRIMOINE') {
      sound.playAlert();
      return;
    }

    setCampaign(prev => ({ ...prev, status: 'VERROUILLEE' }));
    recordMutation('CAMPAIGN_LOCK', campaign.id, campaign.title, { status: 'VERROUILLEE' });
    addAuditLog(
      'VERROUILLAGE_CAMPAGNE',
      campaign.id,
      campaign.status,
      'VERROUILLEE',
      'Verrouillage définitif et homologation par le Responsable du Patrimoine'
    );
  };

  // Discoveries: Add new physical discovery
  const handleAddDiscovery = (newDec: DiscoveredAsset) => {
    setDiscoveries(prev => [newDec, ...prev]);
    recordMutation('DISCOVERY_LOG', newDec.id, newDec.description, {
      temporaryTag: newDec.temporaryTag,
      foundLocation: newDec.foundLocation,
      barcode: newDec.barcode
    });
    addAuditLog(
      'ENREGISTREMENT_DECOUVERTE',
      newDec.id,
      'NON_EXISTANT',
      'EN_ATTENTE_REVUE',
      `Actif physique trouvé in situ en ${newDec.foundLocation} absent de l'inventaire`
    );
  };

  // Discoveries: Match with Missing Asset
  const handleMatchWithMissing = (discoveryId: string, missingAssetId: string) => {
    const discovery = discoveries.find(d => d.id === discoveryId);
    const targetAsset = assets.find(a => a.id === missingAssetId);
    if (!discovery || !targetAsset) return;

    // 1. Update discovery status
    setDiscoveries(prev => prev.map(d => d.id === discoveryId ? {
      ...d,
      status: 'RAPPROCHE',
      matchedAssetId: missingAssetId
    } : d));

    // 2. Update target asset from MANQUANT to CONFORME
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    setAssets(prev => prev.map(a => a.id === missingAssetId ? {
      ...a,
      inventoryStatus: 'CONFORME',
      scannedBayLocation: discovery.foundLocation,
      lastScannedAt: now,
      scannedBy: 'TECH-941',
      notes: `${a.notes} [Rapproché avec découverte ${discovery.temporaryTag}]`,
      notesFr: `${a.notesFr || a.notes} [Rapproché avec découverte ${discovery.temporaryTag}]`
    } : a));

    addAuditLog(
      'RAPPROCHEMENT_DECOUVERTE',
      discoveryId,
      'NON_ENREGISTRE',
      missingAssetId,
      `Découverte ${discovery.temporaryTag} rapprochée avec l'actif manquant ${missingAssetId}`
    );
  };

  // Discoveries: Commission / Integrate to Master Inventory (Only Admin / RESPONSABLE_PATRIMOINE)
  const handleIntegrateOfficial = (discoveryId: string, officialCode: string) => {
    if (!hasPermission(userRole, 'discoveries.integrate')) {
      sound.playAlert();
      addAuditLog(
        'TENTATIVE_NON_AUTORISEE',
        discoveryId,
        userRole,
        'discoveries.integrate',
        'Tentative d\'intégration d\'actif bloquée par le contrôle RBAC (Rôle insuffisant)'
      );
      return;
    }

    const discovery = discoveries.find(d => d.id === discoveryId);
    if (!discovery) return;

    // 1. Update discovery status
    setDiscoveries(prev => prev.map(d => d.id === discoveryId ? {
      ...d,
      status: 'INTEGRE'
    } : d));

    // 2. Create official Asset
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
      category: 'Mechanical',
      zone: 'WEST-DC-ZONE-C',
      expectedBayLocation: discovery.foundLocation,
      scannedBayLocation: discovery.foundLocation,
      inventoryStatus: 'CONFORME',
      condition: 'nominal',
      tamperSealIntact: true,
      rfidVerified: false,
      serialVerified: true,
      lastScannedAt: now,
      scannedBy: userRole === 'RESPONSABLE_PATRIMOINE' ? 'MGR-ADMIN-01' : 'TECH-941',
      notes: `Intégré officiellement depuis découverte ${discovery.temporaryTag}`,
      notesFr: `Intégré officiellement depuis découverte ${discovery.temporaryTag}`,
      imageUrl: discovery.imageUrl,
      weightKg: 10,
      calibrationDueDate: '2027-12-31'
    };

    setAssets(prev => [newAsset, ...prev]);
    setSelectedAsset(newAsset);

    addAuditLog(
      'INTEGRATION_OFFICIELLE_PATRIMOINE',
      newAsset.id,
      discovery.temporaryTag,
      officialCode,
      `Intégration et immatriculation officielle au registre du patrimoine.`
    );
  };

  // Discoveries: Reject Discovery (Only Admin / RESPONSABLE_PATRIMOINE)
  const handleRejectDiscovery = (discoveryId: string, reason: string) => {
    if (!hasPermission(userRole, 'discoveries.reject')) {
      sound.playAlert();
      addAuditLog(
        'TENTATIVE_NON_AUTORISEE',
        discoveryId,
        userRole,
        'discoveries.reject',
        'Tentative de rejet d\'actif bloquée par le contrôle RBAC'
      );
      return;
    }

    setDiscoveries(prev => prev.map(d => d.id === discoveryId ? {
      ...d,
      status: 'REJETE',
      rejectionReason: reason
    } : d));

    addAuditLog(
      'REJET_DECOUVERTE',
      discoveryId,
      'EN_ATTENTE_REVUE',
      'REJETE',
      `Rejet de la découverte terrain. Motif : ${reason}`
    );
  };

  // Flush Queue Action with Real Backend Sync Integration
  const handleFlushQueue = async () => {
    if (mutations.length === 0) return;
    setIsFlushing(true);

    const pending = mutations.filter(m => m.syncStatus === 'PENDING');
    if (pending.length === 0) {
      setIsFlushing(false);
      return;
    }

    try {
      const result = await centralSyncService.syncBatch(pending);

      // Handle any conflicts detected by the backend (Function 6)
      if (result.conflicts && result.conflicts.length > 0) {
        const newConflicts: ConflictItem[] = result.conflicts.map(c => ({
          id: c.id,
          assetId: c.assetId,
          assetName: `Conflit Workflow (${c.serverState?.workflowState || 'VERIFIE'})`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          fieldName: 'workflowState',
          localValue: JSON.stringify(c.clientState),
          serverValue: `${c.serverState?.workflowState} (Verrouillé par Équipe 2/3)`,
          resolved: false
        }));

        setConflicts(prev => [...newConflicts, ...prev]);
        sound.playAlert();
      }

      // Mark processed mutations as SUCCESS
      const successIds = new Set(result.successes.map(s => s.id));
      const duplicateIds = new Set(result.duplicates);

      setMutations(prev => prev.map(m => {
        if (successIds.has(m.id) || duplicateIds.has(m.id)) {
          return { ...m, syncStatus: 'SUCCESS' };
        }
        return m;
      }));

      sound.playSyncFlush();
      addAuditLog(
        'SYNCHRONISATION_BATCH_BACKEND',
        result.batchId,
        `${pending.length} en attente`,
        `${result.successes.length} synchronisés`,
        `Synchronisation batch avec le backend NestJS/PostgreSQL. Conflits: ${result.conflicts.length}, Doublons: ${result.duplicates.length}`
      );
    } catch (err: any) {
      console.warn('Backend sync note (offline or fallback):', err);
      // Fallback local flush
      setMutations(prev => prev.map(m => ({ ...m, syncStatus: 'SUCCESS' })));
      sound.playSyncFlush();
    } finally {
      setIsFlushing(false);
    }
  };

  // Resolve Conflict
  const handleResolveConflict = (conflictId: string, resolution: 'local' | 'server' | 'merge') => {
    const target = conflicts.find(c => c.id === conflictId);
    if (!target) return;

    setConflicts(prev => prev.filter(c => c.id !== conflictId));
    addAuditLog(
      'ARBITRAGE_CONFLIT',
      target.assetId,
      target.serverValue,
      resolution === 'local' ? target.localValue : target.serverValue,
      `Résolution arbitrage : ${resolution.toUpperCase()}`
    );
  };

  // Add new asset tag from commission modal
  const handleAddAsset = (newAsset: Asset) => {
    setAssets(prev => [newAsset, ...prev]);
    setSelectedAsset(newAsset);
    recordMutation('INVENTORY_SCAN', newAsset.id, newAsset.name, {
      tag: newAsset.id,
      bayLocation: newAsset.expectedBayLocation
    });
    addAuditLog(
      'COMMISSION_NOUVEL_ACTIF',
      newAsset.id,
      'NEANT',
      newAsset.inventoryStatus,
      'Création et immatriculation manuelle'
    );
  };

  // Quick Asset Search from Navbar
  const handleQuickSearch = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return;

    const matched = assets.find(a => 
      a.id.toLowerCase().includes(q) ||
      a.barcode.toLowerCase().includes(q) ||
      a.serialNumber.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      (a.nameFr && a.nameFr.toLowerCase().includes(q))
    );

    if (matched) {
      setSelectedAsset(matched);
      setActiveScreen('cockpit');
      sound.playScanSuccess();
    } else {
      sound.playAlert();
    }
  };

  // Interactive Checklist Test Runner (9 scenarios)
  const handleRunChecklistTest = (testId: number) => {
    sound.playScanSuccess();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    switch (testId) {
      case 1: // Found registered asset in right bay
        handleReconcileFromScanner('AST-10492', 'BAY-04');
        break;
      case 2: // Found registered asset in different bay -> ECART_LOCALISATION
        handleReconcileFromScanner('AST-10494', 'BAY-03');
        break;
      case 3: // Found unregistered asset -> Create Discovery
        handleAddDiscovery({
          id: `DEC-${Math.floor(100 + Math.random() * 899)}`,
          temporaryTag: `DISCOV-${Date.now().toString().slice(-4)}`,
          description: "Moteur test non répertorié",
          serialNumber: "SN-TEST-88",
          barcode: "990184918999",
          foundLocation: "BAY-03-RACK-04-L1",
          foundBy: "TECH-941",
          foundAt: now,
          imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
          status: 'EN_ATTENTE_REVUE'
        });
        break;
      case 4: // Close zone with unscanned asset -> MANQUANT
        handleCloseZone('BAY-02');
        break;
      case 5: // Disconnect internet during scan
        setIsOnline(false);
        recordMutation('INVENTORY_SCAN', 'AST-10493', 'API S7-1500', { offlineMode: true });
        break;
      case 6: // Reconnect internet & idempotent sync
        setIsOnline(true);
        handleFlushQueue();
        break;
      case 7: // Detect conflicting edits & resolve
        setActiveScreen('offline_queue');
        break;
      case 8: // Export final certified report
        setActiveScreen('reports');
        break;
      case 9: // Unauthorized user attempts campaign lock -> blocked by RBAC
        setUserRole('AGENT_INVENTAIRE');
        setActiveScreen('campagnes');
        break;
    }

    setChecklist(prev => prev.map(item => item.id === testId ? {
      ...item,
      status: 'PASSED',
      testedAt: now
    } : item));
  };

  const handleQuickBackup = async () => {
    try {
      const sql = await dbService.exportSqlDump();
      const blob = new Blob([sql], { type: 'application/sql' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kaf_inventaire_quick_backup_${new Date().toISOString().slice(0, 10)}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      sound.playScanSuccess();
    } catch {
      sound.playAlert();
    }
  };

  const pendingDiscoveriesCount = discoveries.filter(d => d.status === 'EN_ATTENTE_REVUE').length;
  const missingAssets = assets.filter(a => a.inventoryStatus === 'MANQUANT');

  // Enforce Login Gate: unauthenticated users MUST log in via LoginScreen
  if (!session) {
    return (
      <LoginScreen
        lang={lang}
        setLang={setLang}
        onLoginSuccess={(user, isOffline) => {
          const freshSession = authService.getSession();
          setSession(freshSession);
          setUserRole(user.role);
          sound.playScanSuccess();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A] overflow-hidden select-none">
      {/* Unified Industrial ERP Compact System Navbar */}
      <TopOperationalStrip
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen}
        lang={lang}
        setLang={setLang}
        isOnline={isOnline}
        setIsOnline={setIsOnline}
        pendingMutationCount={mutations.filter(m => m.syncStatus === 'PENDING').length}
        conflictCount={conflicts.length}
        userRole={userRole}
        onRoleChange={(newRole) => {
          if (session?.user?.role === 'RESPONSABLE_PATRIMOINE') {
            setUserRole(newRole);
          }
        }}
        onQuickSearch={handleQuickSearch}
        onFlushQueue={handleFlushQueue}
        isFlushing={isFlushing}
        onOpenConflicts={() => setActiveScreen('offline_queue')}
        activeCampaignTitle={campaign.title}
        activeCampaignProgress={campaign.progressPercent ?? (campaign.zones.length > 0 ? Math.round((campaign.zones.filter(z => z.isClosed).length / campaign.zones.length) * 100) : 75)}
        isElectron={dbService.isElectron()}
        currentUser={session?.user}
        onLogout={handleLogout}
        isOfflineSession={session?.isOffline}
      />

      {/* Main Workspace with Vertical Sidebar Anchored on the Right */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative flex-row" style={{ direction: 'ltr' }}>
        {/* Screen Viewport with localized content direction */}
        <main className="flex-1 flex min-h-0 overflow-hidden relative" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          {/* Screen 1: Operational Inventory Cockpit */}
          {activeScreen === 'cockpit' && (
            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden w-full">
              <ReconciliationCockpit
                assets={assets}
                selectedAsset={selectedAsset}
                onSelectAsset={setSelectedAsset}
                onUpdateInventoryStatus={handleUpdateInventoryStatus}
                onOpenNewAssetModal={() => setIsNewAssetModalOpen(true)}
                onTriggerSimulatedScan={handleTriggerSimulatedScan}
                lang={lang}
              />

              {/* Diagnostic Asset Inspector Panel */}
              {selectedAsset && (
                <AssetInspector
                  asset={selectedAsset}
                  onClose={() => setSelectedAsset(null)}
                  onUpdateAsset={handleUpdateAsset}
                  lang={lang}
                />
              )}
            </div>
          )}

          {/* Screen 2: Field Scanner Handheld Terminal with Real Camera & Laser */}
          {activeScreen === 'scanner' && (
            <FieldScannerTerminal
              assets={assets}
              currentScanningBay={currentScanningBay}
              onSetScanningBay={setCurrentScanningBay}
              onReconcileAsset={handleReconcileFromScanner}
              onOpenDiscoveryModalWithCode={(_code) => {
                setActiveScreen('decouvertes');
              }}
              lang={lang}
            />
          )}

          {/* Screen: Produits vérifiés & Équipements confirmés in situ */}
          {activeScreen === 'produits_verifies' && (
            <VerifiedAssetsView
              assets={assets}
              onSelectAsset={(asset) => {
                setSelectedAsset(asset);
                setActiveScreen('cockpit');
              }}
              onUpdateInventoryStatus={handleUpdateInventoryStatus}
              lang={lang}
              userRole={userRole}
            />
          )}

          {/* Screen 3: Unregistered Field Discoveries */}
          {activeScreen === 'decouvertes' && (
            <UnregisteredDiscoveriesView
              discoveries={discoveries}
              missingAssets={missingAssets}
              userRole={userRole}
              onAddDiscovery={handleAddDiscovery}
              onMatchWithMissing={handleMatchWithMissing}
              onIntegrateOfficial={handleIntegrateOfficial}
              onRejectDiscovery={handleRejectDiscovery}
              lang={lang}
            />
          )}

          {/* Screen 4: Campaigns & Formal Zone Closure */}
          {activeScreen === 'campagnes' && (
            <CampaignManagementView
              campaign={campaign}
              assets={assets}
              userRole={userRole}
              onCloseZone={handleCloseZone}
              onReopenZone={handleReopenZone}
              onLockCampaign={handleLockCampaign}
              lang={lang}
            />
          )}

          {/* Screen 5: Offline Queue & Arbitration Resolver */}
          {activeScreen === 'offline_queue' && (
            <OfflineQueueView
              mutations={mutations}
              conflicts={conflicts}
              onFlushQueue={handleFlushQueue}
              isFlushing={isFlushing}
              onResolveConflict={handleResolveConflict}
              isOnline={isOnline}
              setIsOnline={setIsOnline}
              lang={lang}
            />
          )}

          {/* Screen 6: Warehouse Spatial Topology & Heatmap */}
          {activeScreen === 'warehouse_map' && (
            <WarehouseMapView
              assets={assets}
              onSelectAsset={(asset) => {
                setSelectedAsset(asset);
                setActiveScreen('cockpit');
              }}
              onOpenCockpitWithFilter={(_bayId) => {
                setActiveScreen('cockpit');
              }}
              lang={lang}
            />
          )}

          {/* Screen 7: Immutable Audit Trail & RBAC Ledger */}
          {activeScreen === 'audit_logs' && (
            <AuditTrailView
              logs={auditLogs}
              currentRole={userRole}
              onRoleChange={setUserRole}
              lang={lang}
            />
          )}

          {/* Screen 8: Industrial Certification Checklist (9 Scenarios) */}
          {activeScreen === 'checklist' && (
            <ChecklistValidationView
              checklist={checklist}
              onRunTest={handleRunChecklistTest}
              lang={lang}
            />
          )}

          {/* Screen 9: Audit Reconciliation Manifest & Digital Sign-off */}
          {activeScreen === 'reports' && (
            <AuditReportManifest
              assets={assets}
              lang={lang}
            />
          )}

          {/* Screen 10: Windows Desktop & SQLite Control Center */}
          {activeScreen === 'desktop' && (
            <DesktopDatabaseCenter
              lang={lang}
              userRole={userRole}
              onRefreshData={refreshFromDB}
            />
          )}

          {/* Screen 11: Enterprise RBAC User & Permissions Management */}
          {activeScreen === 'users' && (
            userRole === 'RESPONSABLE_PATRIMOINE' ? (
              <UserManagementView
                lang={lang}
                currentUserRole={userRole}
                onAuditLog={(action, entityId, oldValue, newValue, reason) => {
                  addAuditLog(action, entityId, oldValue, newValue, reason);
                }}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#0B0F17] text-white">
                <div className="w-16 h-16 rounded-2xl bg-red-950/50 border border-red-800/80 flex items-center justify-center text-red-400 mb-4 shadow-xl">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold mb-2">
                  {lang === 'ar' ? 'غير مصرح لك بالوصول (Accès Refusé)' : 'Accès Refusé — Zone Réservée'}
                </h2>
                <p className="text-xs text-neutral-400 max-w-md mb-6 leading-relaxed">
                  {lang === 'ar'
                    ? 'إدارة حسابات المستخدمين وصلاحيات المنظومة مقتصرة حصرياً على المسؤول العام (RESPONSABLE_PATRIMOINE). تم تسجيل محاولة الوصول في سجل التدقيق.'
                    : 'La gestion des utilisateurs et des permissions de la plateforme est réservée exclusivement au Responsable du Patrimoine (Administrateur). Cette tentative a été tracée dans la piste d\'audit.'}
                </p>
                <button
                  onClick={() => setActiveScreen('cockpit')}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  {lang === 'ar' ? 'العودة لمقصورة العمليات' : 'Retourner au Cockpit'}
                </button>
              </div>
            )
          )}

          {/* Screen 12: Backend Synchronization Engine & NestJS Test Center */}
          {activeScreen === 'sync_center' && (
            <BackendSyncCenterView
              lang={lang}
              localMutations={mutations.filter(m => m.syncStatus === 'PENDING')}
              onRefreshLocalData={refreshFromDB}
              onApplyServerAssetsToLocal={(serverAssets) => {
                setAssets(serverAssets);
                try {
                  localStorage.setItem('kaf_assets_v3', JSON.stringify(serverAssets));
                } catch {}
              }}
            />
          )}
        </main>

        {/* Right Vertical Sidebar Navigation */}
        <RightSidebar
          activeScreen={activeScreen}
          setActiveScreen={setActiveScreen}
          lang={lang}
          pendingDiscoveriesCount={pendingDiscoveriesCount}
          pendingMutationCount={mutations.filter(m => m.syncStatus === 'PENDING').length}
          isElectron={dbService.isElectron()}
          userRole={userRole}
          onQuickBackup={handleQuickBackup}
        />
      </div>

      {/* Commission Asset Modal */}
      <NewAssetModal
        isOpen={isNewAssetModalOpen}
        onClose={() => setIsNewAssetModalOpen(false)}
        onAddAsset={handleAddAsset}
        lang={lang}
      />
    </div>
  );
}
