import React, { useRef, useState } from 'react';
import { 
  Download, 
  Printer, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  Lock,
  Stamp
} from 'lucide-react';
import { Asset, Language } from '../types';
import { translations } from '../translations';
import { sound } from '../utils/audio';

interface AuditReportManifestProps {
  assets: Asset[];
  lang: Language;
}

export const AuditReportManifest: React.FC<AuditReportManifestProps> = ({
  assets,
  lang
}) => {
  const t = translations[lang];

  const auditorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const controllerCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isDrawingAuditor, setIsDrawingAuditor] = useState(false);
  const [isDrawingController, setIsDrawingController] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const total = assets.length;
  const reconciled = assets.filter(a => a.inventoryStatus === 'CONFORME').length;
  const discrepancies = assets.filter(a => a.inventoryStatus === 'ECART_LOCALISATION').length;
  const missing = assets.filter(a => a.inventoryStatus === 'MANQUANT').length;
  const accuracyRate = total > 0 ? ((reconciled / total) * 100).toFixed(1) : '0';

  const getDisplayName = (a: Asset) => {
    if (lang === 'fr') return a.nameFr || a.name;
    if (lang === 'ar') return a.nameAr;
    return a.name;
  };

  const getDisplayNotes = (a: Asset) => {
    if (lang === 'fr') return a.notesFr || a.notes || '';
    return a.notes || '';
  };

  // Export CSV
  const handleExportCSV = () => {
    sound.playScanSuccess();
    const headers = lang === 'fr'
      ? ["Tag Actif", "Désignation", "N° Série", "Code-Barres", "Catégorie", "Emplacement", "État", "Statut", "Dernier Scan", "Remarques"]
      : lang === 'ar'
      ? ["رمز الأصل", "الوصف", "الرقم التسلسلي", "الباركود", "التصنيف", "الموقع", "الحالة", "حالة التدقيق", "آخر مسح", "ملاحظات"]
      : ["Asset ID", "Name", "Serial Number", "Barcode", "Category", "Location", "Condition", "Status", "Last Scanned", "Notes"];

    const rows = assets.map(a => [
      a.id,
      `"${getDisplayName(a).replace(/"/g, '""')}"`,
      a.serialNumber,
      a.barcode,
      a.category,
      a.scannedBayLocation || a.expectedBayLocation,
      a.condition,
      a.inventoryStatus,
      a.lastScannedAt || "N/A",
      `"${getDisplayNotes(a).replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BORDEREAU_AUDIT_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON
  const handleExportJSON = () => {
    sound.playScanSuccess();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(assets, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `AUDIT_SCHEMA_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Signature canvas drawing handlers
  const startDrawing = (canvasRef: React.RefObject<HTMLCanvasElement | null>, setDrawing: (v: boolean) => void, e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isLocked) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setDrawing(true);
  };

  const draw = (canvasRef: React.RefObject<HTMLCanvasElement | null>, isDrawing: boolean, e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isLocked) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = (setDrawing: (v: boolean) => void) => {
    setDrawing(false);
  };

  const clearCanvas = (canvasRef: React.RefObject<HTMLCanvasElement | null>) => {
    if (isLocked) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleCommitSignOff = () => {
    setIsLocked(true);
    sound.playSyncFlush();
    setSuccessMessage(t.signedSuccess);
  };

  return (
    <div className="flex-1 bg-[#F8FAFC] overflow-y-auto p-4 lg:p-6 space-y-6 max-w-5xl mx-auto w-full">
      {/* Manifest Header */}
      <div className="bg-white border border-[#CBD5E1] rounded-lg p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono-numbers font-bold text-xs bg-slate-900 text-sky-400 px-2 py-0.5 rounded">
                AUD-CERT-2026-Q1
              </span>
              <h1 className="font-bold text-lg text-slate-900">
                {t.reportsTitle}
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">{t.reportsSubtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{t.exportCsv}</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.exportJson}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t.printReport}</span>
            </button>
          </div>
        </div>

        {/* Executive Accuracy Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-[#F8FAFC] p-3 rounded border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium block">{t.totalAssets}</span>
            <span className="text-2xl font-bold font-mono-numbers text-slate-900">{total}</span>
          </div>

          <div className="bg-[#ECFDF5] p-3 rounded border border-[#A7F3D0]">
            <span className="text-[11px] text-emerald-800 font-medium block">{t.reconciled}</span>
            <span className="text-2xl font-bold font-mono-numbers text-emerald-700">{reconciled}</span>
          </div>

          <div className="bg-[#FFFBEB] p-3 rounded border border-[#FDE68A]">
            <span className="text-[11px] text-amber-800 font-medium block">{t.discrepancies}</span>
            <span className="text-2xl font-bold font-mono-numbers text-amber-700">{discrepancies}</span>
          </div>

          <div className="bg-[#EFF6FF] p-3 rounded border border-[#BFDBFE]">
            <span className="text-[11px] text-blue-800 font-medium block">{t.reconciliationAccuracy}</span>
            <span className="text-2xl font-bold font-mono-numbers text-blue-700">{accuracyRate}%</span>
          </div>
        </div>
      </div>

      {/* Critical Exceptions & Discrepancies Table */}
      <div className="bg-white border border-[#CBD5E1] rounded-lg overflow-hidden shadow-sm">
        <div className="bg-[#F8FAFC] px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-xs uppercase tracking-wider text-slate-800 font-mono-numbers flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>{t.criticalIssues} ({discrepancies + missing})</span>
          </h2>
          <span className="text-[11px] text-slate-500 font-mono-numbers">
            PRIORITY ESCALATION LEVEL: ALPHA
          </span>
        </div>

        <div className="divide-y divide-slate-200 text-xs">
          {assets.filter(a => a.inventoryStatus === 'ECART_LOCALISATION' || a.inventoryStatus === 'MANQUANT').map((item) => (
            <div key={item.id} className="p-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="font-mono-numbers font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {item.id}
                </span>
                <div>
                  <div className="font-bold text-slate-800">
                    {getDisplayName(item)}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono-numbers mt-0.5">
                    LOC: <span className="font-bold text-sky-700">{item.scannedBayLocation || item.expectedBayLocation}</span> &bull; SN: {item.serialNumber}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-600 bg-slate-100 px-2.5 py-1 rounded italic max-w-sm">
                  &ldquo;{getDisplayNotes(item)}&rdquo;
                </span>

                {item.inventoryStatus === 'ECART_LOCALISATION' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    {t.statLocationDiff}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                    {t.statMissing}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Digital Sign-off & Certification Canvas */}
      <div className="bg-white border border-[#CBD5E1] rounded-lg p-5 shadow-sm space-y-4">
        <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stamp className="w-5 h-5 text-sky-600" />
            <h2 className="font-bold text-sm text-slate-900">
              {t.digitalSignature}
            </h2>
          </div>
          {isLocked && (
            <span className="bg-emerald-100 text-emerald-800 font-bold text-xs px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-300 font-mono-numbers">
              <Lock className="w-3.5 h-3.5" /> {t.certifiedLocked}
            </span>
          )}
        </div>

        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Auditor Signature Pad */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">{t.signAuditor}</span>
              {!isLocked && (
                <button
                  onClick={() => clearCanvas(auditorCanvasRef)}
                  className="text-slate-400 hover:text-slate-700 flex items-center gap-1 text-[11px]"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t.clearSign}</span>
                </button>
              )}
            </div>
            <div className="border-2 border-dashed border-slate-300 rounded bg-[#F8FAFC] relative overflow-hidden">
              <canvas
                ref={auditorCanvasRef}
                width={360}
                height={120}
                onMouseDown={(e) => startDrawing(auditorCanvasRef, setIsDrawingAuditor, e)}
                onMouseMove={(e) => draw(auditorCanvasRef, isDrawingAuditor, e)}
                onMouseUp={() => stopDrawing(setIsDrawingAuditor)}
                onMouseLeave={() => stopDrawing(setIsDrawingAuditor)}
                className={`w-full h-28 ${isLocked ? 'cursor-not-allowed opacity-90' : 'cursor-crosshair'}`}
              />
              <div className="absolute bottom-1 right-2 pointer-events-none text-[10px] text-slate-400 font-mono-numbers">
                ID: TECH-941 &bull; 2026-10-08
              </div>
            </div>
          </div>

          {/* Plant Operations Controller Signature Pad */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">{t.signController}</span>
              {!isLocked && (
                <button
                  onClick={() => clearCanvas(controllerCanvasRef)}
                  className="text-slate-400 hover:text-slate-700 flex items-center gap-1 text-[11px]"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t.clearSign}</span>
                </button>
              )}
            </div>
            <div className="border-2 border-dashed border-slate-300 rounded bg-[#F8FAFC] relative overflow-hidden">
              <canvas
                ref={controllerCanvasRef}
                width={360}
                height={120}
                onMouseDown={(e) => startDrawing(controllerCanvasRef, setIsDrawingController, e)}
                onMouseMove={(e) => draw(controllerCanvasRef, isDrawingController, e)}
                onMouseUp={() => stopDrawing(setIsDrawingController)}
                onMouseLeave={() => stopDrawing(setIsDrawingController)}
                className={`w-full h-28 ${isLocked ? 'cursor-not-allowed opacity-90' : 'cursor-crosshair'}`}
              />
              <div className="absolute bottom-1 right-2 pointer-events-none text-[10px] text-slate-400 font-mono-numbers">
                ID: MGR-CTRL-09 &bull; WEST-DC
              </div>
            </div>
          </div>
        </div>

        {!isLocked && (
          <div className="flex justify-end pt-3 border-t border-slate-200">
            <button
              onClick={handleCommitSignOff}
              className="px-5 py-2 bg-[#0F172A] hover:bg-slate-800 text-white rounded font-bold text-xs shadow-md flex items-center gap-2"
            >
              <Stamp className="w-4 h-4 text-sky-400" />
              <span>{t.commitSignOff}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
