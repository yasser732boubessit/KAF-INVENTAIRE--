import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Laptop, 
  Monitor, 
  Server, 
  Cpu, 
  Building2, 
  MapPin, 
  Filter, 
  Download, 
  Printer, 
  QrCode, 
  Eye, 
  CheckCheck, 
  RefreshCw, 
  ArrowRight, 
  SlidersHorizontal, 
  Clock, 
  UserCheck, 
  FileSpreadsheet, 
  Layers, 
  HardDrive, 
  X,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  Wrench,
  Zap,
  Shield,
  Gauge,
  Package
} from 'lucide-react';
import { Asset, Language, UserRole, InventoryResultStatus } from '../types';
import { initialAssets } from '../mockData';
import { sound } from '../utils/audio';

interface VerifiedAssetsViewProps {
  assets: Asset[];
  onSelectAsset?: (asset: Asset) => void;
  onUpdateInventoryStatus?: (assetId: string, newStatus: InventoryResultStatus) => void;
  lang: Language;
  userRole?: UserRole;
  onTriggerReconciliation?: (assetId: string, location: string) => void;
}

type VerificationFilter = 'ALL' | 'VERIFIED' | 'PENDING' | 'DISCREPANCY' | 'MISSING';
type EquipmentTypeFilter = 'ALL' | 'PC_IT' | 'INDUSTRIAL' | 'ELECTRICAL' | 'INSTRUMENTATION' | 'SAFETY';
type ViewMode = 'table' | 'cards';

