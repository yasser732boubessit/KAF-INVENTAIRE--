import React, { useState } from 'react';
import { 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Wifi, 
  WifiOff, 
  Server, 
  Smartphone, 
  Check, 
  X, 
  FileCode, 
  HardDrive
} from 'lucide-react';
import { OfflineMutation, ConflictItem, Language } from '../types';
import { translations } from '../translations';
import { sound } from '../utils/audio';

interface OfflineQueueViewProps {
  mutations: OfflineMutation[];
  conflicts: ConflictItem[];
  onFlushQueue: () => void;
  isFlushing: boolean;
  onResolveConflict: (conflictId: string, resolution: 'local' | 'server' | 'merge') => void;
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  lang: Language;
}

export const OfflineQueueView: React.FC<OfflineQueueViewProps> = ({
  mutations,
  conflicts,
  onFlushQueue,
  isFlushing,
  onResolveConflict,
  isOnline,
  setIsOnline,
  lang
}) => {
  const t = translations[lang];
  const [selectedConflict, setSelectedConflict] = useState<ConflictItem | null>(conflicts[0] || null);

  const handleResolve = (conflictId: string, resolution: 'local' | 'server' | 'merge') => {
    sound.playScanSuccess();
    onResolveConflict(conflictId, resolution);
    const remaining = conflicts.filter(c => c.id !== conflictId);
    setSelectedConflict(remaining[0] || null);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] overflow-y-auto">
      {/* Header Strip with Sync Violet Accent */}
      <div className="bg-[#1E1B4B] text-white p-4 border-b border-[#2E2868]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse" />
              <h1 className="text-base font-bold text-violet-100 font-mono-numbers tracking-wide">
                {t.conflictTitle}
              </h1>
            </div>
            <p className="text-xs text-violet-300 mt-1 max-w-2xl">
              {t.conflictSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Network simulator switch */}
            <div className="flex items-center gap-2 bg-[#2D266E] px-3 py-1.5 rounded border border-[#3E358E] text-xs">
              <span className="text-violet-200">{t.simulateNetwork}:</span>
              <button
                onClick={() => setIsOnline(!isOnline)}
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded font-bold font-mono-numbers transition-colors ${
                  isOnline 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-rose-600 text-white animate-pulse'
                }`}
              >
                {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                <span>{isOnline ? t.networkOnline : t.networkOffline}</span>
              </button>
            </div>

            {/* Flush Queue Button */}
            <button
              onClick={onFlushQueue}
              disabled={isFlushing || mutations.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-bold transition-all ${
                mutations.length === 0
                  ? 'bg-violet-950/60 text-violet-400 border border-violet-800/40 cursor-not-allowed'
                  : 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg active:scale-98 border border-violet-400/40'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isFlushing ? 'animate-spin' : ''}`} />
              <span>{isFlushing ? 'جاري المزامنة...' : t.flushQueue}</span>
            </button>
          </div>
        </div>

        {/* Sync Engine Telemetry */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-[#2E2868]/70 text-xs font-mono-numbers">
          <div className="bg-[#2D266E]/60 p-2 rounded border border-[#3E358E]">
            <span className="text-violet-300 text-[11px] block font-sans">المعاملات المعلقة:</span>
            <span className="text-lg font-bold text-violet-100">{mutations.length}</span>
          </div>
          <div className="bg-[#2D266E]/60 p-2 rounded border border-[#3E358E]">
            <span className="text-violet-300 text-[11px] block font-sans">النزاعات النشطة:</span>
            <span className="text-lg font-bold text-amber-300">{conflicts.length}</span>
          </div>
          <div className="bg-[#2D266E]/60 p-2 rounded border border-[#3E358E]">
            <span className="text-violet-300 text-[11px] block font-sans">بروتوكول المزامنة:</span>
            <span className="text-sm font-semibold text-emerald-400">DELTA-SYNC v3.2</span>
          </div>
          <div className="bg-[#2D266E]/60 p-2 rounded border border-[#3E358E]">
            <span className="text-violet-300 text-[11px] block font-sans">مساحة الذاكرة المحلية:</span>
            <span className="text-sm font-semibold text-sky-300">1.4 MB / IndexedDB</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 space-y-6 max-w-6xl mx-auto w-full">
        {/* Conflict Resolution Split Inspector (if conflicts exist) */}
        {conflicts.length > 0 && (
          <div className="bg-white border-2 border-amber-300 rounded-lg overflow-hidden shadow-sm">
            <div className="bg-amber-50 px-4 py-2.5 border-b border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-xs text-amber-900 uppercase font-mono-numbers">
                  {t.conflictsDetected} ({conflicts.length})
                </h3>
              </div>
              <span className="text-[11px] text-amber-700 font-medium">
                يتطلب فض النزاع يدوياً لضمان سلامة السجل السحابي
              </span>
            </div>

            {selectedConflict ? (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono-numbers text-xs font-bold bg-slate-900 text-sky-400 px-2 py-0.5 rounded">
                      {selectedConflict.assetId}
                    </span>
                    <span className="font-bold text-slate-800 text-sm ms-2">
                      {selectedConflict.assetName}
                    </span>
                  </div>
                  <span className="text-xs font-mono-numbers text-slate-400">
                    الحقل المتنازع عليه: <strong className="text-slate-700">{selectedConflict.fieldName}</strong>
                  </span>
                </div>

                {/* Side-by-Side Diff Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Local Field Version */}
                  <div className="border border-sky-200 rounded-lg p-3 bg-sky-50/50 relative">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-sky-100">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-sky-800">
                        <Smartphone className="w-4 h-4 text-sky-600" />
                        <span>{t.localRecord}</span>
                      </div>
                      <span className="text-[10px] font-mono-numbers bg-sky-200/80 text-sky-800 px-1.5 py-0.5 rounded">
                        FIELD TECH-941
                      </span>
                    </div>

                    <div className="font-mono-numbers text-xs bg-white p-2.5 rounded border border-sky-200 text-sky-950 font-semibold min-h-[48px] flex items-center">
                      {selectedConflict.localValue}
                    </div>

                    <button
                      onClick={() => handleResolve(selectedConflict.id, 'local')}
                      className="mt-3 w-full py-1.5 bg-[#0284C7] hover:bg-[#0369a1] text-white rounded text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{t.acceptLocal}</span>
                    </button>
                  </div>

                  {/* Cloud Master Version */}
                  <div className="border border-slate-300 rounded-lg p-3 bg-slate-50 relative">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <Server className="w-4 h-4 text-slate-600" />
                        <span>{t.cloudRecord}</span>
                      </div>
                      <span className="text-[10px] font-mono-numbers bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                        CLOUD LEDGER
                      </span>
                    </div>

                    <div className="font-mono-numbers text-xs bg-white p-2.5 rounded border border-slate-200 text-slate-800 font-semibold min-h-[48px] flex items-center">
                      {selectedConflict.serverValue}
                    </div>

                    <button
                      onClick={() => handleResolve(selectedConflict.id, 'server')}
                      className="mt-3 w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{t.acceptCloud}</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-200">
                  <button
                    onClick={() => handleResolve(selectedConflict.id, 'merge')}
                    className="text-xs text-violet-700 hover:text-violet-900 font-semibold underline"
                  >
                    {t.mergeBoth}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Pending Mutations List */}
        <div className="bg-white border border-[#CBD5E1] rounded-lg overflow-hidden shadow-sm">
          <div className="bg-[#F8FAFC] px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-violet-600" />
              <h3 className="font-bold text-xs text-slate-800 uppercase font-mono-numbers">
                {t.pendingMutationsHeader} ({mutations.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-mono-numbers">
              LAST TRANSACTION ID: MUT-99412
            </span>
          </div>

          {mutations.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-medium">{t.noPendingMutations}</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {mutations.map((m) => (
                <div key={m.id} className="p-3 hover:bg-slate-50 transition-colors flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono-numbers font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {m.id}
                    </span>
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        <span className="text-sky-700 font-mono-numbers">{m.assetId}</span>
                        <span>{m.assetName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono-numbers mt-0.5">
                        TYPE: <span className="font-bold text-violet-700">{m.type}</span> &bull; {m.timestamp}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <pre className="text-[11px] bg-slate-900 text-sky-300 px-2.5 py-1 rounded font-mono-numbers max-w-xs truncate border border-slate-700">
                      {JSON.stringify(m.payload)}
                    </pre>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono-numbers bg-violet-100 text-violet-800 border border-violet-200">
                      PENDING SYNC
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
