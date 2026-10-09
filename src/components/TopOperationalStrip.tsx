import React, { useState, useRef } from 'react';
import { 
  ClipboardCheck,
  Search,
  X,
  Languages,
  UserRound,
  Wifi,
  WifiOff,
  CheckCircle2,
  RefreshCw,
  HardDrive,
  AlertTriangle,
  ScanLine,
  ChevronDown
} from 'lucide-react';
import { ActiveScreen, Language, UserRole } from '../types';
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
  conflictCount: number;
  userRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onQuickSearch?: (query: string) => void;
  onFlushQueue?: () => void;
  isFlushing?: boolean;
  onOpenConflicts?: () => void;
  activeCampaignTitle?: string;
  activeCampaignProgress?: number;
  isElectron?: boolean;
}

export const TopOperationalStrip: React.FC<TopOperationalStripProps> = ({
  activeScreen,
  setActiveScreen,
  lang,
  setLang,
  isOnline,
  setIsOnline,
  pendingMutationCount,
  conflictCount,
  userRole,
  onRoleChange,
  onQuickSearch,
  onFlushQueue,
  isFlushing = false,
  onOpenConflicts,
  activeCampaignTitle = 'CAMP-2026-Q1',
  activeCampaignProgress = 75,
  isElectron = false,
}) => {
  const t = translations[lang];
  const [searchQuery, setSearchQuery] = useState('');
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Handle Search Submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && onQuickSearch) {
      onQuickSearch(searchQuery.trim());
    }
  };

  return (
    <header className="bg-[#0B0F17] text-white border-b border-neutral-800 sticky top-0 z-40 select-none shadow-md">
      {/* =========================================================================
          NIVEAU 1 — BARRE SYSTÈME COMPACTE (Compact System Bar)
          Logo KAF-INVENTAIRE | Recherche globale | Campagne active | Réseau & Sync | Langues | Rôle
          ========================================================================= */}
      <div className="px-4 py-2 border-b border-neutral-800/80 flex flex-wrap items-center justify-between text-xs gap-3">
        {/* Gauche: Logo KAF-INVENTAIRE & Terminal */}
        <div className="flex items-center gap-3">
          <div 
            onClick={() => setActiveScreen('cockpit')}
            className="flex items-center gap-2 cursor-pointer group"
            title="KAF-INVENTAIRE Industrial Suite"
          >
            <div className="w-6 h-6 rounded bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-white text-[11px] group-hover:border-[#16A34A] transition-colors">
              KAF
            </div>
            <div className="flex items-center gap-2 font-bold tracking-wider text-white text-sm">
              <span>KAF-INVENTAIRE</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] inline-block" title="Système opérationnel" />
            </div>
            <span className="hidden sm:inline text-neutral-400 font-mono text-[11px] border-l border-neutral-800 pl-2">
              TRM-01
            </span>
          </div>

          {/* Desktop SQLite Engine Badge */}
          <button
            onClick={() => setActiveScreen('desktop')}
            className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 hover:border-[#16A34A] text-neutral-300 hover:text-white transition-colors"
            title="Ouvrir le centre de contrôle SQLite Desktop"
          >
            <HardDrive className="w-3 h-3 text-[#16A34A]" />
            <span className="text-[10px] font-mono">
              {isElectron ? 'SQLITE NATIVE (WAL)' : 'SQLITE OFFLINE ENGINE'}
            </span>
          </button>

          {/* Campagne d'inventaire active et pourcentage de progression */}
          <button
            onClick={() => setActiveScreen('campagnes')}
            className="hidden md:flex items-center gap-2 bg-neutral-900/90 hover:bg-neutral-800/90 border border-neutral-800 hover:border-neutral-700 px-2.5 py-1 rounded text-[11px] transition-colors"
            title={`${t.activeCampaign} : ${activeCampaignTitle}`}
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-neutral-300" />
            <span className="text-neutral-400">{t.activeCampaign}:</span>
            <span className="text-white font-medium truncate max-w-[140px] lg:max-w-[180px]">{activeCampaignTitle}</span>
            <div className="flex items-center gap-1.5 pl-1">
              <div className="w-12 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#16A34A] rounded-full transition-all duration-500" 
                  style={{ width: `${activeCampaignProgress}%` }} 
                />
              </div>
              <span className="text-[#16A34A] font-mono font-bold text-[10px]">
                {activeCampaignProgress}%
              </span>
            </div>
          </button>
        </div>

        {/* Centre: Recherche Globale */}
        <div className="flex-1 max-w-xs sm:max-w-md hidden sm:block">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.quickSearchPlaceholder}
              className="w-full bg-neutral-900 border border-neutral-700/80 rounded py-1 pl-8 pr-12 text-xs text-white placeholder-neutral-400 focus:outline-none focus:border-[#16A34A] font-mono transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-7 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                title="Effacer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 bg-neutral-800 text-neutral-400 px-1 py-0.2 rounded border border-neutral-700 text-[9px] pointer-events-none">
              /
            </kbd>
          </form>
        </div>

        {/* Droite: Quick Scan + Connexion, Langues, Profil & Rôle */}
        <div className="flex items-center gap-2">
          {/* Quick Scan Button (Compact) */}
          <button
            onClick={() => setActiveScreen('scanner')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded shadow transition-colors ${
              activeScreen === 'scanner'
                ? 'bg-[#16A34A] text-white ring-2 ring-[#16A34A]/50'
                : 'bg-[#16A34A] hover:bg-[#15803D] text-white'
            }`}
            title="Activer le scanner optique ou la caméra (Alt+2)"
          >
            <ScanLine className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline">{t.quickScanBtn}</span>
          </button>

          {/* État de connexion au réseau */}
          <button
            onClick={() => {
              setIsOnline(!isOnline);
              sound.playTap();
            }}
            title={isOnline ? t.networkOnline : t.networkOffline}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-medium transition-colors ${
              isOnline 
                ? 'bg-neutral-900 border-neutral-700 text-[#16A34A] hover:bg-neutral-800' 
                : 'bg-neutral-900 border-yellow-500/50 text-[#FACC15] hover:bg-neutral-800'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-[#16A34A]" />
                <span className="hidden md:inline">{t.networkOnline}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-[#FACC15]" />
                <span>{t.networkOffline}</span>
              </>
            )}
          </button>

          {/* Sélecteur de Langue (AR / FR / EN) */}
          <div className="relative">
            <button
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="flex items-center gap-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 px-2 py-1 rounded text-[11px] text-white transition-colors"
              title="Changer de langue / تغيير اللغة"
            >
              <Languages className="w-3.5 h-3.5 text-neutral-400" />
              <span className="font-semibold uppercase">{lang}</span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {isLangMenuOpen && (
              <div className="absolute right-0 mt-1 w-28 bg-neutral-900 border border-neutral-700 rounded shadow-lg py-1 z-50 text-xs">
                <button
                  onClick={() => { setLang('fr'); setIsLangMenuOpen(false); sound.playTap(); }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-neutral-800 flex items-center justify-between ${lang === 'fr' ? 'text-[#16A34A] font-bold' : 'text-white'}`}
                >
                  <span>Français</span>
                  {lang === 'fr' && <span className="text-[#16A34A]">✓</span>}
                </button>
                <button
                  onClick={() => { setLang('ar'); setIsLangMenuOpen(false); sound.playTap(); }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-neutral-800 flex items-center justify-between ${lang === 'ar' ? 'text-[#16A34A] font-bold' : 'text-white'}`}
                >
                  <span>العربية</span>
                  {lang === 'ar' && <span className="text-[#16A34A]">✓</span>}
                </button>
                <button
                  onClick={() => { setLang('en'); setIsLangMenuOpen(false); sound.playTap(); }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-neutral-800 flex items-center justify-between ${lang === 'en' ? 'text-[#16A34A] font-bold' : 'text-white'}`}
                >
                  <span>English</span>
                  {lang === 'en' && <span className="text-[#16A34A]">✓</span>}
                </button>
              </div>
            )}
          </div>

          {/* Rôle et Profil Utilisateur */}
          <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-700 px-2.5 py-1 rounded text-[11px]">
            <UserRound className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={userRole}
              onChange={(e) => onRoleChange(e.target.value as UserRole)}
              className="bg-transparent text-white font-medium border-none outline-none cursor-pointer text-[11px]"
              title={t.currentRole}
            >
              <option value="AGENT_INVENTAIRE" className="bg-neutral-900 text-white">
                {lang === 'fr' ? 'Agent (Terrain)' : lang === 'ar' ? 'وكيل (ميداني)' : 'Agent (Field)'}
              </option>
              <option value="CONTROLEUR_ZONE" className="bg-neutral-900 text-white">
                {lang === 'fr' ? 'Contrôleur (Zone)' : lang === 'ar' ? 'مراقب (المنطقة)' : 'Controller (Zone)'}
              </option>
              <option value="RESPONSABLE_PATRIMOINE" className="bg-neutral-900 text-white">
                {lang === 'fr' ? 'Responsable (Admin)' : lang === 'ar' ? 'مسؤول (إدارة)' : 'Manager (Admin)'}
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* =========================================================================
          NIVEAU 2 — CONTEXTE OPÉRATIONNEL & TRANSACTIONS
          IndexedDB / SQLite Storage | File d'attente | Alertes conflits
          ========================================================================= */}
      <div className="bg-[#0A0D14] px-4 py-1.5 flex flex-wrap items-center justify-between text-xs gap-3">
        {/* Informations opérationnelles */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* État stockage local */}
          <div 
            onClick={() => setActiveScreen('desktop')}
            className="flex items-center gap-1.5 text-neutral-300 font-mono text-[11px] cursor-pointer hover:text-white transition-colors" 
            title="Cliquer pour afficher l'explorateur SQLite"
          >
            <HardDrive className="w-3.5 h-3.5 text-[#16A34A]" />
            <span>{isElectron ? 'SQLite Windows WAL' : 'IndexedDB SQLite (100% Hors-ligne)'}</span>
          </div>

          <div className="h-3.5 w-px bg-neutral-800 hidden sm:block" />

          {/* Nombre d'opérations en attente de synchronisation */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            {pendingMutationCount > 0 ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-[#FACC15]" />
                <span className="text-white font-bold">{pendingMutationCount}</span>
                <span className="text-neutral-300">{t.lvl3PendingCount}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                <span className="text-neutral-400">{t.lvl3Synced}</span>
              </>
            )}
          </div>

          {/* Nombre de conflits détectés (Alerte JAUNE #FACC15) */}
          {conflictCount > 0 && (
            <>
              <div className="h-3.5 w-px bg-neutral-800" />
              <div 
                onClick={onOpenConflicts}
                className="flex items-center gap-1.5 bg-neutral-900 border border-yellow-500/60 text-[#FACC15] px-2 py-0.5 rounded cursor-pointer hover:bg-neutral-800 transition-colors"
                title="Cliquer pour ouvrir le cockpit d'arbitrage des conflits"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-[#FACC15] animate-pulse" />
                <span className="font-bold font-mono">{conflictCount}</span>
                <span className="font-medium text-[11px]">{t.lvl3ConflictAlert}</span>
              </div>
            </>
          )}
        </div>

        {/* Actions Contextuelles */}
        <div className="flex items-center gap-2">
          {/* Action : Résoudre les conflits (Jaune #FACC15 si conflits) */}
          {conflictCount > 0 && onOpenConflicts && (
            <button
              onClick={onOpenConflicts}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-[#FACC15] text-black hover:bg-yellow-400 transition-colors shadow-sm"
              title={t.lvl3ResolveConflicts}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-black" />
              <span>{t.lvl3ResolveConflicts}</span>
            </button>
          )}

          {/* Action : Synchroniser maintenant (Vert #16A34A) */}
          {pendingMutationCount > 0 && onFlushQueue && (
            <button
              onClick={onFlushQueue}
              disabled={isFlushing || !isOnline}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors shadow-sm ${
                isOnline 
                  ? 'bg-[#16A34A] hover:bg-[#15803D] text-white' 
                  : 'bg-neutral-800 border border-neutral-700 text-neutral-400 opacity-60 cursor-not-allowed'
              }`}
              title={isOnline ? t.lvl3SyncNow : t.lvl3ResumeSync}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-white ${isFlushing ? 'animate-spin' : ''}`} />
              <span>{isFlushing ? '...' : (isOnline ? t.lvl3SyncNow : t.lvl3ResumeSync)}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
