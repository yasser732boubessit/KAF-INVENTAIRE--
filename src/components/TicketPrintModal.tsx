import React, { useState } from 'react';
import { 
  Printer, X, Layers, Info, Maximize2
} from 'lucide-react';
import { PhysicalAssetTag, TicketData } from './PhysicalAssetTag';
import { Language } from '../types';
import { sound } from '../utils/audio';

interface TicketPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: TicketData[];
  lang: Language;
  title?: string;
}

export const TicketPrintModal: React.FC<TicketPrintModalProps> = ({
  isOpen, onClose, tickets, lang, title
}) => {      
  const [format, setFormat] = useState<'thermal_70x40' | 'thermal_50x30' | 'thermal_43x20'>('thermal_50x30');
  const [copies, setCopies] = useState<number>(1);
  const [showBarcode, setShowBarcode] = useState<boolean>(true);
  const [showLogo, setShowLogo] = useState<boolean>(true);

  if (!isOpen || tickets.length === 0) return null;

  const isAr = lang === 'ar';

  const handlePrint = async () => {
    sound.playTap();

    // 1. تحديد الأبعاد بالسنتيمتر بناءً على المقاس المختار
    let widthMm = 50;
    let heightMm = 29;
    if (format === 'thermal_43x20') { widthMm = 43; heightMm = 20; }
    if (format === 'thermal_70x40') { widthMm = 70; heightMm = 40; }

    // 2. التحقق من بيئة العمل (Electron vs Browser)
    const electronAPI = (window as any).electronAPI;

    if (electronAPI && electronAPI.system && electronAPI.system.printThermalTicket) {
      try {
        // استخدام IPC للطباعة المباشرة في Electron
        await electronAPI.system.printThermalTicket(widthMm, heightMm, 'Xprinter XP-TT424B');
      } catch (err) {
        console.error('Erreur impression Electron:', err);
        alert(isAr ? 'حدث خطأ أثناء الطباعة. تأكد من توصيل الطابعة.' : 'Erreur d\'impression. Vérifiez la connexion de l\'imprimante.');
      }
    } else {
      // Fallback: الطباعة عبر المتصفح العادي
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #kaf-printable-ticket-sheet, #kaf-printable-ticket-sheet * { visibility: visible !important; }
          #kaf-printable-ticket-sheet {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: auto !important; height: auto !important; padding: 0 !important;
            margin: 0 !important; background: transparent !important;
            border: none !important; box-shadow: none !important; display: block !important;
          }
          @page {
            size: ${
              format === 'thermal_43x20' ? '43mm 20mm' : 
              format === 'thermal_50x30' ? '50mm 29mm' : 
              '70mm 40mm'
            };
            margin: 0 !important;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: transparent !important;
          }
          .kaf-print-ticket {
            page-break-after: always !important;
            break-after: always !important;
            margin: 0 !important; box-shadow: none !important; border: none !important;
          }
        }
      `}</style>

      <div 
        className="bg-[#0B111E] border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-[#101A2E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  {title || (isAr ? 'ورشة طباعة الملصقات' : 'Atelier d\'Impression')}
                </h3>
                <span className="text-[10px] bg-sky-950 text-sky-300 font-mono px-2 py-0.5 rounded border border-sky-800">
                  {tickets.length} {isAr ? 'ملصق' : 'étiquette(s)'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x lg:divide-slate-800">
          
          {/* Controls */}
          <div className="lg:col-span-5 p-5 space-y-5 bg-[#0B111E]">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isAr ? 'مقاس الملصق :' : 'Format de l\'étiquette :'}</span>
              </label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setFormat('thermal_70x40')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${format === 'thermal_70x40' ? 'bg-emerald-950/60 border-emerald-500 text-white font-bold' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}
                >
                  <div className="text-xs font-bold">Standard Industriel</div>
                  <div className="text-[10px] text-slate-400 font-mono">70 × 40 mm</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat('thermal_50x30')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${format === 'thermal_50x30' ? 'bg-emerald-950/60 border-emerald-500 text-white font-bold' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}
                >
                  <div className="text-xs font-bold">Thermique Compact</div>
                  <div className="text-[10px] text-slate-400 font-mono">50 × 29 mm</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat('thermal_43x20')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${format === 'thermal_43x20' ? 'bg-emerald-950/60 border-emerald-500 text-white font-bold' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}
                >
                  <div className="text-xs font-bold">Micro Étiquette</div>
                  <div className="text-[10px] text-slate-400 font-mono">43 × 20 mm</div>
                </button>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 block">{isAr ? 'عدد النسخ :' : 'Exemplaires :'}</span>
              <div className="flex items-center gap-2">
                {[1, 2, 3].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCopies(n)}
                    className={`w-7 h-7 rounded text-xs font-bold font-mono transition-colors ${copies === n ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl space-y-2.5 text-xs">
              <span className="font-bold text-slate-300 block mb-1">{isAr ? 'عناصر الملصق :' : 'Inclusions :'}</span>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-300">{isAr ? 'الباركود' : 'Code-barres'}</span>
                <input type="checkbox" checked={showBarcode} onChange={(e) => setShowBarcode(e.target.checked)} className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-300">{isAr ? 'الشعار' : 'Logo'}</span>
                <input type="checkbox" checked={showLogo} onChange={(e) => setShowLogo(e.target.checked)} className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700" />
              </label>
            </div>

            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-[11px] text-rose-200 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-semibold">
                {isAr ? (
                  <span>في نافذة الطباعة، اختر الهوامش (Margins) = "بدون" (None)، والمقياس (Scale) = 100%، وأزل علامة الصح من "الرؤوس وتذييلات الصفحة" (Headers & Footers).</span>
                ) : (
                  <span>Dans la fenêtre d'impression, mettez les Marges sur "Aucune", l'Échelle sur 100%, et décochez "En-têtes et pieds de page".</span>
                )}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="lg:col-span-7 p-6 bg-slate-950 flex flex-col items-center justify-center min-h-[380px]">
            <div className="w-full flex items-center justify-between mb-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-emerald-400">
                <Maximize2 className="w-3.5 h-3.5" />
                <span>{isAr ? 'معاينة مباشرة' : 'Aperçu Direct'}</span>
              </span>
            </div>

            <div id="kaf-printable-ticket-sheet" className="p-6 bg-neutral-900/50 border border-slate-800 rounded-xl flex flex-col items-center gap-4 max-h-[500px] overflow-y-auto w-full">
              {tickets.map((t, idx) => (
                <div key={idx} className="flex flex-col items-center gap-3">
                  {Array.from({ length: copies }).map((_, cIdx) => (
                    <div key={`${idx}-${cIdx}`} className="relative group">
                      <PhysicalAssetTag 
                        data={t} 
                        format={format} 
                        showBarcode={showBarcode} 
                        showLogo={showLogo} 
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#101A2E] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400 font-mono">
            <span>{tickets.length * copies} {isAr ? 'ملصق إجمالي' : 'étiquette(s)'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold transition-colors">
              {isAr ? 'إغلاق' : 'Fermer'}
            </button>
            <button type="button" onClick={handlePrint} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950 transition-all hover:scale-[1.02]">
              <Printer className="w-4 h-4" />
              <span>{isAr ? 'طباعة' : 'Imprimer'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};