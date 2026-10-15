import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ExternalLink,
  Info
} from 'lucide-react';
import { Asset, Language } from '../types';
import { translations } from '../translations';
import { sound } from '../utils/audio';

interface WarehouseMapViewProps {
  assets: Asset[];
  onSelectAsset: (asset: Asset) => void;
  onOpenCockpitWithFilter: (bayId: string) => void;
  lang: Language;
}

export const WarehouseMapView: React.FC<WarehouseMapViewProps> = ({
  assets,
  onSelectAsset,
  onOpenCockpitWithFilter,
  lang
}) => {
  const t = translations[lang];

  const bays = ['BAY-01', 'BAY-02', 'BAY-03', 'BAY-04'];
  const [selectedBay, setSelectedBay] = useState<string>('BAY-04');

  // Compute stats for each bay
  const getBayStats = (bayPrefix: string) => {
    const bayAssets = assets.filter(a => (a.scannedBayLocation || a.expectedBayLocation).startsWith(bayPrefix));
    const total = bayAssets.length;
    const reconciled = bayAssets.filter(a => a.inventoryStatus === 'CONFORME').length;
    const discrepancies = bayAssets.filter(a => a.inventoryStatus === 'ECART_LOCALISATION').length;
    const missing = bayAssets.filter(a => a.inventoryStatus === 'MANQUANT').length;
    const rate = total > 0 ? Math.round((reconciled / total) * 100) : 0;
    return { bayAssets, total, reconciled, discrepancies, missing, rate };
  };

  const activeBayStats = getBayStats(selectedBay);

  const getDisplayName = (item: Asset) => {
    if (lang === 'fr') return item.nameFr || item.name;
    if (lang === 'ar') return item.nameAr;
    return item.name;
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row bg-[#F8FAFC] overflow-y-auto">
      {/* 2D Interactive Warehouse Floor Plan (Left/Main) */}
      <div className="flex-1 p-4 lg:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              <h1 className="font-bold text-base text-slate-900 font-mono-numbers">
                {t.mapTitle}
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{t.mapSubtitle}</p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono-numbers">
            <span className="bg-slate-200 px-2 py-0.5 rounded text-slate-700">
              FACILITY: WEST-DISTRIBUTION-HUB
            </span>
            <span className="bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-bold">
              ZONE: C
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs bg-white p-2.5 rounded border border-slate-200 flex-wrap">
          <span className="font-semibold text-slate-700">{t.completionRate}:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500" />
            <span className="text-slate-600">
              {lang === 'fr' ? "100% Conforme" : lang === 'ar' ? "100% مطابقة تامة" : "100% Reconciled"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500" />
            <span className="text-slate-600">
              {lang === 'fr' ? "Écarts / En révision" : lang === 'ar' ? "ملاحظات / قيد التدقيق" : "Discrepancy / Review"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-500" />
            <span className="text-slate-600">
              {lang === 'fr' ? "Actif manquant" : lang === 'ar' ? "أصل مفقود" : "Missing Asset"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-300" />
            <span className="text-slate-600">
              {lang === 'fr' ? "En attente de scan" : lang === 'ar' ? "بانتظار المسح" : "Pending Scan"}
            </span>
          </div>
        </div>

        {/* Architectural 2D Rack Layout */}
        <div className="bg-white border-2 border-slate-300 rounded-lg p-5 shadow-sm space-y-6">
          <div className="flex items-center justify-between text-xs font-mono-numbers text-slate-400 border-b pb-2">
            <span>&larr; MAIN INVENTORY DISPATCH &larr;</span>
            <span className="text-slate-700 font-bold">AISLE A-01 / ZONE C STORAGE HIGH-RACKS</span>
            <span>&rarr; EMERGENCY HAZMAT EXIT &rarr;</span>
          </div>

          {/* Bay Racks Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {bays.map((bayId) => {
              const stats = getBayStats(bayId);
              const isSelected = selectedBay === bayId;

              let statusBorder = 'border-slate-300';
              let badgeBg = 'bg-slate-100 text-slate-700';

              if (stats.missing > 0) {
                statusBorder = 'border-rose-400 ring-2 ring-rose-300/40';
                badgeBg = 'bg-rose-100 text-rose-800';
              } else if (stats.discrepancies > 0) {
                statusBorder = 'border-amber-400 ring-2 ring-amber-300/40';
                badgeBg = 'bg-amber-100 text-amber-800';
              } else if (stats.rate === 100 && stats.total > 0) {
                statusBorder = 'border-emerald-400 ring-2 ring-emerald-300/40';
                badgeBg = 'bg-emerald-100 text-emerald-800';
              }

              return (
                <div
                  key={bayId}
                  onClick={() => {
                    sound.playScanSuccess();
                    setSelectedBay(bayId);
                  }}
                  className={`p-3.5 rounded-lg border-2 cursor-pointer transition-all ${statusBorder} ${
                    isSelected ? 'bg-sky-50 shadow-md scale-[1.02]' : 'bg-[#F8FAFC] hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono-numbers font-bold text-sm text-slate-900">
                      {bayId}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono-numbers ${badgeBg}`}>
                      {stats.rate}%
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 space-y-1 mb-3">
                    <div className="flex justify-between">
                      <span>{lang === 'fr' ? "Total actifs:" : lang === 'ar' ? "إجمالي الأصول:" : "Total assets:"}</span>
                      <span className="font-bold font-mono-numbers text-slate-800">{stats.total}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700">
                      <span>{lang === 'fr' ? "Conformes:" : lang === 'ar' ? "مطابقة:" : "Reconciled:"}</span>
                      <span className="font-mono-numbers font-bold">{stats.reconciled}</span>
                    </div>
                    {stats.discrepancies > 0 && (
                      <div className="flex justify-between text-amber-700">
                        <span>{lang === 'fr' ? "Écarts:" : lang === 'ar' ? "ملاحظات:" : "Discrepancies:"}</span>
                        <span className="font-mono-numbers font-bold">{stats.discrepancies}</span>
                      </div>
                    )}
                    {stats.missing > 0 && (
                      <div className="flex justify-between text-rose-700">
                        <span>{lang === 'fr' ? "Manquants:" : lang === 'ar' ? "مفقود:" : "Missing:"}</span>
                        <span className="font-mono-numbers font-bold">{stats.missing}</span>
                      </div>
                    )}
                  </div>

                  {/* Visual Rack Level Slots */}
                  <div className="space-y-1 pt-2 border-t border-slate-200">
                    {['L4', 'L3', 'L2', 'L1'].map((lvl) => {
                      const levelAssets = stats.bayAssets.filter(a => (a.scannedBayLocation || a.expectedBayLocation).includes(lvl));
                      return (
                        <div
                          key={lvl}
                          className="h-4 rounded bg-slate-200 flex items-center px-1.5 text-[9px] font-mono-numbers justify-between"
                        >
                          <span className="text-slate-500 font-bold">{lvl}</span>
                          <span className="text-slate-700">
                            {levelAssets.length > 0 ? `${levelAssets.length} AST` : 'EMPTY'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Bay Inspection Drawer (Right) */}
      <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-s border-slate-300 p-4 lg:p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
            <div>
              <span className="font-mono-numbers font-bold text-xs bg-slate-900 text-sky-400 px-2 py-0.5 rounded">
                {selectedBay}
              </span>
              <h2 className="font-bold text-sm text-slate-900 mt-1">
                {t.assetsInBay} ({activeBayStats.total})
              </h2>
            </div>
            <button
              onClick={() => onOpenCockpitWithFilter(selectedBay)}
              className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold flex items-center gap-1"
              title={t.openInGrid}
            >
              <span>{t.openInGrid}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {activeBayStats.bayAssets.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                {t.noAssetsInBay}
              </div>
            ) : (
              activeBayStats.bayAssets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => {
                    sound.playScanSuccess();
                    onSelectAsset(asset);
                  }}
                  className="p-2.5 rounded border border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 cursor-pointer transition-all text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono-numbers font-bold text-slate-900">
                      {asset.id}
                    </span>
                    {asset.inventoryStatus === 'CONFORME' && (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>{t.statConforme}</span>
                      </span>
                    )}
                    {asset.inventoryStatus === 'ECART_LOCALISATION' && (
                      <span className="text-amber-700 font-semibold flex items-center gap-1 text-[11px]">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        <span>{t.statLocationDiff}</span>
                      </span>
                    )}
                    {asset.inventoryStatus === 'MANQUANT' && (
                      <span className="text-rose-700 font-semibold flex items-center gap-1 text-[11px]">
                        <XCircle className="w-3 h-3 text-rose-500" />
                        <span>{t.statMissing}</span>
                      </span>
                    )}
                    {asset.inventoryStatus === 'NON_VERIFIE' && (
                      <span className="text-slate-500 font-semibold flex items-center gap-1 text-[11px]">
                        <span>{t.statUnscanned}</span>
                      </span>
                    )}
                  </div>

                  <div className="font-semibold text-slate-800 mt-1 line-clamp-1">
                    {getDisplayName(asset)}
                  </div>

                  <div className="text-[11px] text-slate-500 font-mono-numbers mt-1 flex justify-between">
                    <span>{asset.scannedBayLocation || asset.expectedBayLocation}</span>
                    <span>SN: {asset.serialNumber}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <div className="bg-slate-100 p-2.5 rounded text-xs text-slate-600 flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-600 flex-shrink-0" />
            <span>{t.clickAssetPrompt}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