export const VerifiedAssetsView: React.FC<VerifiedAssetsViewProps> = ({
  assets,
  onSelectAsset,
  onUpdateInventoryStatus,
  lang,
  userRole,
  onTriggerReconciliation
}) => {
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationFilter, setVerificationFilter] = useState<VerificationFilter>('ALL');
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState<EquipmentTypeFilter>('ALL');
  const [siteFilter, setSiteFilter] = useState<string>('ALL');
  const [buildingFilter, setBuildingFilter] = useState<string>('ALL');
  const [floorFilter, setFloorFilter] = useState<string>('ALL');
  const [roomFilter, setRoomFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  
  // Helper to determine if an asset is a PC or IT equipment
  const isItEquipment = (asset: Asset): boolean => {
    const text = `${asset.name} ${asset.nameFr || ''} ${asset.sku} ${asset.category} ${asset.notes || ''}`.toLowerCase();
    return (
      asset.category === 'IT_Hardware' ||
      asset.category === 'Office_PC' ||
      asset.equipmentType === 'PC_PORTABLE' ||
      asset.equipmentType === 'PC_BUREAU' ||
      asset.equipmentType === 'ECRAN' ||
      asset.equipmentType === 'SERVEUR' ||
      text.includes('pc ') ||
      text.includes('laptop') ||
      text.includes('portable') ||
      text.includes('thinkvision') ||
      text.includes('thinkpad') ||
      text.includes('latitude') ||
      text.includes('workstation') ||
      text.includes('écran') ||
      text.includes('ecran') ||
      text.includes('moniteur') ||
      text.includes('serveur') ||
      text.includes('imprimante') ||
      text.includes('desktop')
    );
  };

  // Helper: Catégorie précise de l'équipement
  const getEquipmentCategory = (asset: Asset): EquipmentTypeFilter => {
    if (isItEquipment(asset)) return 'PC_IT';
    if (asset.category === 'Electrical') return 'ELECTRICAL';
    if (asset.category === 'Instrumentation') return 'INSTRUMENTATION';
    if (asset.category === 'Safety') return 'SAFETY';
    return 'INDUSTRIAL';
  };

  // Helper to test if asset is physically confirmed / verified
  const isPhysicallyVerified = (asset: Asset): boolean => {
    return (
      asset.inventoryStatus === 'CONFORME' ||
      asset.inventoryStatus === 'ECART_LOCALISATION' ||
      (asset.lastScannedAt !== null && asset.inventoryStatus !== 'NON_VERIFIE') ||
      asset.rfidVerified === true
    );
  };

  // Dynamic Sites, Buildings, Floors and Rooms lists from dataset
  const { availableSites, availableBuildings, availableFloors, availableRooms } = useMemo(() => {
    const sites = new Set<string>();
    const buildings = new Set<string>();
    const floors = new Set<string>();
    const rooms = new Set<string>();

    for (const a of assets) {
      if (a.site) sites.add(a.site);
      if (a.building) buildings.add(a.building);
      if (a.floor) floors.add(a.floor);
      if (a.roomOrOffice) rooms.add(a.roomOrOffice);
    }

    return {
      availableSites: Array.from(sites).sort(),
      availableBuildings: Array.from(buildings).sort(),
      availableFloors: Array.from(floors).sort(),
      availableRooms: Array.from(rooms).sort()
    };
  }, [assets]);

  // =========================================================================
  // REAL-TIME KPI STATISTICS — ALL PRODUCTS (not just PC)
  // =========================================================================
  const stats = useMemo(() => {
    const totalCount = assets.length;
    const verifiedCount = assets.filter(isPhysicallyVerified).length;
    const remainingCount = totalCount - verifiedCount;
    const verifiedPercent = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 1000) / 10 : 0;

    const itAssets = assets.filter(isItEquipment);
    const itTotalCount = itAssets.length;
    const itVerifiedCount = itAssets.filter(isPhysicallyVerified).length;
    const itRemainingCount = itTotalCount - itVerifiedCount;
    const itVerifiedPercent = itTotalCount > 0 ? Math.round((itVerifiedCount / itTotalCount) * 1000) / 10 : 0;

    const electricalAssets = assets.filter(a => !isItEquipment(a) && a.category === 'Electrical');
    const electricalTotalCount = electricalAssets.length;
    const electricalVerifiedCount = electricalAssets.filter(isPhysicallyVerified).length;
    const electricalRemainingCount = electricalTotalCount - electricalVerifiedCount;

    const instrumentationAssets = assets.filter(a => !isItEquipment(a) && a.category === 'Instrumentation');
    const instrumentationTotalCount = instrumentationAssets.length;
    const instrumentationVerifiedCount = instrumentationAssets.filter(isPhysicallyVerified).length;
    const instrumentationRemainingCount = instrumentationTotalCount - instrumentationVerifiedCount;

    const safetyAssets = assets.filter(a => !isItEquipment(a) && a.category === 'Safety');
    const safetyTotalCount = safetyAssets.length;
    const safetyVerifiedCount = safetyAssets.filter(isPhysicallyVerified).length;
    const safetyRemainingCount = safetyTotalCount - safetyVerifiedCount;

    const industrialAssets = assets.filter(a => 
      !isItEquipment(a) && 
      a.category !== 'Electrical' && 
      a.category !== 'Instrumentation' && 
      a.category !== 'Safety'
    );
    const industrialTotalCount = industrialAssets.length;
    const industrialVerifiedCount = industrialAssets.filter(isPhysicallyVerified).length;
    const industrialRemainingCount = industrialTotalCount - industrialVerifiedCount;

    const discrepancyCount = assets.filter(a => a.inventoryStatus === 'ECART_LOCALISATION').length;
    const missingCount = assets.filter(a => a.inventoryStatus === 'MANQUANT').length;
    const unverifiedCount = assets.filter(a => a.inventoryStatus === 'NON_VERIFIE').length;

    return {
      totalCount, verifiedCount, remainingCount, verifiedPercent,
      itTotalCount, itVerifiedCount, itRemainingCount, itVerifiedPercent,
      electricalTotalCount, electricalVerifiedCount, electricalRemainingCount,
      instrumentationTotalCount, instrumentationVerifiedCount, instrumentationRemainingCount,
      safetyTotalCount, safetyVerifiedCount, safetyRemainingCount,
      industrialTotalCount, industrialVerifiedCount, industrialRemainingCount,
      discrepancyCount, missingCount, unverifiedCount
    };
  }, [assets]);

  // =========================================================================
  // FILTERED ASSETS PIPELINE
  // =========================================================================
  const filteredAssets = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return assets.filter(asset => {
      if (verificationFilter === 'VERIFIED' && !isPhysicallyVerified(asset)) return false;
      if (verificationFilter === 'PENDING' && (isPhysicallyVerified(asset) || asset.inventoryStatus === 'MANQUANT')) return false;
      if (verificationFilter === 'DISCREPANCY' && asset.inventoryStatus !== 'ECART_LOCALISATION') return false;
      if (verificationFilter === 'MISSING' && asset.inventoryStatus !== 'MANQUANT') return false;

      if (equipmentTypeFilter === 'PC_IT' && !isItEquipment(asset)) return false;
      if (equipmentTypeFilter === 'INDUSTRIAL' && (isItEquipment(asset) || (asset.category !== 'Automation' && asset.category !== 'Mechanical'))) return false;
      if (equipmentTypeFilter === 'ELECTRICAL' && asset.category !== 'Electrical') return false;
      if (equipmentTypeFilter === 'INSTRUMENTATION' && asset.category !== 'Instrumentation') return false;
      if (equipmentTypeFilter === 'SAFETY' && asset.category !== 'Safety') return false;

      if (siteFilter !== 'ALL' && asset.site !== siteFilter) return false;
      if (buildingFilter !== 'ALL' && asset.building !== buildingFilter) return false;
      if (floorFilter !== 'ALL' && asset.floor !== floorFilter) return false;
      if (roomFilter !== 'ALL' && asset.roomOrOffice !== roomFilter) return false;

      if (q) {
        const matchesName = asset.name.toLowerCase().includes(q) || (asset.nameFr && asset.nameFr.toLowerCase().includes(q)) || (asset.nameAr && asset.nameAr.toLowerCase().includes(q));
        const matchesCode = asset.id.toLowerCase().includes(q) || asset.officialCode.toLowerCase().includes(q) || asset.barcode.toLowerCase().includes(q) || asset.serialNumber.toLowerCase().includes(q) || (asset.rfidTag && asset.rfidTag.toLowerCase().includes(q)) || (asset.sku && asset.sku.toLowerCase().includes(q));
        const matchesLocation = (asset.site && asset.site.toLowerCase().includes(q)) || (asset.building && asset.building.toLowerCase().includes(q)) || (asset.floor && asset.floor.toLowerCase().includes(q)) || (asset.roomOrOffice && asset.roomOrOffice.toLowerCase().includes(q)) || (asset.exactPosition && asset.exactPosition.toLowerCase().includes(q)) || asset.expectedBayLocation.toLowerCase().includes(q) || (asset.scannedBayLocation && asset.scannedBayLocation.toLowerCase().includes(q)) || asset.zone.toLowerCase().includes(q);
        return matchesName || matchesCode || matchesLocation;
      }
      return true;
    });
  }, [assets, searchQuery, verificationFilter, equipmentTypeFilter, siteFilter, buildingFilter, floorFilter, roomFilter]);

  // Quick Action: Confirm verification in situ
  const handleQuickVerify = (asset: Asset) => {
    if (onUpdateInventoryStatus) {
      sound.playScanSuccess();
      onUpdateInventoryStatus(asset.id, 'CONFORME');
    }
  };

  // Quick Action: Verify ALL filtered assets
  const handleVerifyAllFiltered = () => {
    if (!onUpdateInventoryStatus) return;
    const unverified = filteredAssets.filter(a => !isPhysicallyVerified(a));
    if (unverified.length === 0) {
      sound.playAlert(); // ✅ تم التصحيح هنا
      return;
    }
    const confirmMsg = lang === 'ar'
      ? `هل أنت متأكد من تأكيد ${unverified.length} منتج(ة)؟`
      : `Confirmer la vérification de ${unverified.length} équipement(s) ?`;
    if (window.confirm(confirmMsg)) {
      unverified.forEach(a => onUpdateInventoryStatus(a.id, 'CONFORME'));
      sound.playScanSuccess();
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    sound.playTap();
    const headers = [
      'Identifiant (ID)', 'Code Officiel Immobilisation', 'Désignation / Nom', 'Catégorie', 'Type d\'Équipement',
      'Numéro de Série', 'Code-barres', 'Tag RFID', 'Statut Inventaire', 'Site', 'Bâtiment', 'Étage', 'Bureau / Zone',
      'Emplacement Précis', 'Date Dernière Vérification', 'Vérifié Par'
    ];

    const categoryLabel = (a: Asset): string => {
      const cat = getEquipmentCategory(a);
      switch (cat) {
        case 'PC_IT': return 'PC & Informatique';
        case 'ELECTRICAL': return 'Électrique';
        case 'INSTRUMENTATION': return 'Instrumentation';
        case 'SAFETY': return 'Sécurité';
        default: return a.category || 'Industriel';
      }
    };

    const rows = filteredAssets.map(a => [
      `"${a.id}"`, `"${a.officialCode}"`, `"${a.name.replace(/"/g, '""')}"`, `"${categoryLabel(a)}"`, `"${a.equipmentType || a.category}"`,
      `"${a.serialNumber}"`, `"${a.barcode}"`, `"${a.rfidTag || ''}"`, `"${a.inventoryStatus}"`, `"${a.site || 'Site Principal Kotama'}"`,
      `"${a.building || 'Bâtiment Principal'}"`, `"${a.floor || 'RDC'}"`, `"${a.roomOrOffice || a.expectedBayLocation}"`, `"${a.exactPosition || a.expectedBayLocation}"`,
      `"${a.lastScannedAt || 'En attente'}"`, `"${a.scannedBy || 'N/A'}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `kaf_inventaire_complet_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintReport = () => {
    sound.playTap();
    window.print();
  };

  const isRtl = lang === 'ar';

  return (
    <div className="flex-1 h-full bg-[#F8FAFC] text-slate-900 font-sans overflow-y-auto overflow-x-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="bg-white border-b border-slate-200 px-4 lg:px-6 py-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider bg-slate-900 text-emerald-400 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1.5">
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lang === 'ar' ? 'وحدة المتابعة الميدانية' : 'CONTRÔLE PHYSIQUE DES ACTIFS'}</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">KAF-AUDIT-v4</span>
            </div>
            <h1 className="text-lg lg:text-xl font-bold tracking-tight text-slate-900 mt-1">
              {lang === 'ar' ? 'جميع المنتجات والمعدات — متابعة شاملة' : 'Inventaire complet — Tous les produits de l\'entreprise'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {lang === 'ar' ? 'متابعة حية لجميع الأجهزة والمعدات (كمبيوتر، كهرباء، صناعة، قياس، سلامة) مع تحديد الموقع الدقيق' : 'Traçabilité temps réel de tous les équipements (PC, Électrique, Industriel, Instrumentation, Sécurité)'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button onClick={handleExportCsv} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer" title="Exporter la liste filtrée au format Excel/CSV">
              <Download className="w-3.5 h-3.5 text-slate-500" /><span>{lang === 'ar' ? 'تصدير CSV' : 'Export Excel / CSV'}</span>
            </button>
            <button onClick={handlePrintReport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer" title="Imprimer le bordereau">
              <Printer className="w-3.5 h-3.5 text-slate-500" /><span>{lang === 'ar' ? 'طباعة تقرير' : 'Imprimer'}</span>
            </button>
            {onUpdateInventoryStatus && stats.remainingCount > 0 && (
              <button onClick={handleVerifyAllFiltered} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer" title={lang === 'ar' ? 'تأكيد جميع المنتجات المفلترة' : 'Confirmer tous les équipements filtrés'}>
                <CheckCheck className="w-3.5 h-3.5" /><span>{lang === 'ar' ? 'تأكيد الكل' : 'Tout valider'}</span>
              </button>
            )}
          </div>
        </div>

        {/* GRILLE DE KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 relative overflow-hidden">
            <div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">{lang === 'ar' ? 'إجمالي المعدات المسجلة' : 'Total des Équipements'}</span><HardDrive className="w-4 h-4 text-slate-400" /></div>
            <div className="flex items-baseline gap-2 mt-1"><span className="text-2xl font-bold font-mono text-slate-900">{stats.totalCount}</span><span className="text-xs text-slate-500">{lang === 'ar' ? 'أصل في القاعدة' : 'unités recensées'}</span></div>
            <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-1"><span>{stats.itTotalCount} PC</span><span aria-hidden="true">&bull;</span><span>{stats.electricalTotalCount} Élec.</span><span aria-hidden="true">&bull;</span><span>{stats.industrialTotalCount} Ind.</span><span aria-hidden="true">&bull;</span><span>{stats.safetyTotalCount} Sécu.</span></div>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 relative overflow-hidden">
            <div className="flex items-center justify-between"><span className="text-xs font-semibold text-emerald-800">{lang === 'ar' ? 'المعدات المؤكدة فعلياً' : 'Équipements Vérifiés'}</span><div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700"><CheckCircle2 className="w-4 h-4" /></div></div>
            <div className="flex items-baseline gap-2 mt-1"><span className="text-2xl font-bold font-mono text-emerald-900">{stats.verifiedCount}</span><span className="text-xs font-bold text-emerald-700">/ {stats.totalCount} ({stats.verifiedPercent}%)</span></div>
            <div className="text-[11px] text-emerald-800 font-medium mt-1 flex items-center gap-1 flex-wrap"><Laptop className="w-3.5 h-3.5 text-emerald-700 shrink-0" /><span><strong>{stats.itVerifiedCount}</strong> PC</span><span>&bull;</span><Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" /><span><strong>{stats.electricalVerifiedCount}</strong> Élec.</span><span>&bull;</span><Wrench className="w-3.5 h-3.5 text-slate-600 shrink-0" /><span><strong>{stats.industrialVerifiedCount}</strong> Ind.</span></div>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 relative overflow-hidden">
            <div className="flex items-center justify-between"><span className="text-xs font-semibold text-amber-800">{lang === 'ar' ? 'المتبقي بانتظار الفحص' : 'Restant à Vérifier'}</span><div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-700"><Clock className="w-4 h-4" /></div></div>
            <div className="flex items-baseline gap-2 mt-1"><span className="text-2xl font-bold font-mono text-amber-900">{stats.remainingCount}</span><span className="text-xs text-amber-700">{lang === 'ar' ? 'معدة قيد الجرد' : 'en attente de passage'}</span></div>
            <div className="text-[11px] text-amber-800 font-medium mt-1"><span>{stats.itRemainingCount} PC &bull; {stats.electricalRemainingCount} Élec. &bull; {stats.industrialRemainingCount} Ind. &bull; {stats.safetyRemainingCount} Sécu.</span></div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3 relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs mb-1"><span className="font-semibold text-slate-700">{lang === 'ar' ? 'معدل التغطية الفعلي' : 'Taux d\'Exécution Physique'}</span><span className="font-mono font-bold text-emerald-700">{stats.verifiedPercent}%</span></div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200"><div className="bg-emerald-500 h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${stats.verifiedPercent}%` }} /></div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 mt-2">
              <span className="flex items-center gap-1 text-amber-700"><AlertCircle className="w-3.5 h-3.5" /><span>{stats.discrepancyCount} {lang === 'ar' ? 'فروق موقع' : 'écarts'}</span></span>
              <span className="flex items-center gap-1 text-rose-700"><AlertTriangle className="w-3.5 h-3.5" /><span>{stats.missingCount} {lang === 'ar' ? 'مفقود' : 'manquants'}</span></span>
            </div>
          </div>
        </div>

        {/* CARD 5 : RÉPARTITION */}
        <div className="mt-3 bg-white border border-slate-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" />{lang === 'ar' ? 'توزيع جميع المعدات حسب الفئة' : 'Répartition de TOUS les produits par catégorie'}</div>
            <span className="text-[10px] font-mono text-slate-400">{assets.length} {lang === 'ar' ? 'وحدة' : 'unités'}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
            <div className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200"><div className="flex items-center gap-1.5 min-w-0"><Laptop className="w-3.5 h-3.5 text-blue-600 shrink-0" /><span className="font-semibold text-blue-900 truncate">PC & IT</span></div><span className="font-mono font-bold text-blue-900 shrink-0 ml-1">{stats.itVerifiedCount}/{stats.itTotalCount}</span></div>
            <div className="flex items-center justify-between p-2 bg-amber-50 rounded border border-amber-200"><div className="flex items-center gap-1.5 min-w-0"><Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" /><span className="font-semibold text-amber-900 truncate">{lang === 'ar' ? 'كهرباء' : 'Électrique'}</span></div><span className="font-mono font-bold text-amber-900 shrink-0 ml-1">{stats.electricalVerifiedCount}/{stats.electricalTotalCount}</span></div>
            <div className="flex items-center justify-between p-2 bg-slate-100 rounded border border-slate-300"><div className="flex items-center gap-1.5 min-w-0"><Wrench className="w-3.5 h-3.5 text-slate-700 shrink-0" /><span className="font-semibold text-slate-900 truncate">{lang === 'ar' ? 'صناعي' : 'Industriel'}</span></div><span className="font-mono font-bold text-slate-900 shrink-0 ml-1">{stats.industrialVerifiedCount}/{stats.industrialTotalCount}</span></div>
            <div className="flex items-center justify-between p-2 bg-purple-50 rounded border border-purple-200"><div className="flex items-center gap-1.5 min-w-0"><Gauge className="w-3.5 h-3.5 text-purple-600 shrink-0" /><span className="font-semibold text-purple-900 truncate">{lang === 'ar' ? 'قياس' : 'Instrum.'}</span></div><span className="font-mono font-bold text-purple-900 shrink-0 ml-1">{stats.instrumentationVerifiedCount}/{stats.instrumentationTotalCount}</span></div>
            <div className="flex items-center justify-between p-2 bg-rose-50 rounded border border-rose-200"><div className="flex items-center gap-1.5 min-w-0"><Shield className="w-3.5 h-3.5 text-rose-600 shrink-0" /><span className="font-semibold text-rose-900 truncate">{lang === 'ar' ? 'سلامة' : 'Sécurité'}</span></div><span className="font-mono font-bold text-rose-900 shrink-0 ml-1">{stats.safetyVerifiedCount}/{stats.safetyTotalCount}</span></div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          NIVEAU 2 — BARRE D'OUTILS DE RECHERCHE ET FILTRES
          ========================================================================= */}
      <div className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[280px] max-w-2xl relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3 pointer-events-none" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={lang === 'ar' ? 'ابحث باسم الجهاز، الرمز، الباركود، السيريال، الموقع، المبنى، المكتب...' : 'Rechercher par nom, code (IMMO/AST), n° série, bâtiment, bureau, zone...'} className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 pl-9 pr-8 rtl:pl-8 rtl:pr-9 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-mono transition-colors" />
            {searchQuery && <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5" title="Effacer"><X className="w-3.5 h-3.5" /></button>}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-mono hidden sm:inline"><strong>{filteredAssets.length}</strong> {lang === 'ar' ? 'عنصر مطابق' : 'équipement(s)'}</span>
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
              <button onClick={() => { setViewMode('table'); sound.playTap(); }} className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}>{lang === 'ar' ? 'جدول' : 'Tableau'}</button>
              <button onClick={() => { setViewMode('cards'); sound.playTap(); }} className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}>{lang === 'ar' ? 'بطاقات' : 'Fiches'}</button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200">
            <button onClick={() => { setVerificationFilter('ALL'); sound.playTap(); }} className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${verificationFilter === 'ALL' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>{lang === 'ar' ? 'الكل' : 'Tous'} ({stats.totalCount})</button>
            <button onClick={() => { setVerificationFilter('VERIFIED'); sound.playTap(); }} className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${verificationFilter === 'VERIFIED' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>✓ {lang === 'ar' ? 'المتحقق منها' : 'Vérifiés'} ({stats.verifiedCount})</button>
            <button onClick={() => { setVerificationFilter('PENDING'); sound.playTap(); }} className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${verificationFilter === 'PENDING' ? 'bg-amber-600 text-white shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}>⏳ {lang === 'ar' ? 'المتبقية' : 'Restants'} ({stats.remainingCount})</button>
            {stats.discrepancyCount > 0 && (
              <button onClick={() => { setVerificationFilter('DISCREPANCY'); sound.playTap(); }} className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${verificationFilter === 'DISCREPANCY' ? 'bg-amber-500 text-black shadow-xs font-bold' : 'text-amber-800 hover:bg-amber-100'}`}>⚠️ {lang === 'ar' ? 'فرق الموقع' : 'Ecart'} ({stats.discrepancyCount})</button>
            )}
          </div>

          <div className="h-4 w-px bg-slate-200 hidden md:block" />

          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-500 font-medium">Type :</span>
            <select value={equipmentTypeFilter} onChange={(e) => { setEquipmentTypeFilter(e.target.value as EquipmentTypeFilter); sound.playTap(); }} className="bg-white border border-slate-300 rounded-md py-1 px-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-600 cursor-pointer">
              <option value="ALL">{lang === 'ar' ? 'كل المعدات والأجهزة' : 'Tous les types'}</option>
              <option value="PC_IT">💻 PC & Informatique ({stats.itTotalCount})</option>
              <option value="ELECTRICAL">⚡ Électrique ({stats.electricalTotalCount})</option>
              <option value="INDUSTRIAL">⚙️ Industriel ({stats.industrialTotalCount})</option>
              <option value="INSTRUMENTATION">🔬 Instrumentation ({stats.instrumentationTotalCount})</option>
              <option value="SAFETY">🛡️ Sécurité ({stats.safetyTotalCount})</option>
            </select>
          </div>

          {availableSites.length > 0 && <div className="flex items-center gap-1"><span className="text-[11px] text-slate-500 font-medium">Site :</span><select value={siteFilter} onChange={(e) => { setSiteFilter(e.target.value); sound.playTap(); }} className="bg-white border border-slate-300 rounded-md py-1 px-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-600 cursor-pointer max-w-[160px] truncate"><option value="ALL">{lang === 'ar' ? 'كافة المواقع' : 'Tous les sites'}</option>{availableSites.map(s => <option key={s} value={s}>{s}</option>)}</select></div>}
          {availableBuildings.length > 0 && <div className="flex items-center gap-1"><span className="text-[11px] text-slate-500 font-medium">Bâtiment :</span><select value={buildingFilter} onChange={(e) => { setBuildingFilter(e.target.value); sound.playTap(); }} className="bg-white border border-slate-300 rounded-md py-1 px-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-600 cursor-pointer max-w-[150px] truncate"><option value="ALL">{lang === 'ar' ? 'كل المباني' : 'Tous les bâtiments'}</option>{availableBuildings.map(b => <option key={b} value={b}>{b}</option>)}</select></div>}
          {availableFloors.length > 0 && <div className="flex items-center gap-1"><span className="text-[11px] text-slate-500 font-medium">Étage :</span><select value={floorFilter} onChange={(e) => { setFloorFilter(e.target.value); sound.playTap(); }} className="bg-white border border-slate-300 rounded-md py-1 px-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-600 cursor-pointer"><option value="ALL">{lang === 'ar' ? 'كل الطوابق' : 'Tous les étages'}</option>{availableFloors.map(f => <option key={f} value={f}>{f}</option>)}</select></div>}
          {availableRooms.length > 0 && <div className="flex items-center gap-1"><span className="text-[11px] text-slate-500 font-medium">{lang === 'ar' ? 'المكتب:' : 'Bureau :'}</span><select value={roomFilter} onChange={(e) => { setRoomFilter(e.target.value); sound.playTap(); }} className="bg-white border border-slate-300 rounded-md py-1 px-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-600 cursor-pointer max-w-[180px] truncate"><option value="ALL">{lang === 'ar' ? 'كل المكاتب' : 'Tous les bureaux'}</option>{availableRooms.map(r => <option key={r} value={r}>{r}</option>)}</select></div>}

          {(searchQuery || verificationFilter !== 'ALL' || equipmentTypeFilter !== 'ALL' || siteFilter !== 'ALL' || buildingFilter !== 'ALL' || floorFilter !== 'ALL' || roomFilter !== 'ALL') && (
            <button onClick={() => { setSearchQuery(''); setVerificationFilter('ALL'); setEquipmentTypeFilter('ALL'); setSiteFilter('ALL'); setBuildingFilter('ALL'); setFloorFilter('ALL'); setRoomFilter('ALL'); sound.playTap(); }} className="text-xs text-rose-600 hover:text-rose-800 underline font-medium ml-auto">{lang === 'ar' ? 'إعادة ضبط الفلاتر' : 'Réinitialiser les filtres'}</button>
          )}
        </div>
      </div>

      {/* =========================================================================
          NIVEAU 3 — CONTENU PRINCIPAL
          ========================================================================= */}
      <div className="p-4 lg:p-6">
        {filteredAssets.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3"><Search className="w-6 h-6" /></div>
            <h3 className="font-bold text-sm text-slate-800">{lang === 'ar' ? 'لم يتم العثور على أجهزة مطابقة' : 'Aucun équipement ne correspond à vos filtres'}</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">{lang === 'ar' ? 'جرّب تعديل كلمات البحث أو اختيار مرشح آخر' : 'Modifiez vos critères de recherche ou réinitialisez les filtres.'}</p>
            <button onClick={() => { setSearchQuery(''); setVerificationFilter('ALL'); setEquipmentTypeFilter('ALL'); setSiteFilter('ALL'); setBuildingFilter('ALL'); setFloorFilter('ALL'); setRoomFilter('ALL'); }} className="mt-4 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors">{lang === 'ar' ? 'عرض جميع المعدات' : 'Afficher tous les équipements'}</button>
          </div>
        ) : viewMode === 'table' ? (
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Statut & Équipement</th>
                    <th className="py-2.5 px-3">Codes d'Identification</th>
                    <th className="py-2.5 px-3">Emplacement Exact</th>
                    <th className="py-2.5 px-3">Vérification Physique</th>
                    <th className="py-2.5 px-3 text-right rtl:text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredAssets.map(asset => {
                    const isVerified = isPhysicallyVerified(asset);
                    const isIt = isItEquipment(asset);
                    const cat = getEquipmentCategory(asset);

                    const catConfig = (() => {
                      switch (cat) {
                        case 'PC_IT': return { icon: <Laptop className="w-4 h-4" />, bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' };
                        case 'ELECTRICAL': return { icon: <Zap className="w-4 h-4" />, bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' };
                        case 'INSTRUMENTATION': return { icon: <Gauge className="w-4 h-4" />, bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' };
                        case 'SAFETY': return { icon: <Shield className="w-4 h-4" />, bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' };
                        default: return { icon: <Wrench className="w-4 h-4" />, bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' };
                      }
                    })();

                    return (
                      <tr key={asset.id} className={`hover:bg-slate-50/80 transition-colors ${asset.inventoryStatus === 'ECART_LOCALISATION' ? 'bg-amber-50/20' : ''}`}>
                        <td className="py-3 px-3 align-top">
                          <div className="flex items-start gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${catConfig.bg} ${catConfig.text} ${catConfig.border}`}>{catConfig.icon}</div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2"><span className="font-bold text-slate-900 text-xs hover:text-emerald-700 cursor-pointer" onClick={() => onSelectAsset && onSelectAsset(asset)}>{lang === 'ar' && asset.nameAr ? asset.nameAr : asset.name}</span></div>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5"><span className="font-medium text-slate-600">{isIt ? (asset.equipmentType?.replace('_', ' ') || 'PC & IT') : asset.category}</span>{asset.brand && <><span aria-hidden="true">&bull;</span><span>{asset.brand}</span></>}</div>
                              <div className="mt-1 flex items-center gap-1.5">
                                {isVerified ? (
                                  asset.inventoryStatus === 'ECART_LOCALISATION' ? <span className="text-[11px] font-semibold text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /><span>ÉCART D'EMPLACEMENT</span></span> : <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /><span>CONFIRMÉ IN SITU</span></span>
                                ) : asset.inventoryStatus === 'MANQUANT' ? <span className="text-[11px] font-semibold text-rose-700 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /><span>MANQUANT</span></span> : <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" /><span>EN ATTENTE</span></span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 align-top font-mono text-[11px]">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5"><span className="text-slate-400 font-sans text-[10px]">Immo:</span><span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">{asset.officialCode}</span></div>
                            <div className="flex items-center gap-1.5"><span className="text-slate-400 font-sans text-[10px]">ID:</span><span className="font-semibold text-emerald-800">{asset.id}</span></div>
                            <div className="flex items-center gap-1.5 text-slate-600"><span className="text-slate-400 font-sans text-[10px]">S/N:</span><span>{asset.serialNumber}</span></div>
                          </div>
                        </td>
                        <td className="py-3 px-3 align-top text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-900"><Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" /><span>{asset.site || 'Site Kotama'}</span><span className="text-slate-400 font-normal">/</span><span className="text-slate-700">{asset.building || 'Bât. Principal'}</span></div>
                            <div className="flex items-center gap-1.5 text-slate-700 font-medium"><MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" /><span className="text-slate-900 font-semibold">{asset.floor || 'RDC'}</span><span className="text-slate-400">&bull;</span><span className="text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 text-[11px] font-bold">{asset.roomOrOffice || asset.expectedBayLocation}</span></div>
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1"><span>Position: {asset.exactPosition || asset.expectedBayLocation}</span></div>
                            {asset.inventoryStatus === 'ECART_LOCALISATION' && asset.scannedBayLocation && <div className="text-[10px] font-medium text-amber-800 bg-amber-50 p-1 rounded border border-amber-200 mt-1"><span className="font-bold">Constaté :</span> {asset.scannedBayLocation}</div>}
                          </div>
                        </td>
                        <td className="py-3 px-3 align-top text-[11px]">
                          {asset.lastScannedAt ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-slate-700 font-mono"><Clock className="w-3.5 h-3.5 text-slate-400" /><span>{asset.lastScannedAt}</span></div>
                              <div className="flex items-center gap-1.5 text-slate-600"><UserCheck className="w-3.5 h-3.5 text-emerald-600" /><span>Op: <strong>{asset.scannedBy || 'TECH-941'}</strong></span></div>
                              <div className="text-[10px] text-slate-500">État: <strong className="uppercase">{asset.condition}</strong> &bull; Scellé: {asset.tamperSealIntact ? '✓' : '⚠️'}</div>
                            </div>
                          ) : <div className="text-slate-400 italic">Non encore scanné</div>}
                        </td>
                        <td className="py-3 px-3 align-top text-right rtl:text-left">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isVerified && <button onClick={() => handleQuickVerify(asset)} className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer" title="Valider in situ"><CheckCircle2 className="w-3.5 h-3.5" /><span>{lang === 'ar' ? 'تأكيد' : 'Valider'}</span></button>}
                            <button onClick={() => onSelectAsset && onSelectAsset(asset)} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors" title="Inspecter"><Eye className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredAssets.map(asset => {
              const isVerified = isPhysicallyVerified(asset);
              const isIt = isItEquipment(asset);
              const cat = getEquipmentCategory(asset);

              const catConfig = (() => {
                switch (cat) {
                  case 'PC_IT': return { icon: <Laptop className="w-4 h-4" />, bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', label: 'PC & IT' };
                  case 'ELECTRICAL': return { icon: <Zap className="w-4 h-4" />, bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', label: 'Électrique' };
                  case 'INSTRUMENTATION': return { icon: <Gauge className="w-4 h-4" />, bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', label: 'Instrumentation' };
                  case 'SAFETY': return { icon: <Shield className="w-4 h-4" />, bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', label: 'Sécurité' };
                  default: return { icon: <Wrench className="w-4 h-4" />, bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', label: 'Industriel' };
                }
              })();

              return (
                <div key={asset.id} className={`bg-white rounded-xl border p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${isVerified ? 'border-emerald-200 ring-1 ring-emerald-500/10' : 'border-slate-200'}`}>
                  <div>
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${catConfig.bg} ${catConfig.text} ${catConfig.border}`}>{catConfig.icon}</div>
                        <div>
                          <span className="font-mono text-[10px] font-bold text-slate-500 block">{asset.officialCode}</span>
                          <h3 className="font-bold text-xs text-slate-900 hover:text-emerald-700 cursor-pointer line-clamp-1" onClick={() => onSelectAsset && onSelectAsset(asset)} title={asset.name}>{lang === 'ar' && asset.nameAr ? asset.nameAr : asset.name}</h3>
                          <span className="text-[10px] text-slate-400 font-medium">{catConfig.label}</span>
                        </div>
                      </div>
                      {isVerified ? <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0"><CheckCircle2 className="w-3 h-3 text-emerald-600" /><span>VÉRIFIÉ</span></span> : <span className="flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0"><Clock className="w-3 h-3 text-amber-600" /><span>EN ATTENTE</span></span>}
                    </div>

                    <div className="py-3 border-b border-slate-100 space-y-1.5 text-xs">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Emplacement Physique</div>
                      <div className="flex items-center gap-1.5 font-semibold text-slate-900"><Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span>{asset.site || 'Site Kotama'}</span><span className="text-slate-400 font-normal">/</span><span>{asset.building || 'Bât. Principal'}</span></div>
                      <div className="flex items-center gap-1.5 text-emerald-900 font-bold bg-emerald-50/80 p-1.5 rounded border border-emerald-200/80"><MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" /><span>{asset.floor || 'RDC'} &bull; {asset.roomOrOffice || asset.expectedBayLocation}</span></div>
                      <div className="text-[11px] text-slate-500 font-mono pl-5 rtl:pl-0 rtl:pr-5">Position: {asset.exactPosition || asset.expectedBayLocation}</div>
                    </div>

                    <div className="py-2.5 text-[11px] font-mono text-slate-600 space-y-1">
                      <div className="flex justify-between"><span className="text-slate-400 font-sans">N° Série:</span><span className="font-semibold text-slate-900">{asset.serialNumber}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400 font-sans">Code-barres:</span><span>{asset.barcode}</span></div>
                      {asset.lastScannedAt && <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-100"><span className="text-slate-400 font-sans">Vérifié le:</span><span>{asset.lastScannedAt}</span></div>}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                    <div className="flex items-center gap-1.5">
                      {!isVerified ? <button onClick={() => handleQuickVerify(asset)} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer"><CheckCircle2 className="w-3.5 h-3.5" /><span>Confirmer</span></button> : <button onClick={() => onSelectAsset && onSelectAsset(asset)} className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"><Eye className="w-3.5 h-3.5" /><span>Fiche</span></button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};