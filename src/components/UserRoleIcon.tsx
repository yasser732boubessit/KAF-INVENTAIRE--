import React from 'react';
import { 
  ShieldCheck, 
  ClipboardList, 
  Package, 
  ScanLine, 
  Calculator, 
  UserRound 
} from 'lucide-react';
import { UserRole, Language } from '../types';

export type ExtendedRoleType = 
  | UserRole
  | 'ADMIN'
  | 'ADMINISTRATOR'
  | 'RESPONSABLE_PATRIMOINE'
  | 'INVENTORY_MANAGER'
  | 'GESTIONNAIRE'
  | 'INVENTORY_OPERATOR'
  | 'AGENT_INVENTAIRE'
  | 'SCANNER_OPERATOR'
  | 'CONTROLEUR_ZONE'
  | 'ACCOUNTANT'
  | 'COMPTABLE'
  | 'USER'
  | string;

export interface UserRoleIconProps {
  role?: ExtendedRoleType | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'icon-only' | 'avatar' | 'badge';
  className?: string;
  iconClassName?: string;
  showLabel?: boolean;
  lang?: Language;
}

/**
 * Returns role-specific icon matching operational roles:
 * - Administrator -> ShieldCheck
 * - Inventory manager -> ClipboardList
 * - Inventory operator -> Package
 * - Scanner operator -> ScanLine
 * - Accountant -> Calculator
 * - General user -> UserRound
 */
export function getRoleIconComponent(role?: string | null): React.ComponentType<{ className?: string }> {
  if (!role) return UserRound;
  const normalized = role.toUpperCase().trim();

  // 1. Administrator
  if (
    normalized === 'RESPONSABLE_PATRIMOINE' || 
    normalized.includes('ADMIN') ||
    normalized.includes('DIRECTEUR')
  ) {
    return ShieldCheck;
  }

  // 2. Inventory manager
  if (
    normalized.includes('GESTIONNAIRE') || 
    normalized.includes('INVENTORY_MANAGER') ||
    normalized.includes('MANAGER')
  ) {
    return ClipboardList;
  }

  // 3. Inventory operator (Agent d'ajout / identification)
  if (
    normalized === 'AGENT_INVENTAIRE' || 
    normalized.includes('AJOUT') ||
    normalized.includes('IDENTIFICATION') ||
    normalized.includes('OPERATOR') ||
    normalized.includes('MAGASINIER')
  ) {
    return Package;
  }

  // 4. Scanner operator / Vérification / Chargement
  if (
    normalized === 'CONTROLEUR_ZONE' || 
    normalized.includes('SCANNER') ||
    normalized.includes('VERIFICATION') ||
    normalized.includes('CONTROLEUR') ||
    normalized.includes('CHARGEMENT')
  ) {
    return ScanLine;
  }

  // 5. Accountant
  if (
    normalized.includes('COMPTABLE') || 
    normalized.includes('FINANCE') ||
    normalized.includes('ACCOUNTANT')
  ) {
    return Calculator;
  }

  // 6. Default / General user
  return UserRound;
}

