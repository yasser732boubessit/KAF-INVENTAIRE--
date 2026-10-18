/**
 * KAF-INVENTAIRE - Granular Permissions and Role Definitions
 * Aligned with the 3 operational profiles:
 * - ADMIN: RESPONSABLE_PATRIMOINE (Full access, user mgmt, settings, campaign lock, backup/restore)
 * - AGENT_AJOUT: AGENT_INVENTAIRE (Asset creation, identification, tagging, discovery entry)
 * - AGENT_VERIFICATION: CONTROLEUR_ZONE (Physical checks, inspections, loading, status updates, match verification)
 */

export type AppPermission =
  // User & Role Management
  | 'users.view'
  | 'users.create'
  | 'users.update'
  | 'users.disable'
  | 'roles.manage'
  // Assets & Identification
  | 'assets.view'
  | 'assets.create'
  | 'assets.update'
  | 'assets.delete'
  | 'assets.identify'
  | 'assets.print_tag'
  // Verification & Physical Controls
  | 'verification.view'
  | 'verification.create'
  | 'verification.override'
  // Loading & Operations
  | 'loading.view'
  | 'loading.execute'
  // Campaigns & Zones
  | 'campaigns.view'
  | 'campaigns.manage'
  | 'campaigns.close_zone'
  | 'campaigns.lock'
  | 'zones.view'
  | 'zones.manage'
  // Discoveries & Unregistered Assets
  | 'discoveries.view'
  | 'discoveries.create'
  | 'discoveries.match'
  | 'discoveries.integrate'
  | 'discoveries.reject'
  // Conflicts & Sync
  | 'conflicts.view'
  | 'conflicts.resolve'
  | 'sync.view'
  | 'sync.execute'
  // Audit & Reports
  | 'audit.view'
  | 'reports.view'
  | 'reports.export'
  // Maintenance & System
  | 'backup.create'
  | 'backup.restore'
  | 'settings.manage';

export type UserRole = 
  | 'RESPONSABLE_PATRIMOINE' // Rôle 1: Administrateur
  | 'AGENT_INVENTAIRE'       // Rôle 2: Agent d'ajout / Identification
  | 'CONTROLEUR_ZONE';       // Rôle 3: Agent de vérification / Chargement

export interface AppUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl?: string;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  passwordHash?: string; // Stored securely, never exposed in client sessions
}

export interface UserSession {
  user: AppUser;
  token: string;
  authenticatedAt: string;
  permissions: AppPermission[];
  isOffline?: boolean;
}

/**
 * Strict Role-to-Permissions Mapping
 * Enforces the Principle of Least Privilege across the three operational profiles.
 */
export const ROLE_PERMISSIONS: Record<UserRole, AppPermission[]> = {
  // RÔLE 1 — ADMINISTRATEUR (RESPONSABLE_PATRIMOINE)
  RESPONSABLE_PATRIMOINE: [
    'users.view',
    'users.create',
    'users.update',
    'users.disable',
    'roles.manage',
    'assets.view',
    'assets.create',
    'assets.update',
    'assets.delete',
    'assets.identify',
    'assets.print_tag',
    'verification.view',
    'verification.create',
    'verification.override',
    'loading.view',
    'loading.execute',
    'campaigns.view',
    'campaigns.manage',
    'campaigns.close_zone',
    'campaigns.lock',
    'zones.view',
    'zones.manage',
    'discoveries.view',
    'discoveries.create',
    'discoveries.match',
    'discoveries.integrate',
    'discoveries.reject',
    'conflicts.view',
    'conflicts.resolve',
    'sync.view',
    'sync.execute',
    'audit.view',
    'reports.view',
    'reports.export',
    'backup.create',
    'backup.restore',
    'settings.manage',
  ],

  // ═══════════════════════════════════════════════════════════
  // ✅ RÔLE 2 — AGENT D'AJOUT / IDENTIFICATION (AGENT_INVENTAIRE)
  // تم حذف: loading.view, loading.execute, verification.view, campaigns.view
  // ═══════════════════════════════════════════════════════════
  AGENT_INVENTAIRE: [
    'assets.view',
    'assets.create',
    'assets.update', // Only for draft/unverified items
    'assets.identify',
    'assets.print_tag',
    'discoveries.view',
    'discoveries.create',
    'zones.view', // ضرورية لاختيار مكان الأصل
    'sync.view',  // ضرورية للمزامنة
    'sync.execute',
  ],

  // RÔLE 3 — AGENT DE VÉRIFICATION / CHARGEMENT (CONTROLEUR_ZONE)
  CONTROLEUR_ZONE: [
    'assets.view',
    'verification.view',
    'verification.create',
    'verification.override',
    'loading.view',
    'loading.execute',
    'campaigns.view',
    'zones.view',
    'discoveries.view',
    'discoveries.create',
    'discoveries.match', // Can propose match
    'sync.view',
    'sync.execute',
    'conflicts.view',
    'reports.view',
  ],
};

