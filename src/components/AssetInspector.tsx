import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Radio, 
  ShieldCheck, 
  Calendar, 
  Scale, 
  MapPin, 
  Edit3, 
  ExternalLink,
  Check,
  RotateCw
} from 'lucide-react';
import { Asset, AssetCondition, AssetStatus, Language } from '../types';
import { translations } from '../translations';
import { sound } from '../utils/audio';

interface AssetInspectorProps {
  asset: Asset | null;
  onClose: () => void;
  onUpdateAsset: (updated: Partial<Asset>) => void;
  lang: Language;
}

export const AssetInspector: React.FC<AssetInspectorProps> = ({
  asset,
  onClose,
  onUpdateAsset,
  lang
}) => {
  const t = translations[lang];
  const [localNotes, setLocalNotes] = useState('');
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  useEffect(() => {
    if (asset) {
      setLocalNotes(asset.notes || '');
    }
  }, [asset]);

  if (!asset) return null;

  const handleStatusChange = (status: AssetStatus) => {
    if (status === 'reconciled') sound.playScanSuccess();
    else sound.playAlert();

    onUpdateAsset({
      status,
      lastScannedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      scannedBy: 'TECH-941'
    });
  };

  const handleConditionChange = (condition: AssetCondition) => {
    sound.playScanSuccess();
    onUpdateAsset({ condition });
  };

  const handleChecklistToggle = (key: 'serialVerified' | 'rfidVerified' | 'tamperSealIntact') => {
    sound.playScanSuccess();
    onUpdateAsset({ [key]: !asset[key] });
  };

  const handleSaveNotes = () => {
    onUpdateAsset({ notes: localNotes });
    sound.playScanSuccess();
  };

  // Status Badge styling per design system
  const renderStatusBadge = (status: AssetStatus) => {
    switch (status) {
      case 'reconciled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            <span className="font-mono text-[11px]">REC</span>
            <span>{t.statReconciled}</span>
          </span>
        );
      case 'discrepancy':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
            <span className="font-mono text-[11px]">WARN</span>
            <span>{t.statDiscrepancy}</span>
          </span>
        );
      case 'missing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
            <span className="font-mono text-[11px]">CRIT</span>
            <span>{t.statMissing}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#64748B]" />
            <span className="font-mono text-[11px]">PEND</span>
            <span>{t.statUnscanned}</span>
          </span>
        );
    }
  };

  return (
    <aside className="w-full lg:w-96 bg-white border-l rtl:border-l-0 rtl:border-r border-[#CBD5E1] flex flex-col h-full overflow-hidden text-slate-800 shadow-xl lg:shadow-none z-30">
      {/* Header */}
      <div className="bg-[#0F172A] text-white p-3 flex items-center justify-between border-b border-[#1E293B]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded bg-sky-400" />
          <h2 className="font-semibold text-xs tracking-wider uppercase font-mono-numbers text-sky-200">
            {t.inspectorTitle}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
          title={t.btnClose}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Top Asset Title & Status */}
        <div className="border border-[#E2E8F0] p-3 rounded bg-[#F8FAFC]">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="font-mono-numbers font-bold text-sm bg-slate-900 text-sky-400 px-2 py-0.5 rounded border border-slate-700">
              {asset.id}
            </span>
            {renderStatusBadge(asset.status)}
          </div>
          <h3 className="font-bold text-slate-900 text-sm leading-snug">
            {lang === 'ar' ? asset.nameAr : asset.name}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            {asset.category} | {asset.sku}
          </p>
        </div>

        {/* Equipment Photographic Card */}
        <div className="border border-[#CBD5E1] rounded overflow-hidden bg-slate-950 relative group">
          <div className="relative h-44 w-full bg-slate-900 flex items-center justify-center overflow-hidden">
            <img
              src={asset.imageUrl}
              alt={asset.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              onError={(e) => {
                // Fallback industrial pattern if external image fails
                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-[11px] text-slate-300">
              <span className="font-mono-numbers bg-black/70 px-1.5 py-0.5 rounded border border-slate-700 text-white">
                PHOTO REF #AST-OPT-01
              </span>
              <button 
                onClick={() => setShowPhotoModal(true)}
                className="bg-[#0284C7] hover:bg-[#0369a1] text-white px-2 py-0.5 rounded flex items-center gap-1 font-medium transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span>تكبير</span>
              </button>
            </div>
          </div>
        </div>

        {/* Optical Barcode & Serial Identification Strip */}
        <div className="border border-[#E2E8F0] p-3 rounded bg-white">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            الرموز والشفرات البصرية (Barcode & RFID Matrix)
          </div>
          
          {/* Simulated Code 128 High-Precision Barcode */}
          <div className="bg-[#F8FAFC] border border-slate-200 p-2.5 rounded text-center mb-2">
            <div className="flex justify-center items-center h-10 gap-[2px] px-2 py-1 bg-white border border-slate-200 rounded">
              {/* Generated barcode vertical bars */}
              {[4, 2, 6, 1, 3, 5, 2, 4, 1, 6, 3, 2, 5, 1, 4, 2, 6, 3, 1, 4, 2, 5, 3, 1, 6, 2, 4, 1, 3].map((w, idx) => (
                <span
                  key={idx}
                  className="bg-slate-900 inline-block h-full"
                  style={{ width: `${w}px` }}
                />
              ))}
            </div>
            <div className="font-mono-numbers text-[12px] font-bold text-slate-800 tracking-widest mt-1">
              *{asset.barcode}*
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono-numbers">
            <div className="bg-[#F1F5F9] p-2 rounded border border-slate-200">
              <span className="text-slate-500 block text-[10px] font-sans">الرقم التسلسلي:</span>
              <span className="font-bold text-slate-800 break-all">{asset.serialNumber}</span>
            </div>
            <div className="bg-[#F1F5F9] p-2 rounded border border-slate-200">
              <span className="text-slate-500 block text-[10px] font-sans">RFID Tag Hash:</span>
              <span className="font-bold text-indigo-700 break-all">{asset.rfidTag}</span>
            </div>
          </div>
        </div>

        {/* Physical Verification Checklist */}
        <div className="border border-[#E2E8F0] p-3 rounded bg-white">
          <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>{t.physicalChecklist}</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>

          <div className="space-y-2">
            <label className="flex items-center justify-between p-2 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <span className="text-[11px] text-slate-700 font-medium">{t.chkSerialMatch}</span>
              <input
                type="checkbox"
                checked={asset.serialVerified}
                onChange={() => handleChecklistToggle('serialVerified')}
                className="w-4 h-4 text-[#0284C7] rounded border-slate-300 focus:ring-[#0284C7]"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <div className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-[11px] text-slate-700 font-medium">{t.chkRfidDetected}</span>
              </div>
              <input
                type="checkbox"
                checked={asset.rfidVerified}
                onChange={() => handleChecklistToggle('rfidVerified')}
                className="w-4 h-4 text-[#0284C7] rounded border-slate-300 focus:ring-[#0284C7]"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${asset.tamperSealIntact ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <span className="text-[11px] text-slate-700 font-medium">{t.chkTamperSeal}</span>
              </div>
              <input
                type="checkbox"
                checked={asset.tamperSealIntact}
                onChange={() => handleChecklistToggle('tamperSealIntact')}
                className="w-4 h-4 text-[#0284C7] rounded border-slate-300 focus:ring-[#0284C7]"
              />
            </label>
          </div>
        </div>

        {/* Warehouse Location & Technical Specs */}
        <div className="border border-[#E2E8F0] p-3 rounded bg-white">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            {t.specsAndTelemetry}
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-sky-600" />
                <span>موقع الرف:</span>
              </span>
              <span className="font-mono-numbers font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                {asset.bayLocation}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1">
                <Scale className="w-3 h-3 text-slate-400" />
                <span>{t.weight}:</span>
              </span>
              <span className="font-mono-numbers font-medium text-slate-800">
                {asset.weightKg} KG
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>{t.calibrationDue}:</span>
              </span>
              <span className="font-mono-numbers font-medium text-amber-700">
                {asset.calibrationDueDate}
              </span>
            </div>
          </div>
        </div>

        {/* Condition Grade Selection */}
        <div className="border border-[#E2E8F0] p-3 rounded bg-white">
          <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-2 block">
            {t.changeCondition}
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {(['nominal', 'minor_wear', 'needs_repair', 'damaged'] as AssetCondition[]).map((cond) => {
              const isActive = asset.condition === cond;
              const labels: Record<AssetCondition, string> = {
                nominal: t.condNominal,
                minor_wear: t.condMinorWear,
                needs_repair: t.condNeedsRepair,
                damaged: t.condDamaged,
                uninspected: t.condUninspected
              };
              return (
                <button
                  key={cond}
                  onClick={() => handleConditionChange(cond)}
                  className={`px-2 py-1.5 rounded text-[11px] font-medium border text-center transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-[#F8FAFC] text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {labels[cond]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Audit Status Override Buttons */}
        <div className="border border-[#E2E8F0] p-3 rounded bg-white">
          <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-2 block">
            {t.changeStatus}
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleStatusChange('reconciled')}
              className={`p-2 rounded text-[11px] font-bold border flex flex-col items-center justify-center gap-1 transition-all ${
                asset.status === 'reconciled'
                  ? 'bg-[#10B981] text-white border-[#059669] shadow-sm'
                  : 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0] hover:bg-[#D1FAE5]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t.btnVerify}</span>
            </button>

            <button
              onClick={() => handleStatusChange('discrepancy')}
              className={`p-2 rounded text-[11px] font-bold border flex flex-col items-center justify-center gap-1 transition-all ${
                asset.status === 'discrepancy'
                  ? 'bg-[#F59E0B] text-white border-[#D97706] shadow-sm'
                  : 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A] hover:bg-[#FEF3C7]'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>{t.btnFlagDiscrepancy}</span>
            </button>

            <button
              onClick={() => handleStatusChange('missing')}
              className={`p-2 rounded text-[11px] font-bold border flex flex-col items-center justify-center gap-1 transition-all ${
                asset.status === 'missing'
                  ? 'bg-[#EF4444] text-white border-[#DC2626] shadow-sm'
                  : 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA] hover:bg-[#FEE2E2]'
              }`}
            >
              <XCircle className="w-4 h-4" />
              <span>{t.btnMarkMissing}</span>
            </button>
          </div>
        </div>

        {/* Field Notes & Audit Memo */}
        <div className="border border-[#E2E8F0] p-3 rounded bg-white">
          <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>{t.inspectorNotes}</span>
            <Edit3 className="w-3 h-3 text-slate-400" />
          </label>
          <textarea
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            rows={3}
            className="w-full text-xs p-2 border border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#0284C7] bg-[#F8FAFC]"
            placeholder="أدخل ملاحظات الفحص الفيزيائي وتوثيق العيوب..."
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSaveNotes}
              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-medium flex items-center gap-1"
            >
              <Check className="w-3 h-3 text-sky-400" />
              <span>{t.btnSaveNotes}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Photo Zoom Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-slate-700 rounded-lg max-w-2xl w-full p-4 text-white relative">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm font-mono-numbers text-sky-300">
                {asset.id} - {lang === 'ar' ? asset.nameAr : asset.name}
              </h3>
              <button 
                onClick={() => setShowPhotoModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative rounded overflow-hidden max-h-[70vh] bg-black flex items-center justify-center">
              <img 
                src={asset.imageUrl} 
                alt={asset.name} 
                className="w-full h-auto object-contain max-h-[65vh]"
              />
            </div>
            <div className="mt-3 flex justify-between items-center text-xs text-slate-400 font-mono-numbers">
              <span>BAY: {asset.bayLocation}</span>
              <span>CAL DUE: {asset.calibrationDueDate}</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
