import React from 'react';
import { Database, RefreshCw, HardDrive, AlertTriangle, ArrowRight } from 'lucide-react';
import { translations } from '../translations';
import { Language } from '../types';

interface OfflineQueueBannerProps {
  pendingCount: number;
  conflictCount: number;
  onFlushQueue: () => void;
  isFlushing: boolean;
  onOpenQueueScreen: () => void;
  lang: Language;
}

export const OfflineQueueBanner: React.FC<OfflineQueueBannerProps> = ({
  pendingCount,
  conflictCount,
  onFlushQueue,
  isFlushing,
  onOpenQueueScreen,
  lang
}) => {
  const t = translations[lang];

  return (
    <div className="bg-[#1E1B4B] text-white border-b border-[#2E2868] px-3 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shadow-inner">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 font-mono-numbers">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500"></span>
          </span>
          <span className="font-semibold text-violet-200 uppercase tracking-wider">
            {t.queueBannerTitle}
          </span>
        </div>

        <div className="flex items-center gap-2 bg-[#2D266E] px-2.5 py-1 rounded border border-[#3E358E] font-mono-numbers text-violet-100">
          <Database className="w-3.5 h-3.5 text-violet-300" />
          <span className="font-bold text-violet-200">{pendingCount}</span>
          <span>{t.pendingMutations}</span>
        </div>

        {conflictCount > 0 && (
          <div className="flex items-center gap-1.5 bg-amber-950/80 border border-amber-600/70 text-amber-200 px-2 py-0.5 rounded font-mono-numbers">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="font-bold">{conflictCount}</span>
            <span>{t.conflictsDetected}</span>
          </div>
        )}

        <div className="hidden sm:flex items-center gap-1.5 text-violet-300 font-mono-numbers text-[11px]">
          <HardDrive className="w-3 h-3 text-violet-400" />
          <span>{t.cacheSize}: <span className="text-white font-medium">1.4 MB / IndexedDB OK</span></span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onFlushQueue}
          disabled={isFlushing || pendingCount === 0}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition-all ${
            pendingCount === 0
              ? 'bg-violet-900/40 text-violet-400 cursor-not-allowed border border-violet-800/40'
              : 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white active:scale-98 shadow-sm border border-violet-400/30'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFlushing ? 'animate-spin' : ''}`} />
          <span>{isFlushing ? '...' : t.flushQueue}</span>
        </button>

        <button
          onClick={onOpenQueueScreen}
          className="flex items-center gap-1 bg-[#2D266E] hover:bg-[#39308B] text-violet-200 px-2.5 py-1.5 rounded border border-[#3E358E] transition-colors"
          title={lang === 'fr' ? "Voir les détails de la file et les conflits" : lang === 'ar' ? "عرض تفاصيل رتل المزامنة وفض النزاعات" : "View queue details & conflicts"}
        >
          <span>{t.screenOfflineQueue}</span>
          <ArrowRight className={`w-3 h-3 ${lang === 'ar' ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </div>
  );
};
