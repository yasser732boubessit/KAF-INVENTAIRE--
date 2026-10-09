import React, { useState } from 'react';
import { 
  LayoutDashboard,
  ScanLine,
  PackageSearch,
  ClipboardCheck,
  MapPin,
  Database,
  ShieldCheck,
  CheckSquare,
  FileText,
  HardDrive,
  ChevronRight,
  ChevronLeft,
  Download,
  Terminal,
  Activity
} from 'lucide-react';
import { ActiveScreen, Language } from '../types';
import { translations } from '../translations';
import { sound } from '../utils/audio';

interface RightSidebarProps {
  activeScreen: ActiveScreen;
  setActiveScreen: (screen: ActiveScreen) => void;
  lang: Language;
  pendingDiscoveriesCount: number;
  pendingMutationCount: number;
  isElectron: boolean;
  onQuickBackup?: () => void;
}

interface NavItemDef {
  id: ActiveScreen;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  badgeColor?: 'yellow' | 'green' | 'neutral';
  shortcut: string;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  activeScreen,
  setActiveScreen,
  lang,
  pendingDiscoveriesCount,
  pendingMutationCount,
  isElectron,
  onQuickBackup
}) => {
  const t = translations[lang];
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('kaf_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem('kaf_sidebar_collapsed', String(next));
    } catch {}
    sound.playTap();
  };

  const navItems: NavItemDef[] = [
    { 
      id: 'cockpit', 
      label: t.screenCockpit, 
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />, 
      shortcut: 'Alt+1' 
    },
    { 
      id: 'scanner', 
      label: t.screenScanner, 
      icon: <ScanLine className="w-4 h-4 shrink-0" />, 
      shortcut: 'Alt+2' 
    },
    { 
      id: 'decouvertes', 
      label: t.screenDiscoveries, 
      icon: <PackageSearch className="w-4 h-4 shrink-0" />, 
      badge: pendingDiscoveriesCount,
      badgeColor: 'yellow',
      shortcut: 'Alt+3' 
    },
    { 
      id: 'campagnes', 
      label: t.screenCampaigns, 
      icon: <ClipboardCheck className="w-4 h-4 shrink-0" />, 
      shortcut: 'Alt+4' 
    },
    { 
      id: 'warehouse_map', 
      label: t.screenWarehouseMap, 
      icon: <MapPin className="w-4 h-4 shrink-0" />, 
      shortcut: 'Alt+5' 
    },
    { 
      id: 'offline_queue', 
      label: t.screenOfflineQueue, 
      icon: <Database className="w-4 h-4 shrink-0" />, 
      badge: pendingMutationCount,
      badgeColor: 'neutral',
      shortcut: 'Alt+6' 
    },
    { 
      id: 'audit_logs', 
      label: t.screenAuditLogs, 
      icon: <ShieldCheck className="w-4 h-4 shrink-0" />, 
      shortcut: 'Alt+7' 
    },
    { 
      id: 'checklist', 
      label: t.screenChecklist, 
      icon: <CheckSquare className="w-4 h-4 shrink-0" />, 
      shortcut: 'Alt+8' 
    },
    { 
      id: 'reports', 
      label: t.screenReports, 
      icon: <FileText className="w-4 h-4 shrink-0" />, 
      shortcut: 'Alt+9' 
    },
    { 
      id: 'desktop', 
      label: t.screenDesktop, 
      icon: <HardDrive className="w-4 h-4 shrink-0 text-[#16A34A]" />, 
      badgeColor: 'green',
      shortcut: 'Alt+0' 
    },
  ];

  return (
    <aside 
      className={`h-full bg-[#0B0F17] border-l border-neutral-800 text-neutral-300 flex flex-col shrink-0 transition-all duration-200 select-none z-30 shadow-xl ${
        isCollapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
      style={{ direction: 'ltr' }} // Keep sidebar layout strictly anchored on the right edge
      aria-label="Navigation principale KAF-INVENTAIRE"
    >
      {/* Header with Title / Collapse Toggle */}
      <div className="h-12 border-b border-neutral-800 flex items-center justify-between px-3 gap-2 shrink-0">
        {!isCollapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse shrink-0" />
            <span className="text-[11px] font-bold tracking-wider text-white uppercase truncate">
              {t.navOverview}
            </span>
          </div>
        )}

        <button
          onClick={toggleCollapse}
          className={`p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-colors ${
            isCollapsed ? 'mx-auto' : ''
          }`}
          title={isCollapsed ? 'Développer la navigation' : 'Réduire la navigation'}
          aria-label={isCollapsed ? 'Développer la navigation' : 'Réduire la navigation'}
        >
          {isCollapsed ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Nav Items List */}
      <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden space-y-1 px-2 scrollbar-thin scrollbar-thumb-neutral-800">
        {navItems.map((item) => {
          const isActive = activeScreen === item.id;

          return (
            <div key={item.id} className="relative group">
              <button
                onClick={() => {
                  setActiveScreen(item.id);
                  sound.playScanSuccess();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-xs font-medium transition-all relative ${
                  isActive
                    ? 'bg-neutral-800/90 text-white font-semibold border-l-2 border-[#16A34A] pl-2.5 shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
              >
                {/* Active Indicator Pillar for Collapsed Mode */}
                {isActive && isCollapsed && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#16A34A] rounded-r" />
                )}

                {/* Module Icon */}
                <span className={`${isActive ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-200'}`}>
                  {item.icon}
                </span>

                {/* Module Label (when expanded) */}
                {!isCollapsed && (
                  <span className="truncate flex-1 text-left">
                    {item.label}
                  </span>
                )}

                {/* Badge Notification */}
                {item.badge !== undefined && item.badge > 0 && (
                  <>
                    {!isCollapsed ? (
                      <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded shrink-0 ${
                        item.badgeColor === 'yellow'
                          ? 'bg-[#FACC15] text-neutral-900 font-extrabold'
                          : 'bg-neutral-700 text-white'
                      }`}>
                        {item.badge}
                      </span>
                    ) : (
                      <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                        item.badgeColor === 'yellow' ? 'bg-[#FACC15]' : 'bg-[#16A34A]'
                      }`} />
                    )}
                  </>
                )}

                {/* Keyboard Shortcut Hint (Expanded) */}
                {!isCollapsed && (
                  <span className="text-[10px] text-neutral-400 font-mono hidden xl:inline opacity-60 group-hover:opacity-100">
                    {item.shortcut}
                  </span>
                )}
              </button>

              {/* Tooltip for Collapsed Mode */}
              {isCollapsed && (
                <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover:flex items-center gap-2 bg-[#0B0F17] text-white text-xs px-2.5 py-1.5 rounded border border-neutral-700 shadow-2xl z-50 whitespace-nowrap pointer-events-none">
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="bg-[#FACC15] text-neutral-900 px-1 text-[10px] font-bold rounded">
                      {item.badge}
                    </span>
                  )}
                  <span className="text-[10px] text-neutral-400 font-mono border-l border-neutral-700 pl-1.5">
                    {item.shortcut}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer Info Box: Engine Mode & Quick Backup */}
      <div className="p-2 border-t border-neutral-800 shrink-0 bg-[#070A0F]">
        {!isCollapsed ? (
          <div className="space-y-2">
            <button
              onClick={() => setActiveScreen('desktop')}
              className="w-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 p-2 rounded text-left transition-colors"
              title="Cliquer pour ouvrir le centre de contrôle SQLite Desktop"
            >
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="flex items-center gap-1.5 font-medium text-white">
                  <Activity className="w-3.5 h-3.5 text-[#16A34A]" />
                  <span>{isElectron ? 'SQLite Windows' : 'SQLite Web Sync'}</span>
                </span>
                <span className="text-[10px] font-mono text-[#16A34A] bg-[#16A34A]/10 px-1 py-0.5 rounded border border-[#16A34A]/30">
                  {isElectron ? 'Natif WAL' : 'IndexedDB'}
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 truncate">
                {isElectron ? 'Stockage AppData actif' : '100% Hors-ligne Garanti'}
              </p>
            </button>

            {onQuickBackup && (
              <button
                onClick={onQuickBackup}
                className="w-full flex items-center justify-center gap-1.5 bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-white text-[11px] font-medium py-1.5 px-2 rounded border border-neutral-700/60 transition-colors"
                title="Télécharger une sauvegarde instantanée de la base"
              >
                <Download className="w-3.5 h-3.5 text-[#16A34A]" />
                <span>Sauvegarde Rapide (.db)</span>
              </button>
            )}

            <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 font-mono">
              <span className="flex items-center gap-1">
                <Terminal className="w-3 h-3" />
                <span>TRM-01</span>
              </span>
              <span>v4.2.0 Win64</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1">
            <button
              onClick={() => setActiveScreen('desktop')}
              className="p-2 rounded bg-neutral-900 border border-neutral-800 text-[#16A34A] hover:bg-neutral-800 transition-colors"
              title={isElectron ? 'SQLite Windows Natif' : 'IndexedDB SQLite Moteur'}
            >
              <HardDrive className="w-4 h-4" />
            </button>
            {onQuickBackup && (
              <button
                onClick={onQuickBackup}
                className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                title="Sauvegarde Rapide"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
