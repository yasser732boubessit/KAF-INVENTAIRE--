import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Scan, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Plus, 
  ArrowUpDown, 
  Filter, 
  Zap,
  CheckSquare,
  Square,
  ChevronRight,
  TrendingUp,
  Tag,
  Eye
} from 'lucide-react';
import { Asset, AssetStatus, Language } from '../types';
import { translations } from '../translations';
import { sound } from '../utils/audio';

interface ReconciliationCockpitProps {
  assets: Asset[];
  selectedAsset: Asset | null;
  onSelectAsset: (asset: Asset) => void;
  onUpdateAssetStatus: (assetId: string, newStatus: AssetStatus) => void;
  onOpenNewAssetModal: () => void;
  onTriggerSimulatedScan: (customCode?: string) => void;
  lang: Language;
}

export const ReconciliationCockpit: React.FC<ReconciliationCockpitProps> = ({
  assets,
  selectedAsset,
  onSelectAsset,
  onUpdateAssetStatus,
  onOpenNewAssetModal,
  onTriggerSimulatedScan,
  lang
}) => {
  const t = translations[lang];

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AssetStatus>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<keyof Asset>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Metrics computation
  const totalCount = assets.length;
  const reconciledCount = assets.filter(a => a.status === 'reconciled').length;
  const discrepancyCount = assets.filter(a => a.status === 'discrepancy').length;
  const missingCount = assets.filter(a => a.status === 'missing').length;
  const unscannedCount = assets.filter(a => a.status === 'unscanned' || a.status === 'staging').length;
  const progressPercent = totalCount > 0 ? Math.round((reconciledCount / totalCount) * 100) : 0;

  // Filtered & sorted assets
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      // Status filter
      if (statusFilter !== 'all' && asset.status !== statusFilter) return false;
      // Search filter (ID, Name, Serial, Barcode, Bay Location)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches = 
          asset.id.toLowerCase().includes(q) ||
          asset.name.toLowerCase().includes(q) ||
          asset.nameAr.toLowerCase().includes(q) ||
          asset.serialNumber.toLowerCase().includes(q) ||
          asset.barcode.toLowerCase().includes(q) ||
          asset.bayLocation.toLowerCase().includes(q) ||
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
    
    // Find matching asset
    const query = searchQuery.trim().toLowerCase();
    const match = assets.find(
      a => a.barcode.toLowerCase() === query || 
           a.serialNumber.toLowerCase() === query || 
           a.id.toLowerCase() === query
    );

    if (match) {
      sound.playScanSuccess();
      onSelectAsset(match);
      onUpdateAssetStatus(match.id, 'reconciled');
      setSearchQuery('');
    } else {
      sound.playAlert();
      // Still search filter
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
      onUpdateAssetStatus(id, 'reconciled');
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

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] overflow-y-auto">
      {/* Session Header Strip */}
      <div className="bg-white border-b border-[#E2E8F0] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono-numbers text-xs font-bold bg-[#0F172A] text-sky-400 px-2 py-0.5 rounded">
                AUD-2026-Q1-WEST
              </span>
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                {t.screenCockpit}
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.auditor}: <span className="font-mono-numbers font-semibold text-slate-700">TECH-941 (Al-Mansoor)</span> | {t.zone}: <span className="font-mono-numbers font-semibold text-slate-700">WEST-DC-ZONE-C</span>
            </p>
          </div>

          {/* Rapid Trigger & New Asset Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onTriggerSimulatedScan()}
              className="flex items-center gap-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white px-3 py-1.5 rounded text-xs font-semibold shadow-sm transition-all active:scale-99 border border-sky-600"
              title="محاكاة قراءة ليزرية فورية لأحد الأصول"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{t.quickScanDemo}</span>
            </button>

            <button
              onClick={onOpenNewAssetModal}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded text-xs font-semibold shadow-sm transition-all border border-slate-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.addNewAsset}</span>
            </button>
          </div>
        </div>

        {/* Dense KPI Operational Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-3 pt-3 border-t border-[#F1F5F9]">
          {/* Progress / Completion Rate */}
          <div className="bg-[#F8FAFC] p-2.5 rounded border border-[#E2E8F0] relative overflow-hidden">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              {t.progress}
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold font-mono-numbers text-slate-900">{progressPercent}%</span>
              <span className="text-[11px] font-mono-numbers text-slate-500">{reconciledCount}/{totalCount}</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="bg-[#10B981] h-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }} 
              />
            </div>
          </div>

          {/* Reconciled Count */}
          <div className="bg-[#ECFDF5] p-2.5 rounded border border-[#A7F3D0]">
            <div className="text-[11px] font-semibold text-[#065F46] flex items-center justify-between">
              <span>{t.reconciled}</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
            </div>
            <div className="text-xl font-bold font-mono-numbers text-[#065F46] mt-1">
              {reconciledCount}
            </div>
            <div className="text-[10px] text-emerald-700 mt-0.5">مطابقة فزيائية كاملة</div>
          </div>

          {/* Discrepancies Count */}
          <div className="bg-[#FFFBEB] p-2.5 rounded border border-[#FDE68A]">
            <div className="text-[11px] font-semibold text-[#92400E] flex items-center justify-between">
              <span>{t.discrepancies}</span>
              <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
            </div>
            <div className="text-xl font-bold font-mono-numbers text-[#92400E] mt-1">
              {discrepancyCount}
            </div>
            <div className="text-[10px] text-amber-700 mt-0.5">أختام مكسورة / تلف</div>
          </div>

          {/* Missing Count */}
          <div className="bg-[#FEF2F2] p-2.5 rounded border border-[#FECACA]">
            <div className="text-[11px] font-semibold text-[#991B1B] flex items-center justify-between">
              <span>{t.missing}</span>
              <XCircle className="w-3.5 h-3.5 text-[#EF4444]" />
            </div>
            <div className="text-xl font-bold font-mono-numbers text-[#991B1B] mt-1">
              {missingCount}
            </div>
            <div className="text-[10px] text-rose-700 mt-0.5">غير متواجد بالرف المخصص</div>
          </div>

          {/* Pending Scan */}
          <div className="bg-[#F1F5F9] p-2.5 rounded border border-[#CBD5E1]">
            <div className="text-[11px] font-semibold text-[#334155] flex items-center justify-between">
              <span>{t.unscanned}</span>
              <Clock className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="text-xl font-bold font-mono-numbers text-slate-800 mt-1">
              {unscannedCount}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">بانتظار دورة المسح</div>
          </div>

          {/* Scan Velocity */}
          <div className="bg-[#EFF6FF] p-2.5 rounded border border-[#BFDBFE]">
            <div className="text-[11px] font-semibold text-[#1E40AF] flex items-center justify-between">
              <span>{t.scanVelocity}</span>
              <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
            </div>
            <div className="text-xl font-bold font-mono-numbers text-[#1E40AF] mt-1">
              14.2
            </div>
            <div className="text-[10px] text-blue-700 mt-0.5">{t.assetsPerMin}</div>
          </div>
        </div>
      </div>

      {/* Barcode Fast Scan Input & Filters Strip */}
      <div className="p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Quick Input Box */}
          <form onSubmit={handleBarcodeSubmit} className="flex-1 flex items-center relative">
            <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
              <Scan className="w-4 h-4 text-sky-600" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full ps-9 pe-24 py-2 bg-white text-xs text-slate-900 border border-[#CBD5E1] rounded shadow-inner focus:outline-none focus:ring-2 focus:ring-[#0284C7] font-mono-numbers placeholder:font-sans"
            />
            <div className="absolute inset-y-0 end-0 pe-1.5 flex items-center gap-1">
              <span className="hidden sm:inline text-[10px] font-mono-numbers bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                [Enter] المسح
              </span>
              <button
                type="submit"
                className="bg-[#0F172A] hover:bg-slate-800 text-white px-2.5 py-1 rounded text-xs font-semibold"
              >
                مسح
              </button>
            </div>
          </form>

          {/* Filter Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t.filterAll} ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter('reconciled')}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-all ${
                statusFilter === 'reconciled'
                  ? 'bg-[#10B981] text-white shadow-sm'
                  : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              <span>{t.filterReconciled} ({reconciledCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('discrepancy')}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-all ${
                statusFilter === 'discrepancy'
                  ? 'bg-[#F59E0B] text-white shadow-sm'
                  : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
              <span>{t.filterDiscrepancy} ({discrepancyCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('missing')}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-all ${
                statusFilter === 'missing'
                  ? 'bg-[#EF4444] text-white shadow-sm'
                  : 'bg-white text-rose-800 border border-rose-200 hover:bg-rose-50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
              <span>{t.filterMissing} ({missingCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('unscanned')}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-all ${
                statusFilter === 'unscanned'
                  ? 'bg-slate-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>{t.filterUnscanned} ({unscannedCount})</span>
            </button>
          </div>
        </div>

        {/* Batch Operations Bar (if items selected) */}
        {selectedIds.size > 0 && (
          <div className="bg-[#0F172A] text-white px-3 py-2 rounded flex items-center justify-between text-xs animate-in fade-in">
            <div className="flex items-center gap-2 font-mono-numbers">
              <span className="bg-sky-500 text-slate-950 font-bold px-2 py-0.5 rounded-full text-[11px]">
                {selectedIds.size}
              </span>
              <span>عناصر محددة في الجدول</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchReconcile}
                className="bg-[#10B981] hover:bg-[#059669] text-white px-3 py-1 rounded font-semibold flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>تأكيد مطابقة المحدد</span>
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-slate-400 hover:text-white px-2 py-1"
              >
                إلغاء التحديد
              </button>
            </div>
          </div>
        )}

        {/* High-Density Industrial Tabular Grid */}
        <div className="bg-white border border-[#CBD5E1] rounded overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start border-collapse">
              <thead>
                <tr className="bg-[#F1F5F9] text-slate-700 font-semibold border-b border-[#CBD5E1] select-none text-[11px]">
                  <th className="p-2 w-9 text-center border-e border-slate-200">
                    <button 
                      onClick={toggleSelectAll} 
                      className="text-slate-600 hover:text-slate-900"
                      title="تحديد الكل"
                    >
                      {selectedIds.size === filteredAssets.length && filteredAssets.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-[#0284C7]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th 
                    onClick={() => handleSort('id')}
                    className="p-2 text-start font-mono-numbers border-e border-slate-200 cursor-pointer hover:bg-slate-200/80 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>{t.colAssetTag}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('nameAr')}
                    className="p-2 text-start border-e border-slate-200 cursor-pointer hover:bg-slate-200/80 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>{t.colDescription}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-2 text-start font-mono-numbers border-e border-slate-200">
                    {t.colSerial}
                  </th>
                  <th className="p-2 text-start font-mono-numbers border-e border-slate-200">
                    {t.colBarcode}
                  </th>
                  <th 
                    onClick={() => handleSort('bayLocation')}
                    className="p-2 text-start font-mono-numbers border-e border-slate-200 cursor-pointer hover:bg-slate-200/80"
                  >
                    <div className="flex items-center gap-1">
                      <span>{t.colLocation}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-2 text-start border-e border-slate-200">
                    {t.colCondition}
                  </th>
                  <th className="p-2 text-start border-e border-slate-200">
                    {t.colStatus}
                  </th>
                  <th className="p-2 text-start font-mono-numbers border-e border-slate-200">
                    {t.colLastScan}
                  </th>
                  <th className="p-2 text-center">
                    {t.colActions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 font-medium">
                      لا توجد أصول مطابقة لمعايير البحث الحالية
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => {
                    const isSelectedRow = selectedAsset?.id === asset.id;
                    const isChecked = selectedIds.has(asset.id);

                    // Condition chip
                    const conditionLabels: Record<string, { label: string; bg: string; text: string }> = {
                      nominal: { label: t.condNominal, bg: 'bg-emerald-50', text: 'text-emerald-700' },
                      minor_wear: { label: t.condMinorWear, bg: 'bg-amber-50', text: 'text-amber-700' },
                      needs_repair: { label: t.condNeedsRepair, bg: 'bg-orange-50', text: 'text-orange-700' },
                      damaged: { label: t.condDamaged, bg: 'bg-rose-50', text: 'text-rose-700' },
                      uninspected: { label: t.condUninspected, bg: 'bg-slate-100', text: 'text-slate-600' }
                    };
                    const cond = conditionLabels[asset.condition] || conditionLabels.uninspected;

                    return (
                      <tr
                        key={asset.id}
                        onClick={() => onSelectAsset(asset)}
                        className={`h-9 cursor-pointer transition-colors border-s-2 ${
                          isSelectedRow
                            ? 'bg-[#F0F9FF] border-s-[#0284C7]'
                            : 'hover:bg-[#F8FAFC] border-s-transparent'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="p-2 text-center border-e border-slate-100" onClick={(e) => toggleSelectRow(asset.id, e)}>
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-[#0284C7] inline-block" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 hover:text-slate-500 inline-block" />
                          )}
                        </td>

                        {/* Tag */}
                        <td className="p-2 font-mono-numbers font-bold text-slate-900 border-e border-slate-100 whitespace-nowrap">
                          {asset.id}
                        </td>

                        {/* Description */}
                        <td className="p-2 border-e border-slate-100 min-w-[180px]">
                          <div className="font-semibold text-slate-800 truncate">
                            {lang === 'ar' ? asset.nameAr : asset.name}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {asset.category} &bull; {asset.sku}
                          </div>
                        </td>

                        {/* Serial */}
                        <td className="p-2 font-mono-numbers text-slate-700 border-e border-slate-100 whitespace-nowrap">
                          {asset.serialNumber}
                        </td>

                        {/* Barcode */}
                        <td className="p-2 font-mono-numbers text-slate-600 border-e border-slate-100 whitespace-nowrap">
                          {asset.barcode}
                        </td>

                        {/* Location */}
                        <td className="p-2 font-mono-numbers font-medium text-sky-700 border-e border-slate-100 whitespace-nowrap">
                          <span className="bg-sky-50 px-1 py-0.5 rounded border border-sky-100">
                            {asset.bayLocation}
                          </span>
                        </td>

                        {/* Condition */}
                        <td className="p-2 border-e border-slate-100 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200 ${cond.bg} ${cond.text}`}>
                            {cond.label}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="p-2 border-e border-slate-100 whitespace-nowrap">
                          {asset.status === 'reconciled' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                              <span>{t.statReconciled}</span>
                            </span>
                          )}
                          {asset.status === 'discrepancy' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                              <span>{t.statDiscrepancy}</span>
                            </span>
                          )}
                          {asset.status === 'missing' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                              <span>{t.statMissing}</span>
                            </span>
                          )}
                          {(asset.status === 'unscanned' || asset.status === 'staging') && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#64748B]" />
                              <span>{t.statUnscanned}</span>
                            </span>
                          )}
                        </td>

                        {/* Last Scanned */}
                        <td className="p-2 font-mono-numbers text-[11px] text-slate-500 border-e border-slate-100 whitespace-nowrap">
                          {asset.lastScannedAt ? asset.lastScannedAt.substring(11, 19) : '—'}
                        </td>

                        {/* Inline Actions */}
                        <td className="p-2 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {asset.status !== 'reconciled' ? (
                              <button
                                onClick={() => {
                                  sound.playScanSuccess();
                                  onUpdateAssetStatus(asset.id, 'reconciled');
                                }}
                                className="px-2 py-0.5 bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] rounded font-semibold text-[11px] flex items-center gap-1"
                                title="تأكيد التوفيق الفوري"
                              >
                                <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                                <span>{t.btnVerify}</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  sound.playAlert();
                                  onUpdateAssetStatus(asset.id, 'discrepancy');
                                }}
                                className="px-1.5 py-0.5 text-slate-400 hover:text-amber-600 rounded text-[11px]"
                                title="تسجيل ملاحظة أو فرق"
                              >
                                <AlertTriangle className="w-3 h-3" />
                              </button>
                            )}

                            <button
                              onClick={() => onSelectAsset(asset)}
                              className="p-1 text-slate-400 hover:text-[#0284C7] rounded hover:bg-slate-100"
                              title="فحص التفاصيل"
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
          <div className="bg-[#F8FAFC] border-t border-[#CBD5E1] px-4 py-2 flex items-center justify-between text-xs text-slate-500 font-mono-numbers">
            <span>إجمالي الصفوف المعروضة: {filteredAssets.length} / {assets.length}</span>
            <span>STORAGE ENGINE: LOCAL_FIRST_CACHE v2.4</span>
          </div>
        </div>
      </div>
    </div>
  );
};
