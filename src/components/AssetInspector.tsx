import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Radio, 
  ShieldCheck, 
  Calendar, 
  Scale, 
  MapPin, 
  Edit3, 
  ExternalLink, 
  Check,
  Clock
} from 'lucide-react';
import { Asset, AssetCondition, InventoryResultStatus, Language } from '../types';
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
      setLocalNotes((lang === 'fr' && asset.notesFr) ? asset.notesFr : asset.notes || '');
    }
  }, [asset, lang]);

  if (!asset) return null;

  const handleStatusChange = (newStatus: InventoryResultStatus) => {
    if (newStatus === 'CONFORME') sound.playScanSuccess();
    else sound.playAlert();

    onUpdateAsset({
      inventoryStatus: newStatus,
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
    if (lang === 'fr') {
      onUpdateAsset({ notes: localNotes, notesFr: localNotes });
    } else {
      onUpdateAsset({ notes: localNotes });
    }
    sound.playScanSuccess();
  };

  const displayName = lang === 'fr' 
    ? (asset.nameFr || asset.name) 
    : lang === 'ar' 
    ? asset.nameAr 
    : asset.name;

  const renderStatusBadge = (status: InventoryResultStatus) => {
    switch (status) {
      case 'CONFORME':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-green-50 text-green-800 border border-green-200">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
            <span className="font-mono text-[11px]">CONF</span>
            <span>{t.statConforme}</span>
          </span>
        );
      case 'ECART_LOCALISATION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-yellow-50 text-yellow-900 border border-yellow-300">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EAB308]" />
            <span className="font-mono text-[11px]">DIFF</span>
            <span>{t.statLocationDiff}</span>
          </span>
        );
      case 'MANQUANT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span className="font-mono text-[11px]">MISS</span>
            <span>{t.statMissing}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            <span className="font-mono text-[11px]">PEND</span>
            <span>{t.statUnscanned}</span>
          </span>
        );
    }
  };

  return (
    <aside className="w-full lg:w-96 bg-white border-l rtl:border-l-0 rtl:border-r border-slate-200 flex flex-col h-full overflow-hidden text-slate-800 shadow-xl lg:shadow-none z-30">
      {/* Header */}
      <div className="bg-[#111827] text-white p-3.5 flex items-center justify-between border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded bg-[#16A34A]" />
          <h2 className="font-bold text-xs tracking-wider uppercase font-mono text-white">
            {t.inspectorTitle}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800 transition-colors"
          title={t.btnClose}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Top Asset Title & Status */}
        <div className="border border-slate-200 p-3 rounded bg-slate-50">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="font-mono font-bold text-sm bg-[#111827] text-white px-2 py-0.5 rounded border border-neutral-700">
              {asset.id}
            </span>
            {renderStatusBadge(asset.inventoryStatus)}
          </div>
          <h3 className="font-bold text-slate-900 text-sm leading-snug">
            {displayName}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1 font-mono">
            {asset.category} &bull; {asset.officialCode}
          </p>
        </div>

        {/* Equipment Photographic Card */}
        <div className="border border-slate-200 rounded overflow-hidden bg-slate-950 relative group">
          <div className="relative h-44 w-full bg-slate-900 flex items-center justify-center overflow-hidden">
            <img
              src={asset.imageUrl}
              alt={displayName}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-[11px] text-slate-300">
              <span className="font-mono bg-black/70 px-1.5 py-0.5 rounded border border-neutral-700 text-white">
                {t.photoRef} #AST-OPT-01
              </span>
              <button 
                onClick={() => setShowPhotoModal(true)}
                className="bg-neutral-800 hover:bg-neutral-700 text-white px-2.5 py-0.5 rounded flex items-center gap-1 font-medium transition-colors border border-neutral-600"
              >
                <ExternalLink className="w-3 h-3" />
                <span>{lang === 'fr' ? 'Agrandir' : lang === 'ar' ? 'تكبير' : 'Enlarge'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Optical Barcode & Serial Identification Strip */}
        <div className="border border-slate-200 p-3 rounded bg-white">
          <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-2">
            {lang === 'fr' 
              ? "Codes-Barres & Identification Physique" 
              : lang === 'ar' 
              ? "الرموز والشفرات البصرية" 
              : "Optical Codes & Identification"}
          </div>
          
          {/* Simulated Code 128 Barcode */}
          <div className="bg-slate-50 border border-slate-200 p-2.5 rounded text-center mb-2">
            <div className="flex justify-center items-center h-10 gap-[2px] px-2 py-1 bg-white border border-slate-200 rounded">
              {[4, 2, 6, 1, 3, 5, 2, 4, 1, 6, 3, 2, 5, 1, 4, 2, 6, 3, 1, 4, 2, 5, 3, 1, 6, 2, 4, 1, 3].map((w, idx) => (
                <span
                  key={idx}
                  className="bg-slate-900 inline-block h-full"
                  style={{ width: `${w}px` }}
                />
              ))}
            </div>
            <div className="font-mono text-[12px] font-bold text-slate-800 tracking-widest mt-1">
              *{asset.barcode}*
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="bg-slate-50 p-2 rounded border border-slate-200">
              <span className="text-slate-500 block text-[10px] font-sans">
                {lang === 'fr' ? "N° de Série:" : lang === 'ar' ? "الرقم التسلسلي:" : "Serial Number:"}
              </span>
              <span className="font-bold text-slate-800 break-all">{asset.serialNumber}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded border border-slate-200">
              <span className="text-slate-500 block text-[10px] font-sans">
                {lang === 'fr' ? "Balise RFID:" : lang === 'ar' ? "رمز RFID:" : "RFID Tag Hash:"}
              </span>
              <span className="font-bold text-slate-800 break-all">{asset.rfidTag}</span>
            </div>
          </div>
        </div>

        {/* Physical Verification Checklist */}
        <div className="border border-slate-200 p-3 rounded bg-white">
          <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>{t.physicalChecklist}</span>
            <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
          </div>

          <div className="space-y-2">
            <label className="flex items-center justify-between p-2 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <span className="text-[11px] text-slate-700 font-medium">{t.chkSerialMatch}</span>
              <input
                type="checkbox"
                checked={asset.serialVerified}
                onChange={() => handleChecklistToggle('serialVerified')}
                className="w-4 h-4 accent-[#16A34A] rounded border-slate-300"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <div className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[11px] text-slate-700 font-medium">{t.chkRfidDetected}</span>
              </div>
              <input
                type="checkbox"
                checked={asset.rfidVerified}
                onChange={() => handleChecklistToggle('rfidVerified')}
                className="w-4 h-4 accent-[#16A34A] rounded border-slate-300"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${asset.tamperSealIntact ? 'bg-[#16A34A]' : 'bg-slate-400'}`} />
                <span className="text-[11px] text-slate-700 font-medium">{t.chkTamperSeal}</span>
              </div>
              <input
                type="checkbox"
                checked={asset.tamperSealIntact}
                onChange={() => handleChecklistToggle('tamperSealIntact')}
                className="w-4 h-4 accent-[#16A34A] rounded border-slate-300"
              />
            </label>
          </div>
        </div>

        {/* Warehouse Location & Technical Specs */}
        <div className="border border-slate-200 p-3 rounded bg-white">
          <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-2">
            {t.specsAndTelemetry}
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-500" />
                <span>{lang === 'fr' ? "Emplacement Baie:" : lang === 'ar' ? "موقع الرف:" : "Bay Location:"}</span>
              </span>
              <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                {asset.scannedBayLocation || asset.expectedBayLocation}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1">
                <Scale className="w-3 h-3 text-slate-400" />
                <span>{t.weight}:</span>
              </span>
              <span className="font-mono font-medium text-slate-800">
                {asset.weightKg} KG
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>{t.calibrationDue}:</span>
              </span>
              <span className="font-mono font-medium text-slate-700">
                {asset.calibrationDueDate}
              </span>
            </div>
          </div>
        </div>

        {/* Condition Grade Selection */}
        <div className="border border-slate-200 p-3 rounded bg-white">
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
                      ? 'bg-[#111827] text-white border-neutral-900 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {labels[cond]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Audit Status Override Buttons (Palette 3 couleurs stricte) */}
        <div className="border border-slate-200 p-3 rounded bg-white">
          <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-2 block">
            {t.changeStatus}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {/* CONFORME (Vert #16A34A) */}
            <button
              onClick={() => handleStatusChange('CONFORME')}
              className={`p-2 rounded text-[11px] font-bold border flex flex-col items-center justify-center gap-1 transition-all ${
                asset.inventoryStatus === 'CONFORME'
                  ? 'bg-[#16A34A] text-white border-[#15803D] shadow-2xs'
                  : 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t.statConforme}</span>
            </button>

            {/* ÉCART LOCALISATION (Jaune #FACC15) */}
            <button
              onClick={() => handleStatusChange('ECART_LOCALISATION')}
              className={`p-2 rounded text-[11px] font-bold border flex flex-col items-center justify-center gap-1 transition-all ${
                asset.inventoryStatus === 'ECART_LOCALISATION'
                  ? 'bg-[#FACC15] text-black border-yellow-500 shadow-2xs font-semibold'
                  : 'bg-yellow-50 text-yellow-900 border-yellow-300 hover:bg-yellow-100'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>{t.statLocationDiff}</span>
            </button>

            {/* MANQUANT (Neutre sobre, sans rouge) */}
            <button
              onClick={() => handleStatusChange('MANQUANT')}
              className={`p-2 rounded text-[11px] font-bold border flex flex-col items-center justify-center gap-1 transition-all ${
                asset.inventoryStatus === 'MANQUANT'
                  ? 'bg-slate-700 text-white border-slate-800 shadow-2xs'
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>{t.statMissing}</span>
            </button>

            {/* NON VÉRIFIÉ */}
            <button
              onClick={() => handleStatusChange('NON_VERIFIE')}
              className={`p-2 rounded text-[11px] font-bold border flex flex-col items-center justify-center gap-1 transition-all ${
                asset.inventoryStatus === 'NON_VERIFIE'
                  ? 'bg-slate-700 text-white border-slate-800 shadow-2xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{t.statUnscanned}</span>
            </button>
          </div>
        </div>

        {/* Field Notes & Audit Memo */}
        <div className="border border-slate-200 p-3 rounded bg-white">
          <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>{t.inspectorNotes}</span>
            <Edit3 className="w-3 h-3 text-slate-400" />
          </label>
          <textarea
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            rows={3}
            className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none focus:border-[#16A34A] bg-slate-50"
            placeholder={lang === 'fr' 
              ? "Saisir les remarques d'inspection physique, conformité ou dégradation..." 
              : lang === 'ar' 
              ? "أدخل ملاحظات الفحص الفيزيائي وتوثيق العيوب..." 
              : "Enter physical inspection notes or defect documentation..."}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSaveNotes}
              className="px-3 py-1 bg-[#16A34A] hover:bg-[#15803D] text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-2xs transition-colors"
            >
              <Check className="w-3 h-3 text-white" />
              <span>{t.btnSaveNotes}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Photo Zoom Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-neutral-700 rounded max-w-2xl w-full p-4 text-white relative">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm font-mono text-white">
                {asset.id} - {displayName}
              </h3>
              <button 
                onClick={() => setShowPhotoModal(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative rounded overflow-hidden max-h-[70vh] bg-black flex items-center justify-center">
              <img 
                src={asset.imageUrl} 
                alt={displayName} 
                className="w-full h-auto object-contain max-h-[65vh]"
              />
            </div>
            <div className="mt-3 flex justify-between items-center text-xs text-neutral-400 font-mono">
              <span>BAY : {asset.scannedBayLocation || asset.expectedBayLocation}</span>
              <span>CAL DUE : {asset.calibrationDueDate}</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
