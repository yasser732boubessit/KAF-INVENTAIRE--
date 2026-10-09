import React, { useState, useMemo } from 'react';
import { 
  Scan, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Plus, 
  ArrowUpDown, 
  Zap, 
  CheckSquare, 
  Square, 
  TrendingUp, 
  Eye, 
  HelpCircle,
  Search,
  X,
  RotateCcw,
  SlidersHorizontal,
  MapPin,
  Check
} from 'lucide-react';
import { Asset, InventoryResultStatus, Language } from '../types';
import { translations } from '../translations';
import { sound } from '../utils/audio';

interface ReconciliationCockpitProps {
  assets: Asset[];
  selectedAsset: Asset | null;
  onSelectAsset: (asset: Asset) => void;
  onUpdateInventoryStatus: (assetId: string, status: InventoryResultStatus) => void;
  onOpenNewAssetModal: () => void;
  onTriggerSimulatedScan: (customCode?: string) => void;
  lang: Language;
}

export const ReconciliationCockpit: React.FC<ReconciliationCockpitProps> = ({
  assets,
  selectedAsset,
  onSelectAsset,
  onUpdateInventoryStatus,
  onOpenNewAssetModal,
  onTriggerSimulatedScan,
  lang
}) => {
  const t = translations[lang];

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InventoryResultStatus>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<keyof Asset>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Exact Metrics computation
  const totalCount = assets.length;
  const conformeCount = assets.filter(a => a.inventoryStatus === 'CONFORME').length;
  const locationDiffCount = assets.filter(a => a.inventoryStatus === 'ECART_LOCALISATION').length;
  const missingCount = assets.filter(a => a.inventoryStatus === 'MANQUANT').length;
  const unverifiedCount = assets.filter(a => a.inventoryStatus === 'NON_VERIFIE').length;
  const progressPercent = totalCount > 0 ? Math.round(((conformeCount + locationDiffCount) / totalCount) * 100) : 0;

  // Filtered & sorted assets
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      // Status filter
      if (statusFilter !== 'all' && asset.inventoryStatus !== statusFilter) return false;
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches = 
          asset.id.toLowerCase().includes(q) ||
          asset.officialCode.toLowerCase().includes(q) ||
          asset.name.toLowerCase().includes(q) ||
          asset.nameAr.toLowerCase().includes(q) ||
          (asset.nameFr && asset.nameFr.toLowerCase().includes(q)) ||
          asset.serialNumber.toLowerCase().includes(q) ||
          asset.barcode.toLowerCase().includes(q) ||
          asset.expectedBayLocation.toLowerCase().includes(q) ||
          (asset.scannedBayLocation && asset.scannedBayLocation.toLowerCase().includes(q)) ||
          asset.sku.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    }).sort((a, b) => {
      const valA = String(a[sortField] || '');
      const valB = String(b[sortField] || '');
      return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
  }, [assets, statusFilter, searchQuery, sortField, sortDirection]);

  // Handle immediate barcode submit
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    const query = searchQuery.trim().toLowerCase();
    const match = assets.find(
      a => a.barcode.toLowerCase() === query || 
           a.serialNumber.toLowerCase() === query || 
           a.id.toLowerCase() === query ||
           a.officialCode.toLowerCase() === query
    );

    if (match) {
      sound.playScanSuccess();
      onSelectAsset(match);
      onUpdateInventoryStatus(match.id, 'CONFORME');
      setSearchQuery('');
    } else {
      sound.playAlert();
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAssets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAssets.map(a => a.id)));
    }
  };

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBatchReconcile = () => {
    selectedIds.forEach(id => {
      onUpdateInventoryStatus(id, 'CONFORME');
    });
    sound.playScanSuccess();
    setSelectedIds(new Set());
  };

  const handleSort = (field: keyof Asset) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
  };

  const isFiltered = statusFilter !== 'all' || searchQuery.trim() !== '';

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] overflow-y-auto">
      {/* =========================================================================
          1. EN-TÊTE DU COCKPIT D'INVENTAIRE
          Code campagne, titre, auditeur, zone active | Actions distinctes avec Mode Test
          ========================================================================= */}
      <div className="bg-white border-b border-slate-200 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Métadonnées opérationnelles (Gauche) */}
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-bold bg-[#111827] text-white px-2.5 py-0.5 rounded border border-neutral-700">
                CAMP-2026-Q1
              </span>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                {t.screenCockpit}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1 font-mono">
              <span>{t.auditor} : <strong className="text-slate-800">Yasser B. (Auditeur Principal)</strong></span>
              <span className="text-slate-300">|</span>
              <span>{t.zone} : <strong className="text-slate-800">WEST-DC-ZONE-C (Allée A)</strong></span>
            </div>
          </div>

          {/* Actions Métier (Droite) */}
          <div className="flex items-center gap-2.5">
            {/* Simulation Scan Conforme (Porte explicitement l'indicateur "Mode Test") */}
            <div className="relative group">
              <button
                onClick={() => onTriggerSimulatedScan()}
                className="flex items-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 border border-slate-300 text-slate-800 px-3 py-1.5 rounded text-xs font-medium transition-colors shadow-xs active:scale-98"
                title={t.testModeHint}
              >
                <Zap className="w-3.5 h-3.5 text-[#EAB308]" />
                <span>{t.quickScanDemo}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#FACC15]/20 text-[#854D0E] px-1 py-0.2 rounded border border-[#FACC15]/40 ml-1">
                  {t.testModeIndicator}
                </span>
              </button>
            </div>

            {/* Enregistrer Découverte / Nouvel Actif (Action Principale en Vert #16A34A) */}
            <button
              onClick={onOpenNewAssetModal}
              className="flex items-center gap-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white px-3.5 py-1.5 rounded text-xs font-semibold shadow-sm transition-colors active:scale-98"
              title="Créer ou enregistrer une nouvelle immobilisation trouvée"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>{t.addNewAsset}</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            2. CARTES KPI (5 indicateurs à hauteur identique dans une grille régulière)
            Progression | Conformes (#16A34A) | Écarts (#FACC15) | Manquants (Neutre) | Non vérifiés
            ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-100">
          {/* KPI 1 : Progression d'Audit */}
          <div className="bg-white p-3 rounded border border-slate-200 shadow-2xs flex flex-col justify-between h-24">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              <span>{t.progress}</span>
              <TrendingUp className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-slate-900">{progressPercent}%</span>
              <span className="text-[11px] font-mono text-slate-500">{conformeCount + locationDiffCount} / {totalCount}</span>
            </div>
            <div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-[#16A34A] h-full transition-all duration-500" 
                  style={{ width: `${progressPercent}%` }} 
                />
              </div>
              <div className="text-[10px] text-slate-400 mt-1 truncate">{t.kpiProgressDesc}</div>
            </div>
          </div>

          {/* KPI 2 : Conformes (Vert #16A34A) */}
          <div className="bg-white p-3 rounded border border-slate-200 border-l-4 border-l-[#16A34A] shadow-2xs flex flex-col justify-between h-24">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              <span>{t.reconciled}</span>
              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#16A34A]">
              {conformeCount}
            </div>
            <div className="text-[10px] text-slate-500 truncate">{t.kpiConformeDesc}</div>
          </div>

          {/* KPI 3 : Écarts d'Emplacement (Jaune #FACC15) */}
          <div className="bg-white p-3 rounded border border-slate-200 border-l-4 border-l-[#FACC15] shadow-2xs flex flex-col justify-between h-24">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              <span>{t.locationDiff}</span>
              <AlertTriangle className="w-4 h-4 text-[#EAB308]" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#CA8A04]">
              {locationDiffCount}
            </div>
            <div className="text-[10px] text-slate-500 truncate">{t.kpiLocationDiffDesc}</div>
          </div>

          {/* KPI 4 : Manquants (Présentation neutre sobre, sans rouge agressif) */}
          <div className="bg-white p-3 rounded border border-slate-200 border-l-4 border-l-slate-400 shadow-2xs flex flex-col justify-between h-24">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              <span>{t.missing}</span>
              <HelpCircle className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-700">
              {missingCount}
            </div>
            <div className="text-[10px] text-slate-500 truncate">{t.kpiMissingDesc}</div>
          </div>

          {/* KPI 5 : Non Vérifiés (En attente) */}
          <div className="bg-white p-3 rounded border border-slate-200 border-l-4 border-l-slate-300 shadow-2xs flex flex-col justify-between h-24">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              <span>{t.unscanned}</span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-600">
              {unverifiedCount}
            </div>
            <div className="text-[10px] text-slate-500 truncate">{t.kpiUnverifiedDesc}</div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. BARRE DE RECHERCHE COMPACTE & FILTRES FONCTIONNELS
          Recherche multicritère, filtres segmentés avec indicateurs, effacement rapide
          ========================================================================= */}
      <div className="p-4 space-y-3">
        <div className="bg-white p-3 rounded border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Champ de recherche */}
          <form onSubmit={handleBarcodeSubmit} className="flex-1 flex items-center relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-9 pr-24 py-1.5 bg-slate-50 hover:bg-white text-xs text-slate-900 border border-slate-300 rounded focus:outline-none focus:border-[#16A34A] focus:bg-white font-mono placeholder:font-sans transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-16 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Effacer la recherche"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="submit"
                className="bg-[#111827] hover:bg-neutral-800 text-white px-2.5 py-0.5 rounded text-[11px] font-medium"
              >
                Scanner
              </button>
            </div>
          </form>

          {/* Filtres Segmentés */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {/* Tous */}
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-[#111827] text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {t.filterAll} ({totalCount})
            </button>

            {/* Conformes (#16A34A) */}
            <button
              onClick={() => setStatusFilter('CONFORME')}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                statusFilter === 'CONFORME'
                  ? 'bg-[#16A34A] text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'CONFORME' ? 'bg-white' : 'bg-[#16A34A]'}`} />
              <span>{t.filterConforme} ({conformeCount})</span>
            </button>

            {/* Écarts d'Emplacement (#FACC15) */}
            <button
              onClick={() => setStatusFilter('ECART_LOCALISATION')}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                statusFilter === 'ECART_LOCALISATION'
                  ? 'bg-[#FACC15] text-black font-semibold shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'ECART_LOCALISATION' ? 'bg-black' : 'bg-[#EAB308]'}`} />
              <span>{t.filterLocationDiff} ({locationDiffCount})</span>
            </button>

            {/* Manquants (Neutre sobre) */}
            <button
              onClick={() => setStatusFilter('MANQUANT')}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                statusFilter === 'MANQUANT'
                  ? 'bg-slate-700 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'MANQUANT' ? 'bg-white' : 'bg-slate-400'}`} />
              <span>{t.filterMissing} ({missingCount})</span>
            </button>

            {/* Non Vérifiés */}
            <button
              onClick={() => setStatusFilter('NON_VERIFIE')}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                statusFilter === 'NON_VERIFIE'
                  ? 'bg-slate-700 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'NON_VERIFIE' ? 'bg-white' : 'bg-slate-400'}`} />
              <span>{t.filterUnscanned} ({unverifiedCount})</span>
            </button>

            {/* Bouton Effacement Rapide (Reset) si un filtre est actif */}
            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="px-2 py-1 rounded text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 border border-dashed border-slate-300 hover:bg-slate-100 transition-colors whitespace-nowrap"
                title="Réinitialiser tous les filtres et la recherche"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{t.clearFilters}</span>
              </button>
            )}
          </div>
        </div>

        {/* Barre d'opérations groupées (si lignes sélectionnées) */}
        {selectedIds.size > 0 && (
          <div className="bg-[#111827] text-white px-4 py-2 rounded flex items-center justify-between text-xs shadow-sm">
            <div className="flex items-center gap-2 font-mono">
              <span className="bg-neutral-800 text-white font-bold px-2 py-0.5 rounded border border-neutral-700 text-[11px]">
                {selectedIds.size}
              </span>
              <span>immobilisations sélectionnées</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchReconcile}
                className="bg-[#16A34A] hover:bg-[#15803D] text-white px-3 py-1 rounded font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Valider Conformes</span>
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-neutral-400 hover:text-white px-2 py-1 transition-colors"
              >
                Désélectionner
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            4. TABLEAU DES IMMOBILISATIONS
            Colonnes : Sélection | Tag / Code | Désignation | Emplacement Prévu vs Constaté |
            Code-barres & N° Série | Résultat d'Inventaire | État Physique | Actions
            ========================================================================= */}
        <div className="bg-white border border-slate-200 rounded overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200 select-none text-[11px] sticky top-0 z-10">
                  {/* 1. Sélection */}
                  <th className="p-2.5 w-10 text-center border-e border-slate-200">
                    <button onClick={toggleSelectAll} className="text-slate-600 hover:text-slate-900 flex items-center justify-center mx-auto">
                      {selectedIds.size === filteredAssets.length && filteredAssets.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-[#16A34A]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>

                  {/* 2. Code Actif / Tag */}
                  <th onClick={() => handleSort('id')} className="p-2.5 text-start font-mono border-e border-slate-200 cursor-pointer hover:bg-slate-200/80 transition-colors">
                    <div className="flex items-center gap-1">
                      <span>{t.colAssetTag}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  {/* 3. Désignation & Catégorie */}
                  <th onClick={() => handleSort('nameFr')} className="p-2.5 text-start border-e border-slate-200 cursor-pointer hover:bg-slate-200/80 transition-colors">
                    <div className="flex items-center gap-1">
                      <span>{t.colDescription}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  {/* 4. Emplacement Prévu vs Constaté (Crucial pour la réconciliation) */}
                  <th className="p-2.5 text-start border-e border-slate-200 font-mono">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{t.colExpectedLoc} / {t.colScannedLoc}</span>
                    </div>
                  </th>

                  {/* 5. N° Série & Code-barres */}
                  <th className="p-2.5 text-start font-mono border-e border-slate-200">
                    <span>{t.colSerial} & {t.colBarcode}</span>
                  </th>

                  {/* 6. Résultat d'Inventaire */}
                  <th className="p-2.5 text-start border-e border-slate-200">
                    <span>{t.colInventoryStatus}</span>
                  </th>

                  {/* 7. État Physique */}
                  <th className="p-2.5 text-start border-e border-slate-200">
                    <span>{t.colCondition}</span>
                  </th>

                  {/* 8. Actions */}
                  <th className="p-2.5 text-center">
                    <span>{t.colActions}</span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 font-sans">
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-slate-400 font-medium">
                      <p className="text-sm font-semibold text-slate-600 mb-1">Aucune immobilisation trouvée</p>
                      <p className="text-xs">Aucun équipement ne correspond aux filtres ou à la recherche courante.</p>
                      {isFiltered && (
                        <button
                          onClick={handleResetFilters}
                          className="mt-3 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition-colors"
                        >
                          {t.clearFilters}
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => {
                    const isSelectedRow = selectedAsset?.id === asset.id;
                    const isChecked = selectedIds.has(asset.id);

                    const displayName = lang === 'fr' 
                      ? (asset.nameFr || asset.name) 
                      : lang === 'ar' 
                      ? asset.nameAr 
                      : asset.name;

                    const isLocationMatch = asset.scannedBayLocation && asset.scannedBayLocation === asset.expectedBayLocation;
                    const isLocationDiff = asset.scannedBayLocation && asset.scannedBayLocation !== asset.expectedBayLocation;

                    return (
                      <tr
                        key={asset.id}
                        onClick={() => onSelectAsset(asset)}
                        className={`h-11 cursor-pointer transition-colors border-s-2 ${
                          isSelectedRow
                            ? 'bg-slate-100/80 border-s-[#16A34A]'
                            : 'hover:bg-slate-50 border-s-transparent'
                        }`}
                      >
                        {/* 1. Sélection */}
                        <td className="p-2 text-center border-e border-slate-100" onClick={(e) => toggleSelectRow(asset.id, e)}>
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-[#16A34A] inline-block" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 hover:text-slate-500 inline-block" />
                          )}
                        </td>

                        {/* 2. Code Actif / Tag */}
                        <td className="p-2.5 font-mono font-bold text-slate-900 border-e border-slate-100 whitespace-nowrap">
                          <span>{asset.id}</span>
                        </td>

                        {/* 3. Désignation & Catégorie */}
                        <td className="p-2.5 border-e border-slate-100 min-w-[220px]">
                          <div className="font-semibold text-slate-800 truncate" title={displayName}>
                            {displayName}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                            <span>{asset.category}</span>
                            <span>&bull;</span>
                            <span className="text-slate-600">{asset.officialCode}</span>
                          </div>
                        </td>

                        {/* 4. Emplacement Prévu vs Constaté */}
                        <td className="p-2.5 font-mono border-e border-slate-100 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {/* Attendu */}
                            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 text-[11px]" title="Emplacement prévu dans l'ERP">
                              {asset.expectedBayLocation}
                            </span>

                            <span className="text-slate-400">→</span>

                            {/* Constaté */}
                            {asset.scannedBayLocation ? (
                              <span 
                                className={`px-1.5 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 ${
                                  isLocationMatch
                                    ? 'bg-green-50 text-green-800 border border-green-200'
                                    : 'bg-yellow-50 text-yellow-900 border border-yellow-300'
                                }`}
                                title={isLocationMatch ? 'Emplacement constaté conforme' : 'Écart d\'emplacement détecté'}
                              >
                                {isLocationDiff && <AlertTriangle className="w-3 h-3 text-[#EAB308]" />}
                                <span>{asset.scannedBayLocation}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </div>
                        </td>

                        {/* 5. N° Série & Code-barres */}
                        <td className="p-2.5 font-mono text-slate-700 border-e border-slate-100 whitespace-nowrap">
                          <div className="font-semibold text-slate-800 text-[11px]">{asset.serialNumber}</div>
                          <div className="text-[10px] text-slate-500">{asset.barcode}</div>
                        </td>

                        {/* 6. Résultat d'Inventaire (Badge 3 couleurs strict : Vert / Jaune / Neutre sobre) */}
                        <td className="p-2.5 border-e border-slate-100 whitespace-nowrap">
                          {asset.inventoryStatus === 'CONFORME' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-green-50 text-green-800 border border-green-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                              <span>{t.statConforme}</span>
                            </span>
                          )}
                          {asset.inventoryStatus === 'ECART_LOCALISATION' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-yellow-50 text-yellow-900 border border-yellow-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#EAB308]" />
                              <span>{t.statLocationDiff}</span>
                            </span>
                          )}
                          {asset.inventoryStatus === 'MANQUANT' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span>{t.statMissing}</span>
                            </span>
                          )}
                          {asset.inventoryStatus === 'NON_VERIFIE' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                              <span>{t.statUnscanned}</span>
                            </span>
                          )}
                        </td>

                        {/* 7. État Physique */}
                        <td className="p-2.5 border-e border-slate-100 whitespace-nowrap">
                          <span className="text-[11px] text-slate-700 capitalize font-medium">
                            {asset.condition}
                          </span>
                        </td>

                        {/* 8. Actions Rapides */}
                        <td className="p-2.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            {asset.inventoryStatus !== 'CONFORME' ? (
                              <button
                                onClick={() => {
                                  sound.playScanSuccess();
                                  onUpdateInventoryStatus(asset.id, 'CONFORME');
                                }}
                                className="px-2 py-0.5 bg-green-50 hover:bg-green-100 text-green-800 border border-green-300 rounded font-semibold text-[11px] flex items-center gap-1 transition-colors"
                                title="Valider Conforme"
                              >
                                <Check className="w-3 h-3 text-[#16A34A]" />
                                <span>Valider</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  sound.playAlert();
                                  onUpdateInventoryStatus(asset.id, 'ECART_LOCALISATION');
                                }}
                                className="px-1.5 py-0.5 text-slate-400 hover:text-[#CA8A04] rounded text-[11px] hover:bg-slate-100 transition-colors"
                                title="Signaler un écart d'emplacement"
                              >
                                <AlertTriangle className="w-3 h-3 text-[#EAB308]" />
                              </button>
                            )}

                            <button
                              onClick={() => onSelectAsset(asset)}
                              className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-200/80 transition-colors"
                              title={t.btnInspect}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pied de tableau technique */}
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-slate-500 font-mono">
            <span>
              Affichage de <strong className="text-slate-800">{filteredAssets.length}</strong> sur <strong className="text-slate-800">{assets.length}</strong> immobilisations
            </span>
            <span>POSTGRESQL RECONCILIATION ENGINE &bull; CACHE LOCAL INDEXEDDB</span>
          </div>
        </div>
      </div>
    </div>
  );
};
