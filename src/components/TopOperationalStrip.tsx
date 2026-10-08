import React, { useState, useEffect } from 'react';
import { 
  BatteryCharging, 
  Wifi, 
  WifiOff, 
  Volume2, 
  VolumeX, 
  Layers, 
  Scan, 
  RefreshCw, 
  MapPin, 
  FileCheck2, 
  Languages,
  Activity
} from 'lucide-react';
import { ActiveScreen, Language } from '../types';
import { translations } from '../translations';
import { sound } from '../utils/audio';

interface TopOperationalStripProps {
  activeScreen: ActiveScreen;
  setActiveScreen: (screen: ActiveScreen) => void;
  lang: Language;
  setLang: (lang: Language) => void;
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  pendingMutationCount: number;
}

export const TopOperationalStrip: React.FC<TopOperationalStripProps> = ({
  activeScreen,
  setActiveScreen,
  lang,
  setLang,
  isOnline,
  setIsOnline,
  pendingMutationCount
}) => {
  const t = translations[lang];
  const [isMuted, setIsMuted] = useState(sound.isMuted);
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [lang]);

  const toggleMute = () => {
    const nextState = !isMuted;
    sound.isMuted = nextState;
    setIsMuted(nextState);
    if (!nextState) sound.playScanSuccess();
  };

  const navItems: { id: ActiveScreen; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'cockpit', label: t.screenCockpit, icon: <Layers className="w-4 h-4" /> },
    { id: 'scanner', label: t.screenScanner, icon: <Scan className="w-4 h-4" /> },
    { 
      id: 'offline_queue', 
      label: t.screenOfflineQueue, 
      icon: <RefreshCw className="w-4 h-4" />, 
      badge: pendingMutationCount 
    },
    { id: 'warehouse_map', label: t.screenWarehouseMap, icon: <MapPin className="w-4 h-4" /> },
    { id: 'reports', label: t.screenReports, icon: <FileCheck2 className="w-4 h-4" /> },
  ];

  return (
    <header className="bg-[#0F172A] text-white border-b border-[#1E293B] sticky top-0 z-40 select-none">
      {/* Upper Hardware Telemetry Strip */}
      <div className="px-3 py-1.5 border-b border-[#1E293B]/80 flex flex-wrap items-center justify-between text-[11px] font-mono-numbers text-slate-300">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-sky-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="tracking-wider">TRM-8842-X</span>
            <span className="text-slate-500 font-sans">|</span>
            <span className="text-slate-300 font-sans">{t.terminalId}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 bg-[#1E293B] px-2 py-0.5 rounded border border-slate-700">
            <Activity className="w-3 h-3 text-sky-400" />
            <span>{t.scannerStatus}:</span>
            <span className="text-emerald-400 font-semibold">{t.ready}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Network State Toggle */}
          <button
            onClick={() => setIsOnline(!isOnline)}
            title={isOnline ? "انقر للمحاكاة بدون اتصال" : "انقر لإعادة الاتصال"}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors ${
              isOnline 
                ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60' 
                : 'bg-rose-950/80 border-rose-700/80 text-rose-300 hover:bg-rose-900/80 animate-pulse'
            }`}
          >
            {isOnline ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-rose-400" />}
            <span className="font-semibold">{isOnline ? `${t.online} (12ms)` : t.offline}</span>
          </button>

          {/* Battery */}
          <div className="flex items-center gap-1 text-slate-300">
            <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
            <span>94%</span>
          </div>

          {/* Audio toggle */}
          <button 
            onClick={toggleMute}
            className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors p-1"
            title={isMuted ? t.soundOff : t.soundOn}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-amber-400" /> : <Volume2 className="w-3.5 h-3.5 text-sky-400" />}
          </button>

          {/* Language Switch */}
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-1 bg-[#1E293B] hover:bg-slate-700 px-2 py-0.5 rounded border border-slate-700 text-sky-300 transition-colors"
          >
            <Languages className="w-3 h-3" />
            <span className="font-sans font-medium">{lang === 'ar' ? 'English' : 'العربية'}</span>
          </button>

          {/* Live Clock */}
          <div className="hidden md:block text-slate-400 tracking-wider">
            {timeStr}
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="px-3 flex items-center justify-between overflow-x-auto">
        <nav className="flex items-center gap-1 py-1">
          {navItems.map((item) => {
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveScreen(item.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-t transition-all border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'border-[#0284C7] bg-[#1E293B] text-white shadow-sm'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]/40'
                }`}
              >
                <span className={isActive ? 'text-sky-400' : 'text-slate-400'}>{item.icon}</span>
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="bg-[#7C3AED] text-white text-[10px] font-mono-numbers px-1.5 py-0.2 rounded-full font-bold ml-1">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 font-mono-numbers py-1">
          <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">
            SESSION: <span className="text-sky-300 font-semibold">AUD-2026-Q1</span>
          </span>
          <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">
            LOC: <span className="text-emerald-300 font-semibold">WEST-DC-ZONE-C</span>
          </span>
        </div>
      </div>
    </header>
  );
};
