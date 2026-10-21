import React, { useState, useEffect } from 'react';
import { X, Plus, Tag, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';
import { Asset, Language, InventoryZone } from '../types';
import { translations } from '../translations';
import { sound } from '../utils/audio';
import { dbService } from '../services/databaseService';
import { normalizeGarbledScanString, translateHardwareEventToChar } from '../utils/keyboardScannerEngine';

interface NewAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAsset: (newAsset: Asset) => void;
  lang: Language;
}

export const NewAssetModal: React.FC<NewAssetModalProps> = ({
  isOpen,
  onClose,
  onAddAsset,
  lang
}) => {
  const t = translations[lang];

  // ═══════════════════════════════════════════════════════════
  // ÉTATS
  // ═══════════════════════════════════════════════════════════
  const [nameFr, setNameFr] = useState('');
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  
  // ✅ التحديث: استخدام الفئة الجديدة كافتراضي
  const [category, setCategory] = useState<string>('VEHICULES LEGERS DE TOURISME');
  
  const [serialNumber, setSerialNumber] = useState(`SN-${Math.floor(100000 + Math.random() * 900000)}-FR`);
  const [barcode, setBarcode] = useState(`${Math.floor(890000000000 + Math.random() * 999999999)}`);
  const [weightKg, setWeightKg] = useState('12.5');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [availableZones, setAvailableZones] = useState<InventoryZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [bayLocation, setBayLocation] = useState('');
  const [loadingZones, setLoadingZones] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const loadOpenZones = async () => {
      setLoadingZones(true);
      try {
        const campaign = await dbService.getCampaign();
        const openZones = (campaign?.zones || []).filter(z => !z.isClosed);
        
        setAvailableZones(openZones);
        
        if (openZones.length > 0 && !selectedZoneId) {
          setSelectedZoneId(openZones[0].id);
          setBayLocation(`${openZones[0].id}-RACK-01-L1`);
        }
      } catch (err) {
        console.error('[NewAssetModal] Erreur chargement zones:', err);
      } finally {
        setLoadingZones(false);
      }
    };

    loadOpenZones();
  }, [isOpen]);

  const handleZoneChange = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    setBayLocation(`${zoneId}-RACK-01-L1`);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (availableZones.length === 0) {
      setErrorMsg(lang === 'fr' ? 'Aucune zone ouverte disponible.' : 'لا توجد مناطق مفتوحة متاحة.');
      return;
    }

    setIsSubmitting(true);

    try {
      const existingAssets = await dbService.getAssets();
      
      const isBarcodeDuplicate = existingAssets.some(a => a.barcode === barcode);
      const isSerialDuplicate = existingAssets.some(a => a.serialNumber === serialNumber);

      if (isBarcodeDuplicate) {
        sound.playAlert();
        setErrorMsg(lang === 'fr' ? `⚠️ Le code-barres [${barcode}] est déjà attribué.` : `⚠️ الباركود [${barcode}] مسجل مسبقاً.`);
        setIsSubmitting(false);
        return;
      }

      if (isSerialDuplicate) {
        sound.playAlert();
        setErrorMsg(lang === 'fr' ? `⚠️ Le N° de série [${serialNumber}] existe déjà.` : `⚠️ رقم السيريال [${serialNumber}] موجود مسبقاً.`);
        setIsSubmitting(false);
        return;
      }

      const newId = `AST-${Math.floor(10502 + Math.random() * 8999)}`;
      const effectiveFr = nameFr.trim() || 'Nouvel Ensemble Industriel';
      const effectiveEn = name.trim() || 'New Industrial Assembly';
      const effectiveAr = nameAr.trim() || 'معدة صناعية ميدانية جديدة';

      const newAsset: Asset = {
        id: newId,
        officialCode: `IMMO-2026-${Math.floor(10000 + Math.random() * 89999)}`,
        name: effectiveEn,
        nameFr: effectiveFr,
        nameAr: effectiveAr,
        sku: `SKU-${category.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 899)}`,
        serialNumber,
        barcode,
        rfidTag: `E280-1160-${Math.floor(1000 + Math.random() * 8999)}-${Math.floor(1000 + Math.random() * 8999)}`,
        category: category as any, // تم التمرير كـ string
        zone: selectedZoneId, // ✅ استخدام المنطقة المحددة
        expectedBayLocation: bayLocation,
        scannedBayLocation: bayLocation,
        inventoryStatus: 'CONFORME',
        condition: 'nominal',
        tamperSealIntact: true,
        rfidVerified: true,
        serialVerified: true,
        lastScannedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        scannedBy: 'TECH-941',
        notes: "Enregistré et audité manuellement in situ.",
        notesFr: "Enregistré et audité manuellement in situ.",
        imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
        weightKg: parseFloat(weightKg) || 10,
        calibrationDueDate: '2027-12-31'
      };

      sound.playScanSuccess();
      onAddAsset(newAsset);
      onClose();

    } catch (err) {
      console.error('[NewAssetModal] Erreur:', err);
      setErrorMsg(lang === 'fr' ? 'Erreur de communication avec la base de données.' : 'خطأ في الاتصال بقاعدة البيانات.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden border border-slate-300 text-slate-800">
        <div className="bg-[#0F172A] text-white p-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-sky-400" />
            <h3 className="font-bold text-xs uppercase tracking-wider font-mono-numbers text-sky-200">
              {t.modalTitle}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white" disabled={isSubmitting}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-300 rounded text-rose-800 flex items-start gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold text-[11px] leading-tight">{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {lang === 'fr' ? 'Désignation en Français' : 'اسم وتوصيف المعدة (بالفرنسية)'}
            </label>
            <input
              type="text"
              required
              value={nameFr}
              onChange={(e) => setNameFr(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Catégorie</label>
              {/* ✅ القائمة الجديدة للفئات */}
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-[#0284C7] focus:outline-none bg-white text-[11px]"
                disabled={isSubmitting}
              >
                <option value="VEHICULES LEGERS DE TOURISME">VEHICULES LEGERS DE TOURISME</option>
                <option value="AUTRES CONSTRUCTIONS">AUTRES CONSTRUCTIONS</option>
                <option value="INSTALLATION CHAUD ET FROID">INSTALLATION CHAUD ET FROID</option>
                <option value="MATERIELS INFORMATIQUE">MATERIELS INFORMATIQUE</option>
                <option value="AUTRES MOBILIERS ET MATERIELS DIVERS">AUTRES MOBILIERS ET MATERIELS DIVERS</option>
                <option value="MOBILIER ET EQUIPEMENT MENAGERS">MOBILIER ET EQUIPEMENT MENAGERS</option>
                <option value="MOBILIER DE BUREAU">MOBILIER DE BUREAU</option>
                <option value="AUTRES MOBILIERS D AMEUBLEMENT">AUTRES MOBILIERS D AMEUBLEMENT</option>
                <option value="MATERIEL DE COMMUNICATION, PROJECTION">MATERIEL DE COMMUNICATION, PROJECTION</option>
                <option value="OUTILLAGE">OUTILLAGE</option>
                <option value="MATERIEL DE BUREAU">MATERIEL DE BUREAU</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {lang === 'fr' ? 'Zone (Plot)' : 'المنطقة (الرف)'}
                {loadingZones && <Loader2 className="w-3 h-3 inline ml-1 animate-spin" />}
              </label>
              <select
                value={selectedZoneId}
                onChange={(e) => handleZoneChange(e.target.value)}
                disabled={loadingZones || availableZones.length === 0 || isSubmitting}
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-[#0284C7] focus:outline-none bg-white disabled:bg-slate-100 disabled:cursor-not-allowed font-mono-numbers text-[11px]"
              >
                {availableZones.length === 0 ? (
                  <option value="">⚠️ Aucune zone ouverte</option>
                ) : (
                  availableZones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.id} — {zone.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Emplacement précis</label>
            <input
              type="text"
              value={bayLocation}
              onChange={(e) => setBayLocation(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-[#0284C7] focus:outline-none font-mono-numbers"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">{t.modalSerial}</label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-[#0284C7] focus:outline-none font-mono-numbers text-slate-800"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" /> {t.modalBarcode}
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(normalizeGarbledScanString(e.target.value).normalized)}
                onKeyDown={(e) => {
                  if (e.ctrlKey || e.altKey || e.metaKey) return;
                  const char = translateHardwareEventToChar(e);
                  if (char && char !== '\n' && char !== '\t' && char !== 'Backspace') {
                    e.preventDefault();
                    setBarcode(prev => prev + char);
                  }
                }}
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono-numbers text-slate-800"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-3 py-1.5 border border-slate-300 rounded hover:bg-slate-100 font-medium disabled:opacity-50">
              {t.modalCancel}
            </button>
            <button type="submit" disabled={availableZones.length === 0 || isSubmitting} className="px-4 py-1.5 bg-[#0284C7] hover:bg-[#0369a1] text-white rounded font-medium shadow-sm flex items-center gap-1.5 disabled:bg-slate-400 disabled:cursor-not-allowed">
              {isSubmitting ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Vérification...</span></>
              ) : (
                <><Tag className="w-3.5 h-3.5" /><span>{t.modalSubmit}</span></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};