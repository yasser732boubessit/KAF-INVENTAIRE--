import React, { useState, useRef } from 'react';
import { 
  Image as ImageIcon, 
  Upload, 
  Trash2, 
  X, 
  CheckCircle2, 
  Download, 
  Sparkles,
  Info
} from 'lucide-react';
import { KafLogo } from './KafLogo';
import { Language } from '../types';
import { sound } from '../utils/audio';

interface LogoManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const LogoManagerModal: React.FC<LogoManagerModalProps> = ({
  isOpen,
  onClose,
  lang
}) => {
  const [currentLogo, setCurrentLogo] = useState<string | null>(() => {
    try {
      return localStorage.getItem('kaf_custom_logo');
    } catch {
      return null;
    }
  });

  const [message, setMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const isAr = lang === 'ar';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(isAr ? 'يرجى اختيار ملف صورة صالح (SVG, PNG, JPG)' : 'Veuillez sélectionner un fichier image valide (SVG, PNG, JPG)');
      return;
    }

    // Limit to reasonable size for base64 storage in localStorage (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert(isAr ? 'حجم الملف كبير جداً (الحد الأقصى 2 ميغابايت)' : 'Taille de fichier trop grande (max 2 Mo)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      try {
        localStorage.setItem('kaf_custom_logo', result);
        setCurrentLogo(result);
        window.dispatchEvent(new Event('kaf_logo_changed'));
        sound.playScanSuccess();
        setMessage(isAr ? 'تم حفظ الشعار وتطبيقه بنجاح على كامل النظام!' : 'Logo personnalisé appliqué avec succès sur toute l\'application !');
        setTimeout(() => setMessage(''), 4000);
      } catch {
        alert(isAr ? 'فشل حفظ الشعار محلياً' : 'Échec de la sauvegarde locale du logo');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetToDefault = () => {
    try {
      localStorage.removeItem('kaf_custom_logo');
      setCurrentLogo(null);
      window.dispatchEvent(new Event('kaf_logo_changed'));
      sound.playTap();
      setMessage(isAr ? 'تمت استعادة الشعار الرسمي الافتراضي لـ KAF بنجاح' : 'Logo officiel par défaut de KAF rétabli avec succès');
      setTimeout(() => setMessage(''), 4000);
    } catch {
      // ignore
    }
  };

  const handleDownloadOfficialSvg = () => {
    sound.playTap();
    const link = document.createElement('a');
    link.href = '/kaf-logo.svg';
    link.download = 'KAF-Kotama-Agri-Food-Logo.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="bg-[#0B0F17] border border-neutral-700 w-full max-w-xl rounded-xl shadow-2xl overflow-hidden text-neutral-200 flex flex-col"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {isAr ? 'إدارة شعار المؤسسة (KAF Brand Identity)' : 'Gestion du Logo de l\'Entreprise'}
              </h2>
              <p className="text-[11px] text-neutral-400">
                {isAr ? 'تخصيص وإضافة شعار كوتاما أغري فود أو شعار مخصص' : 'Personnaliser et intégrer le logo de Kotama Agri-Food'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5">
          {message && (
            <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{message}</span>
            </div>
          )}

          {/* Current Logo Preview */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-lg p-4">
            <div className="text-xs font-semibold text-neutral-300 mb-3 flex items-center justify-between">
              <span>{isAr ? 'معاينة الشعار الحالي في النظام :' : 'Aperçu du logo actuel dans le système :'}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                {currentLogo ? (isAr ? 'شعار مخصص مُحمّل' : 'Logo Personnalisé') : (isAr ? 'الشعار الرسمي (Vectoriel)' : 'Logo Officiel KAF')}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {/* Dark mode strip preview */}
              <div className="bg-[#0B0F17] border border-neutral-800 p-3.5 rounded-lg flex items-center justify-between">
                <span className="text-[10px] font-mono text-neutral-500">Mode Sombre (Dark)</span>
                <KafLogo size="md" variant="horizontal" />
              </div>

              {/* Light mode / Print preview */}
              <div className="bg-white border border-slate-300 p-3.5 rounded-lg flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500">Mode Papier (Print / PV)</span>
                <KafLogo size="md" variant="print" />
              </div>
            </div>
          </div>

          {/* Upload and Action Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/svg+xml,image/png,image/jpeg,image/webp" 
              className="hidden" 
              onChange={handleFileUpload}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-[#16A34A] hover:bg-emerald-600 text-white rounded-lg font-semibold text-xs shadow-md transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>{isAr ? 'تحميل شعار جديد (SVG / PNG)' : 'Téléverser un logo (SVG / PNG)'}</span>
            </button>

            {currentLogo ? (
              <button
                onClick={handleResetToDefault}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-amber-400 border border-neutral-700 rounded-lg font-medium text-xs transition-colors"
              >
                <Trash2 className="w-4 h-4 text-amber-400" />
                <span>{isAr ? 'استعادة الشعار الرسمي لـ KAF' : 'Restaurer le logo officiel KAF'}</span>
              </button>
            ) : (
              <button
                onClick={handleDownloadOfficialSvg}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg font-medium text-xs transition-colors"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>{isAr ? 'تنزيل ملف الشعار (kaf-logo.svg)' : 'Télécharger kaf-logo.svg'}</span>
              </button>
            )}
          </div>

          {/* Guidance note */}
          <div className="p-3.5 rounded-lg bg-neutral-900/60 border border-neutral-800 text-[11px] text-neutral-400 leading-relaxed space-y-1.5">
            <div className="flex items-center gap-1.5 text-neutral-300 font-semibold">
              <Info className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAr ? 'كيفية دمج واستبدال الشعار في الكود البرمجي :' : 'Comment intégrer/remplacer le logo dans le code :'}</span>
            </div>
            <p>
              {isAr 
                ? '1. مباشرة من المتصفح: استخدم زر "تحميل شعار جديد" أعلاه وسيتم حفظه تلقائياً في التخزين المحلي بدون تعديل أي ملف.'
                : '1. Directement depuis l\'UI : Utilisez le bouton "Téléverser un logo" ci-dessus pour une mise à jour instantanée.'}
            </p>
            <p>
              {isAr 
                ? '2. في المشروع المصدري (Desktop/Web) : يمكنك استبدال الملف في مسار `public/kaf-logo.svg` أو استخدام المكون البرمجي `<KafLogo />` في أي شاشة.'
                : '2. Dans le code source : Remplacez le fichier dans `public/kaf-logo.svg` ou utilisez le composant `<KafLogo />`.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-neutral-900/80 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-xs font-medium transition-colors"
          >
            {isAr ? 'إغلاق' : 'Fermer'}
          </button>
        </div>
      </div>
    </div>
  );
};