export function getRoleVisualTheme(role?: string | null) {
  if (!role) {
    return {
      bg: 'bg-slate-100',
      border: 'border-slate-300',
      text: 'text-slate-600',
      badgeBg: 'bg-slate-50 text-slate-700 border-slate-200',
      labelFr: 'Utilisateur',
      labelAr: 'مستخدم عام',
      labelEn: 'User'
    };
  }

  const normalized = role.toUpperCase().trim();

  if (normalized === 'RESPONSABLE_PATRIMOINE' || normalized.includes('ADMIN')) {
    return {
      bg: 'bg-purple-100 dark:bg-purple-950/70',
      border: 'border-purple-300 dark:border-purple-700',
      text: 'text-purple-700 dark:text-purple-300',
      badgeBg: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800',
      labelFr: 'Administrateur',
      labelAr: 'المسؤول العام',
      labelEn: 'Administrator'
    };
  }

  if (normalized.includes('GESTIONNAIRE') || normalized.includes('INVENTORY_MANAGER')) {
    return {
      bg: 'bg-amber-100 dark:bg-amber-950/70',
      border: 'border-amber-300 dark:border-amber-700',
      text: 'text-amber-700 dark:text-amber-300',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
      labelFr: 'Gestionnaire d\'Inventaire',
      labelAr: 'مدير المخزون',
      labelEn: 'Inventory Manager'
    };
  }

  if (
    normalized === 'AGENT_INVENTAIRE' || 
    normalized.includes('AJOUT') || 
    normalized.includes('IDENTIFICATION')
  ) {
    return {
      bg: 'bg-blue-100 dark:bg-blue-950/70',
      border: 'border-blue-300 dark:border-blue-700',
      text: 'text-blue-700 dark:text-blue-300',
      badgeBg: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
      labelFr: 'Agent d\'Ajout',
      labelAr: 'وكيل الإضافة والتعريف',
      labelEn: 'Inventory Operator'
    };
  }

  if (
    normalized === 'CONTROLEUR_ZONE' || 
    normalized.includes('SCANNER') || 
    normalized.includes('VERIFICATION')
  ) {
    return {
      bg: 'bg-emerald-100 dark:bg-emerald-950/70',
      border: 'border-emerald-300 dark:border-emerald-700',
      text: 'text-emerald-700 dark:text-emerald-300',
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
      labelFr: 'Agent Vérification',
      labelAr: 'وكيل التحقق والشحن',
      labelEn: 'Scanner Operator'
    };
  }

  if (normalized.includes('COMPTABLE') || normalized.includes('ACCOUNTANT')) {
    return {
      bg: 'bg-teal-100 dark:bg-teal-950/70',
      border: 'border-teal-300 dark:border-teal-700',
      text: 'text-teal-700 dark:text-teal-300',
      badgeBg: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800',
      labelFr: 'Comptable',
      labelAr: 'المحاسب',
      labelEn: 'Accountant'
    };
  }

  return {
    bg: 'bg-slate-100 dark:bg-slate-800',
    border: 'border-slate-300 dark:border-slate-700',
    text: 'text-slate-600 dark:text-slate-300',
    badgeBg: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    labelFr: 'Utilisateur',
    labelAr: 'مستخدم عام',
    labelEn: 'General User'
  };
}

export const UserRoleIcon: React.FC<UserRoleIconProps> = ({
  role,
  size = 'md',
  variant = 'avatar',
  className = '',
  iconClassName = '',
  showLabel = false,
  lang = 'fr'
}) => {
  const IconComponent = getRoleIconComponent(role);
  const theme = getRoleVisualTheme(role);

  const sizeDimensions = {
    xs: { box: 'w-6 h-6', icon: 'w-3 h-3' },
    sm: { box: 'w-8 h-8', icon: 'w-4 h-4' },
    md: { box: 'w-10 h-10', icon: 'w-5 h-5' },
    lg: { box: 'w-12 h-12', icon: 'w-6 h-6' },
    xl: { box: 'w-16 h-16', icon: 'w-8 h-8' }
  }[size];

  if (variant === 'icon-only') {
    return (
      <IconComponent 
        className={`${sizeDimensions.icon} ${theme.text} ${iconClassName}`} 
      />
    );
  }

  if (variant === 'badge') {
    const label = lang === 'ar' ? theme.labelAr : lang === 'en' ? theme.labelEn : theme.labelFr;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border ${theme.badgeBg} ${className}`}>
        <IconComponent className={`${sizeDimensions.icon} shrink-0 ${iconClassName}`} />
        {showLabel && <span>{label}</span>}
      </span>
    );
  }

  // Variant === 'avatar' (Replaces profile photos with professional icons)
  return (
    <div 
      className={`rounded-full flex items-center justify-center shrink-0 border transition-all ${sizeDimensions.box} ${theme.bg} ${theme.border} ${theme.text} ${className}`}
      title={lang === 'ar' ? theme.labelAr : theme.labelFr}
      aria-label={lang === 'ar' ? theme.labelAr : theme.labelFr}
    >
      <IconComponent className={`${sizeDimensions.icon} ${iconClassName}`} />
    </div>
  );
};
