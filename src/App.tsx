/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Asset, AssetCondition, AssetStatus, ActiveScreen, Language, OfflineMutation, ConflictItem } from './types';
import { initialAssets, initialOfflineMutations, initialConflicts } from './mockData';
import { TopOperationalStrip } from './components/TopOperationalStrip';
import { OfflineQueueBanner } from './components/OfflineQueueBanner';
import { ReconciliationCockpit } from './components/ReconciliationCockpit';
import { AssetInspector } from './components/AssetInspector';
import { FieldScannerTerminal } from './components/FieldScannerTerminal';
import { OfflineQueueView } from './components/OfflineQueueView';
import { WarehouseMapView } from './components/WarehouseMapView';
import { AuditReportManifest } from './components/AuditReportManifest';
import { NewAssetModal } from './components/NewAssetModal';
import { sound } from './utils/audio';

export default function App() {
  const [lang, setLang] = useState<Language>('ar');
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('cockpit');
  const [assets, setAssets] = useState<Asset[]>(() => {
    try {
      const saved = localStorage.getItem('precision_assets_v1');
      return saved ? JSON.parse(saved) : initialAssets;
    } catch {
      return initialAssets;
    }
  });

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(assets[0] || null);
  const [mutations, setMutations] = useState<OfflineMutation[]>(() => {
    try {
      const saved = localStorage.getItem('precision_mutations_v1');
      return saved ? JSON.parse(saved) : initialOfflineMutations;
    } catch {
      return initialOfflineMutations;
    }
  });
  const [conflicts, setConflicts] = useState<ConflictItem[]>(initialConflicts);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isFlushing, setIsFlushing] = useState<boolean>(false);
  const [isNewAssetModalOpen, setIsNewAssetModalOpen] = useState<boolean>(false);

  // Sync RTL / LTR document direction with language
  useEffect(() => {
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  // Persist assets in localStorage
  useEffect(() => {
    try {
      localStorage.setItem('precision_assets_v1', JSON.stringify(assets));
    } catch {
      // Storage full or unavailable
    }
  }, [assets]);

  // Persist mutations in localStorage
  useEffect(() => {
    try {
      localStorage.setItem('precision_mutations_v1', JSON.stringify(mutations));
    } catch {
      // Storage full or unavailable
    }
  }, [mutations]);

  // Record an offline mutation
  const recordMutation = (
    type: OfflineMutation['type'],
    assetId: string,
    assetName: string,
    payload: Record<string, any>
  ) => {
    const newMut: OfflineMutation = {
      id: `MUT-${Math.floor(99413 + Math.random() * 89999)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      type,
      assetId,
      assetName,
      payload,
      syncStatus: isOnline ? 'pending' : 'pending'
    };
    setMutations(prev => [newMut, ...prev]);
  };

  // Update asset fields
  const handleUpdateAsset = (updatedFields: Partial<Asset>) => {
    if (!selectedAsset) return;

    const updatedAsset = { ...selectedAsset, ...updatedFields };
    setSelectedAsset(updatedAsset);

    setAssets(prev => prev.map(a => a.id === selectedAsset.id ? updatedAsset : a));

    recordMutation(
      'STATUS_UPDATE',
      selectedAsset.id,
      selectedAsset.name,
      updatedFields
    );
  };

  // Update asset status by ID
  const handleUpdateAssetStatus = (assetId: string, newStatus: AssetStatus) => {
    const target = assets.find(a => a.id === assetId);
    if (!target) return;

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const updated: Asset = {
      ...target,
      status: newStatus,
      lastScannedAt: now,
      scannedBy: 'TECH-941'
    };

    setAssets(prev => prev.map(a => a.id === assetId ? updated : a));
    if (selectedAsset?.id === assetId) {
      setSelectedAsset(updated);
    }

    recordMutation('STATUS_UPDATE', target.id, target.name, {
      status: newStatus,
      timestamp: now
    });
  };

  // Field Reconcile from Scanner
  const handleReconcileFromScanner = (assetId: string, condition?: AssetCondition) => {
    const target = assets.find(a => a.id === assetId);
    if (!target) return;

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const updated: Asset = {
      ...target,
      status: 'reconciled',
      condition: condition || target.condition,
      lastScannedAt: now,
      scannedBy: 'TECH-941',
      serialVerified: true,
      rfidVerified: true
    };

    setAssets(prev => prev.map(a => a.id === assetId ? updated : a));
    setSelectedAsset(updated);

    recordMutation('STATUS_UPDATE', target.id, target.name, {
      status: 'reconciled',
      condition: condition || target.condition,
      scanEngine: 'OPTICAL_LASER_60FPS'
    });
  };

  // Simulated rapid scan trigger
  const handleTriggerSimulatedScan = () => {
    sound.playScanSuccess();
    // Pick an unscanned asset first, or pick random
    const unscanned = assets.find(a => a.status === 'unscanned' || a.status === 'staging');
    const target = unscanned || assets[Math.floor(Math.random() * assets.length)];

    if (target) {
      handleUpdateAssetStatus(target.id, 'reconciled');
      setSelectedAsset(target);
    }
  };

  // Flush Queue Action
  const handleFlushQueue = () => {
    if (mutations.length === 0) return;
    setIsFlushing(true);

    setTimeout(() => {
      setIsFlushing(false);
      setMutations([]);
      sound.playSyncFlush();
    }, 1200);
  };

  // Resolve conflict
  const handleResolveConflict = (conflictId: string, resolution: 'local' | 'server' | 'merge') => {
    setConflicts(prev => prev.filter(c => c.id !== conflictId));
  };

  // Add new asset tag
  const handleAddAsset = (newAsset: Asset) => {
    setAssets(prev => [newAsset, ...prev]);
    setSelectedAsset(newAsset);
    recordMutation('BARCODE_LINK', newAsset.id, newAsset.name, {
      tag: newAsset.id,
      bayLocation: newAsset.bayLocation
    });
  };

  // Open cockpit with bay filter
  const handleOpenCockpitWithFilter = (bayId: string) => {
    setActiveScreen('cockpit');
  };

  return (
    <div className="min-h-screen h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A] overflow-hidden select-none">
      {/* 1. Top Operational Telemetry Strip */}
      <TopOperationalStrip
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen}
        lang={lang}
        setLang={setLang}
        isOnline={isOnline}
        setIsOnline={setIsOnline}
        pendingMutationCount={mutations.length}
      />

      {/* 2. Deep Violet Offline Queue Strip */}
      <OfflineQueueBanner
        pendingCount={mutations.length}
        conflictCount={conflicts.length}
        onFlushQueue={handleFlushQueue}
        isFlushing={isFlushing}
        onOpenQueueScreen={() => setActiveScreen('offline_queue')}
        lang={lang}
      />

      {/* 3. Screen Viewport */}
      <main className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Screen 1: Operational Cockpit */}
        {activeScreen === 'cockpit' && (
          <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden w-full">
            <ReconciliationCockpit
              assets={assets}
              selectedAsset={selectedAsset}
              onSelectAsset={setSelectedAsset}
              onUpdateAssetStatus={handleUpdateAssetStatus}
              onOpenNewAssetModal={() => setIsNewAssetModalOpen(true)}
              onTriggerSimulatedScan={handleTriggerSimulatedScan}
              lang={lang}
            />

            {/* Asset Inspector Panel */}
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

        {/* Screen 2: Field Scanner Handheld Terminal */}
        {activeScreen === 'scanner' && (
          <FieldScannerTerminal
            assets={assets}
            onReconcileAsset={handleReconcileFromScanner}
            lang={lang}
          />
        )}

        {/* Screen 3: Offline Queue & Conflict Resolver */}
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

        {/* Screen 4: Warehouse Spatial Map */}
        {activeScreen === 'warehouse_map' && (
          <WarehouseMapView
            assets={assets}
            onSelectAsset={(asset) => {
              setSelectedAsset(asset);
              setActiveScreen('cockpit');
            }}
            onOpenCockpitWithFilter={handleOpenCockpitWithFilter}
            lang={lang}
          />
        )}

        {/* Screen 5: Audit Report & Sign-off Manifest */}
        {activeScreen === 'reports' && (
          <AuditReportManifest
            assets={assets}
            lang={lang}
          />
        )}
      </main>

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
