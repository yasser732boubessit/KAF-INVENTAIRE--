import React, { useState, useEffect } from 'react';

export type LogoVariant = 'badge' | 'horizontal' | 'full' | 'print' | 'icon-only';
export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface KafLogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
  showSubtitle?: boolean;
  subtitleText?: string;
  onClick?: () => void;
}

export const KafLogo: React.FC<KafLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  className = '',
  showSubtitle = true,
  subtitleText,
  onClick
}) => {
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadCustomLogo = () => {
      try {
        const saved = localStorage.getItem('kaf_custom_logo');
        if (saved) {
          setCustomLogoUrl(saved);
        } else {
          setCustomLogoUrl(null);
        }
      } catch {
        setCustomLogoUrl(null);
      }
    };

    loadCustomLogo();

    const handleLogoChange = () => {
      loadCustomLogo();
    };

    window.addEventListener('kaf_logo_changed', handleLogoChange);
    return () => {
      window.removeEventListener('kaf_logo_changed', handleLogoChange);
    };
  }, []);

  // Size mappings
  const badgeDimensions: Record<LogoSize, { box: string; leafScale: string; text: string }> = {
    xs: { box: 'w-6 h-6', leafScale: 'scale-[0.55]', text: 'text-[9px]' },
    sm: { box: 'w-7 h-7', leafScale: 'scale-[0.65]', text: 'text-[10px]' },
    md: { box: 'w-8 h-8', leafScale: 'scale-[0.75]', text: 'text-[11px]' },
    lg: { box: 'w-10 h-10', leafScale: 'scale-[0.9]', text: 'text-xs' },
    xl: { box: 'w-14 h-14', leafScale: 'scale-110', text: 'text-sm' },
  };

  const currentBadgeDim = badgeDimensions[size] || badgeDimensions.md;

  // If user uploaded a custom logo and it's set:
  if (customLogoUrl) {
    return (
      <div 
        onClick={onClick}
        className={`flex items-center gap-2.5 ${onClick ? 'cursor-pointer' : ''} ${className}`}
        title="KAF | KOTAMA AGRI-FOOD"
      >
        <img 
          src={customLogoUrl} 
          alt="Logo KAF" 
          className={`object-contain rounded ${
            size === 'xs' ? 'h-6 max-w-[80px]' :
            size === 'sm' ? 'h-7 max-w-[100px]' :
            size === 'md' ? 'h-8 max-w-[120px]' :
            size === 'lg' ? 'h-11 max-w-[160px]' : 'h-16 max-w-[220px]'
          }`} 
        />
        {variant !== 'badge' && variant !== 'icon-only' && (
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 font-bold tracking-wider text-white text-sm leading-tight">
              <span>KAF-INVENTAIRE</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] inline-block" title="Système opérationnel" />
            </div>
            {showSubtitle && (
              <span className="text-[10px] text-neutral-400 font-mono tracking-tight">
                {subtitleText || 'KOTAMA AGRI-FOOD'}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Official Kotama Agri-Food SVG Emblem
  const renderEmblem = (isPrint: boolean = false) => (
    <div 
      className={`${currentBadgeDim.box} rounded-lg flex flex-col items-center justify-center relative overflow-hidden transition-all shrink-0 ${
        isPrint 
          ? 'bg-slate-900 border border-slate-700 shadow-sm text-white' 
          : 'bg-gradient-to-b from-[#131B2E] to-[#0A0E17] border border-neutral-700/80 hover:border-[#16A34A] shadow-md'
      }`}
    >
      {/* Dual Agro Sprout Leaves */}
      <svg 
        viewBox="0 0 32 18" 
        className={`w-4 h-2.5 mb-0.5 ${currentBadgeDim.leafScale} drop-shadow-sm`}
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Left Leaf */}
        <path d="M16 16C12 14 9 9 12 3C16 2 17 6 16 16Z" fill="#22C55E" />
        {/* Right Leaf */}
        <path d="M16 16C20 13 23 8 20 2C16 2 15 7 16 16Z" fill="#15803D" />
        {/* Golden seed center */}
        <circle cx="16" cy="15" r="1.5" fill="#F59E0B" />
      </svg>
      {/* KAF bold lettering */}
      <span className={`font-black tracking-tight leading-none text-white ${currentBadgeDim.text}`}>
        KAF
      </span>
    </div>
  );

  // Variant: Icon / Badge Only
  if (variant === 'badge' || variant === 'icon-only') {
    return (
      <div 
        onClick={onClick}
        className={`inline-flex items-center ${onClick ? 'cursor-pointer' : ''} ${className}`}
        title="KAF | Kotama Agri-Food"
      >
        {renderEmblem()}
      </div>
    );
  }

  // Variant: Print (for PDF & PV de Réconciliation reports on white paper)
  if (variant === 'print') {
    return (
      <div 
        onClick={onClick}
        className={`flex items-center gap-3 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        {renderEmblem(true)}
        <div className="flex flex-col text-slate-900">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-black text-base tracking-wide text-slate-900">KOTAMA</span>
            <span className="font-black text-base tracking-wide text-emerald-600">AGRI-FOOD</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded ml-1">KAF</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium tracking-wider uppercase mt-1">
            Complexe Agro-Industriel • Jijel | كوتاما أغري فود
          </span>
        </div>
      </div>
    );
  }

  // Variant: Full (expanded with enterprise labels and badges)
  if (variant === 'full') {
    return (
      <div 
        onClick={onClick}
        className={`flex items-center gap-3 ${onClick ? 'cursor-pointer' : ''} ${className}`}
        title="KAF | Complexe Agro-Industriel Kotama Agri-Food"
      >
        {renderEmblem()}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base tracking-wider text-white">
              KOTAMA <span className="text-[#22C55E]">AGRI-FOOD</span>
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#16A34A]/20 text-[#86EFAC] border border-[#16A34A]/40">
              KAF
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-400">
            <span>المركب الصناعي كوتاما أغري فود</span>
            <span className="text-neutral-600">•</span>
            <span className="font-mono text-[10px] text-neutral-400">AUDIT & INVENTAIRE</span>
          </div>
        </div>
      </div>
    );
  }

  // Default Variant: Horizontal
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-2.5 ${onClick ? 'cursor-pointer' : ''} group ${className}`}
      title="KAF-INVENTAIRE | Kotama Agri-Food"
    >
      {renderEmblem()}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 font-bold tracking-wider text-white text-sm leading-tight">
          <span>KAF-INVENTAIRE</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] inline-block shadow-[0_0_8px_#16A34A]" title="Système opérationnel" />
        </div>
        {showSubtitle && (
          <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-mono tracking-tight leading-none mt-0.5">
            <span className="text-[#22C55E] font-semibold">KOTAMA</span>
            <span>AGRI-FOOD</span>
            <span className="hidden sm:inline text-neutral-600">|</span>
            <span className="hidden sm:inline text-neutral-400">JIJEL</span>
          </div>
        )}
      </div>
    </div>
  );
};