/**
 * Normalize any role string to the canonical 3 operational roles
 */
export function normalizeRole(role?: string | null): UserRole {
  if (!role) return 'AGENT_INVENTAIRE';
  const r = String(role).toUpperCase().trim();
  if (r.includes('ADMIN') || r === 'RESPONSABLE_PATRIMOINE' || r.includes('DIRECTEUR')) {
    return 'RESPONSABLE_PATRIMOINE';
  }
  if (r.includes('VERIF') || r.includes('CTRL') || r === 'CONTROLEUR_ZONE' || r === 'TEAM_2' || r === 'TEAM_3' || r.includes('CHARGE') || r.includes('LOAD')) {
    return 'CONTROLEUR_ZONE';
  }
  return 'AGENT_INVENTAIRE';
}

/**
 * Check if a role possesses a specific permission
 */
export function hasPermission(role: UserRole | string, permission: AppPermission): boolean {
  const norm = normalizeRole(role);
  const allowed = ROLE_PERMISSIONS[norm] || [];
  return allowed.includes(permission);
}

/**
 * Check multiple permissions (all required)
 */
export function hasAllPermissions(role: UserRole | string, permissions: AppPermission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

/**
 * Check multiple permissions (at least one required)
 */
export function hasAnyPermission(role: UserRole | string, permissions: AppPermission[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

export interface RoleMeta {
  labelFr: string;
  labelAr: string;
  descriptionFr: string;
  badgeColor: string;
  iconName: string;
}

/**
 * Role Metadata & French/Arabic labels
 */
export const ROLE_METADATA: Record<string, RoleMeta> = {
  RESPONSABLE_PATRIMOINE: {
    labelFr: "Administrateur / Responsable du Patrimoine",
    labelAr: "المسؤول العام / مدير الأصول والأملاك",
    descriptionFr: "Accès total : Gouvernance, gestion utilisateurs, clôture campagnes, validation arbitrages et sauvegardes.",
    badgeColor: "bg-purple-100 text-purple-900 border-purple-300",
    iconName: "ShieldAlert"
  },
  ADMIN: {
    labelFr: "Administrateur Central",
    labelAr: "المسؤول المركزي",
    descriptionFr: "Super-administrateur : gestion des utilisateurs, des accès et gouvernance globale.",
    badgeColor: "bg-purple-100 text-purple-900 border-purple-300",
    iconName: "ShieldAlert"
  },
  AGENT_INVENTAIRE: {
    labelFr: "Agent d'Ajout / Identification",
    labelAr: "وكيل التسجيل والإضافة والتعريف",
    descriptionFr: "Accès limité à l'enregistrement initial, saisie des nouvelles immobilisations et impression des étiquettes.",
    badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-300",
    iconName: "PlusCircle"
  },
  TEAM_1: {
    labelFr: "Équipe 1 - Recensement & Desktop",
    labelAr: "الفريق 1 - التسجيل والإدخال الميداني",
    descriptionFr: "Enregistrement initial des actifs, création des fiches et impression des étiquettes.",
    badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-300",
    iconName: "PlusCircle"
  },
  CONTROLEUR_ZONE: {
    labelFr: "Agent de Vérification / Chargement",
    labelAr: "وكيل المراقبة والتحقق والشحن",
    descriptionFr: "Contrôle physique in situ, relevé des écarts d'emplacement, signalement des anomalies et vérification des chargements.",
    badgeColor: "bg-sky-100 text-sky-900 border-sky-300",
    iconName: "ClipboardCheck"
  },
  TEAM_2: {
    labelFr: "Équipe 2 - Contrôleur Zone / Vérification",
    labelAr: "الفريق 2 - التدقيق والمطابقة",
    descriptionFr: "Contrôle physique in situ, relevé des écarts et certification.",
    badgeColor: "bg-sky-100 text-sky-900 border-sky-300",
    iconName: "ClipboardCheck"
  },
  TEAM_3: {
    labelFr: "Équipe 3 - Chargement & Expédition",
    labelAr: "الفريق 3 - الشحن والتحميل",
    descriptionFr: "Opérations de quai, chargement et validation finale des expéditions.",
    badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
    iconName: "ClipboardCheck"
  }
};

/**
 * Safe accessor that NEVER returns undefined, preventing any badgeColor read errors
 */
export function getRoleMetadata(role?: string | null): RoleMeta {
  if (role && ROLE_METADATA[role]) {
    return ROLE_METADATA[role];
  }
  const normalized = normalizeRole(role);
  return ROLE_METADATA[normalized] || ROLE_METADATA.RESPONSABLE_PATRIMOINE;
}

/**
 * Safe permissions accessor that always returns a valid array
 */
export function getRolePermissions(role?: string | null): AppPermission[] {
  const norm = normalizeRole(role);
  return ROLE_PERMISSIONS[norm] || ROLE_PERMISSIONS.AGENT_INVENTAIRE;
}