import React, { useState } from 'react';
import { 
  Sliders, 
  X, 
  Check, 
  Bluetooth, 
  Radio, 
  Usb, 
  Volume2, 
  VolumeX, 
  RotateCcw,
  Info,
  Barcode,
  CheckCircle2,
  Cpu
} from 'lucide-react';
import { ScannerHardwareConfig, DEFAULT_SCANNER_CONFIG } from '../utils/ticketParser';
import { Language } from '../types';

interface HenexConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ScannerHardwareConfig;
  onSaveConfig: (cfg: ScannerHardwareConfig) => void;
  lang: Language;
}

export const HenexConfigModal: React.FC<HenexConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  lang
}) => {
  const [current, setCurrent] = useState<ScannerHardwareConfig>({ ...config });
  const [activeTab, setActiveTab] = useState<'profile' | 'connection' | 'decoding' | 'barcodes'>('profile');

  if (!isOpen) return null;

  const isAr = lang === 'ar';

  const handleSave = () => {
    onSaveConfig(current);
    onClose();
  };

  const handleReset = () => {
    setCurrent({ ...DEFAULT_SCANNER_CONFIG });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-[#0F172A] border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-[#131F37] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  {isAr ? 'إعدادات وتوصيف قارئ HENEX HC-3206R-2D-BT' : 'Configuration Matériel HENEX HC-3206R-2D-BT'}
                </h3>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-800">
                  S/FIL 2D
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isAr 
                  ? 'برمجة التردد، نمط الاتصال اللاسلكي، وتحليل باركود وتيكاث Lenovo والباركودات الصناعية' 
                  : 'Paramétrage du lien HID sans fil, décodage des étiquettes industrielles & formats 1S'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-4 bg-slate-900/60 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-2.5 border-b-2 transition-colors ${
              activeTab === 'profile' 
                ? 'border-emerald-400 text-emerald-400 font-bold' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {isAr ? 'الملف التعريفي للجهاز' : 'Profil & Matériel'}
          </button>
          <button
            onClick={() => setActiveTab('connection')}
            className={`px-3 py-2.5 border-b-2 transition-colors ${
              activeTab === 'connection' 
                ? 'border-emerald-400 text-emerald-400 font-bold' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {isAr ? 'وضع الاتصال (Bluetooth / 2.4G)' : 'Liaison & Port'}
          </button>
          <button
            onClick={() => setActiveTab('decoding')}
            className={`px-3 py-2.5 border-b-2 transition-colors ${
              activeTab === 'decoding' 
                ? 'border-emerald-400 text-emerald-400 font-bold' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {isAr ? 'قواعد التفكيك وتحليل التيكاث' : 'Décodage & Tickets'}
          </button>
          <button
            onClick={() => setActiveTab('barcodes')}
            className={`px-3 py-2.5 border-b-2 transition-colors ${
              activeTab === 'barcodes' 
                ? 'border-emerald-400 text-emerald-400 font-bold' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {isAr ? 'أكواد الضبط السريع (Barcodes)' : 'Codes de Programmation'}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300 flex-1">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">
                      {isAr ? 'الماركة والموديل' : 'Marque & Modèle'}
                    </span>
                    <div className="text-white font-bold font-mono">HENEX HC-3206R-2D-BT</div>
                    <span className="text-[10px] text-emerald-400 block mt-0.5">
                      {isAr ? 'معتمد رسمياً في المنشأة (S/N: 3206R22120151)' : 'Homologué KAF Enterprise (S/N: 3206R22120151)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">
                      {isAr ? 'التقنية البصرية' : 'Technologie Optique'}
                    </span>
                    <div className="text-white font-bold">Capteur CMOS Imager 2D + 1D</div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      QR Code, Code 128, DataMatrix, PDF417, EAN-13
                    </span>
                  </div>
                </div>
              </div>

              {/* Beep & Sound feedback */}
              <div className="flex items-center justify-between p-3.5 bg-slate-900 border border-slate-800 rounded-lg">
                <div className="flex items-center gap-2.5">
                  {current.soundBeepEnabled ? (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-slate-500" />
                  )}
                  <div>
                    <div className="font-semibold text-white">
                      {isAr ? 'إشعار صوتي عند نجاح القراءة' : 'Bip sonore de validation'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {isAr ? 'تشغيل رنين صناعي فوري عند التعرف على التيكاث' : 'Émet un son système de haute fréquence à la capture'}
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={current.soundBeepEnabled}
                  onChange={(e) => setCurrent({ ...current, soundBeepEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700"
                />
              </div>

              {/* Auto Reconcile toggle */}
              <div className="flex items-center justify-between p-3.5 bg-slate-900 border border-slate-800 rounded-lg">
                <div>
                  <div className="font-semibold text-white">
                    {isAr ? 'المطابقة والاعتماد التلقائي المباشر' : 'Rapprochement automatique direct'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {isAr ? 'تأكيد الأصل وتحديث حالته فور مسحه بدون الحاجة للنقر اليدوي' : 'Valide directement l\'immobilisation sans confirmation supplémentaire'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={current.autoReconcile}
                  onChange={(e) => setCurrent({ ...current, autoReconcile: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700"
                />
              </div>
            </div>
          )}

          {activeTab === 'connection' && (
            <div className="space-y-3">
              <span className="text-[11px] text-slate-400 block">
                {isAr ? 'اختر وضع الاتصال الفعلي المستخدم في قارئ HENEX الخاص بك:' : 'Mode de transmission actif configuré sur le scanner HENEX :'}
              </span>

              {/* Bluetooth Mode */}
              <label 
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  current.connectionMode === 'BLUETOOTH_WIRELESS'
                    ? 'bg-emerald-950/40 border-emerald-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                }`}
              >
                <input 
                  type="radio" 
                  name="connMode" 
                  checked={current.connectionMode === 'BLUETOOTH_WIRELESS'}
                  onChange={() => setCurrent({ ...current, connectionMode: 'BLUETOOTH_WIRELESS' })}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-bold flex items-center gap-1.5 text-sm">
                    <Bluetooth className="w-4 h-4 text-sky-400" />
                    <span>{isAr ? 'بلوتوث لاسلكي مباشر (Bluetooth HID Wireless)' : 'Bluetooth Sans Fil (Mode BT HID standard)'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isAr 
                      ? 'اقتران مباشر مع الحاسوب أو اللوح الإلكتروني بدون أي وصلة (المدى يصل إلى 30 متراً).'
                      : 'Appairage direct sans adaptateur avec PC Windows, tablette ou smartphone (portée 30m).'}
                  </p>
                </div>
              </label>

              {/* 2.4G Dongle Mode */}
              <label 
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  current.connectionMode === 'USB_DONGLE_2_4G'
                    ? 'bg-emerald-950/40 border-emerald-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                }`}
              >
                <input 
                  type="radio" 
                  name="connMode" 
                  checked={current.connectionMode === 'USB_DONGLE_2_4G'}
                  onChange={() => setCurrent({ ...current, connectionMode: 'USB_DONGLE_2_4G' })}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-bold flex items-center gap-1.5 text-sm">
                    <Radio className="w-4 h-4 text-emerald-400" />
                    <span>{isAr ? 'مستقبل USB لاسلكي 2.4GHz Dongle (Plug & Play)' : 'Dongle USB 2.4 GHz Sans Fil (Plug & Play)'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isAr 
                      ? 'تركيب دونغل USB في الحاسوب، اتصال فوري بدون تعريف، استقرار عالي ضد التشويش.'
                      : 'Connexion instantanée avec clé USB sans configuration logicielle supplémentaire.'}
                  </p>
                </div>
              </label>

              {/* USB Cable Mode */}
              <label 
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  current.connectionMode === 'USB_HID_KBW'
                    ? 'bg-emerald-950/40 border-emerald-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                }`}
              >
                <input 
                  type="radio" 
                  name="connMode" 
                  checked={current.connectionMode === 'USB_HID_KBW'}
                  onChange={() => setCurrent({ ...current, connectionMode: 'USB_HID_KBW' })}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-bold flex items-center gap-1.5 text-sm">
                    <Usb className="w-4 h-4 text-amber-400" />
                    <span>{isAr ? 'كابل USB سلكي مباشر (Filaire Direct)' : 'Câble USB Filaire Direct (Recharge & Scan)'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isAr 
                      ? 'شحن البطارية ومسح الأصول في آن واحد عبر كابل USB-C.'
                      : 'Utilisation câblée tout en rechargeant la batterie intégrée.'}
                  </p>
                </div>
              </label>
            </div>
          )}

          {activeTab === 'decoding' && (
            <div className="space-y-4">
              <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">
                      {isAr ? 'معالجة تيكاث أجهزة Lenovo (تنسيق 1S التلقائي)' : 'Décodage Intelligent Étiquettes Lenovo (Format 1S)'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {isAr 
                        ? 'استخراج الرقم التسلسلي (V5HND516) ورمز الموديل تلقائياً من الباركود (1S62A8KAT1EUV5HND516)' 
                        : 'Extrait le Numéro de Série et MTM à partir du code 1S'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={current.stripLeading1S}
                    onChange={(e) => setCurrent({ ...current, stripLeading1S: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-500 bg-slate-800"
                  />
                </div>

                <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-300">
                    {isAr ? 'المهلة الزمنية بين الحروف (Inter-Char Timeout):' : 'Délai d\'interception de frappe rapide :'}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="20"
                      max="150"
                      value={current.interCharTimeoutMs}
                      onChange={(e) => setCurrent({ ...current, interCharTimeoutMs: Number(e.target.value) })}
                      className="w-24 accent-emerald-500"
                    />
                    <span className="font-mono font-bold text-emerald-400">{current.interCharTimeoutMs} ms</span>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-300">
                    {isAr ? 'مفتاح الإنهاء التلقائي (Suffix):' : 'Touche de fin de trame (Suffix) :'}
                  </span>
                  <select
                    value={current.suffix}
                    onChange={(e) => setCurrent({ ...current, suffix: e.target.value as any })}
                    className="bg-slate-800 text-white rounded px-2 py-1 font-mono border border-slate-700"
                  >
                    <option value="ENTER">ENTER (Retour Chariot \r\n)</option>
                    <option value="TAB">TAB (\t)</option>
                    <option value="NONE">AUCUN (Détection temporelle)</option>
                  </select>
                </div>
              </div>

              {/* Example decoding simulation */}
              <div className="p-3 bg-sky-950/40 border border-sky-800/80 rounded-lg text-[11px] text-sky-200">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-sky-300">
                  <Info className="w-3.5 h-3.5" />
                  <span>{isAr ? 'مثال حي على التيكاث الملتقطة من شاشة Lenovo C24-20:' : 'Exemple d\'interprétation de l\'étiquette Lenovo :'}</span>
                </div>
                <div className="font-mono text-[10px] bg-black/60 p-2 rounded mt-1 text-slate-300 space-y-0.5">
                  <div>Input Brute: <span className="text-emerald-400">1S62A8KAT1EUV5HND516</span></div>
                  <div>Format Détecté: <span className="text-sky-300">LENOVO_1S</span></div>
                  <div>N° de Série: <span className="text-amber-300 font-bold">V5HND516</span> | MTM: <span className="text-white">62A8-KAR1-WW</span></div>
                  <div>Équipement: <span className="text-white">Lenovo C24-20 (Type A20238FD0) - Baie 04</span></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'barcodes' && (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-400">
                {isAr 
                  ? 'إذا أردت إعادة ضبط القارئ اليدوي HENEX، يمكنك مسح هذه الباركودات المرجعية مباشرة بشعاع القارئ من كتيب المصنع:' 
                  : 'Codes de programmation rapide conformes au manuel d\'usine HENEX HC-3206R :'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-900 p-3 rounded border border-slate-800 flex flex-col items-center text-center">
                  <span className="text-[10px] font-bold text-sky-400 mb-1">MODE SANS FIL 2.4G DONGLE</span>
                  <div className="bg-white p-2 rounded my-1">
                    <Barcode className="w-24 h-10 text-slate-950" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 mt-1">%HENEX$SET-2.4G%</span>
                </div>

                <div className="bg-slate-900 p-3 rounded border border-slate-800 flex flex-col items-center text-center">
                  <span className="text-[10px] font-bold text-emerald-400 mb-1">MODE BLUETOOTH HID</span>
                  <div className="bg-white p-2 rounded my-1">
                    <Barcode className="w-24 h-10 text-slate-950" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 mt-1">%HENEX$SET-BT-HID%</span>
                </div>

                <div className="bg-slate-900 p-3 rounded border border-slate-800 flex flex-col items-center text-center">
                  <span className="text-[10px] font-bold text-amber-400 mb-1">AJOUTER ENTER EN SUFFIXE</span>
                  <div className="bg-white p-2 rounded my-1">
                    <Barcode className="w-24 h-10 text-slate-950" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 mt-1">%HENEX$ADD-CRLF%</span>
                </div>

                <div className="bg-slate-900 p-3 rounded border border-slate-800 flex flex-col items-center text-center">
                  <span className="text-[10px] font-bold text-rose-400 mb-1">RÉINITIALISATION D'USINE</span>
                  <div className="bg-white p-2 rounded my-1">
                    <Barcode className="w-24 h-10 text-slate-950" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 mt-1">%HENEX$FACTORY-RESET%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-[#131F37] flex items-center justify-between">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white flex items-center gap-1.5 hover:bg-slate-800 rounded transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isAr ? 'استعادة الإعدادات الافتراضية' : 'Valeurs par défaut'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors font-semibold"
            >
              {isAr ? 'إلغاء' : 'Annuler'}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isAr ? 'حفظ وتطبيق الإعدادات' : 'Enregistrer la configuration'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
