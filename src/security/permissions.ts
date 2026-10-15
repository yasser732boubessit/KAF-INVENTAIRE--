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

  // RÔLE 2 — AGENT D'AJOUT / IDENTIFICATION (AGENT_INVENTAIRE)
  AGENT_INVENTAIRE: [
    'assets.view',
    'assets.create',
    'assets.update', // Only for draft/unverified items
    'assets.identify',
    'assets.print_tag',
    'discoveries.view',
    'discoveries.create',
    'zones.view',
    'campaigns.view',
    'sync.view',
    'sync.execute',
    'loading.view',
    'loading.execute',
    'verification.view',
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
 * Check if a role possesses a specific permission
 */
export function hasPermission(role: UserRole, permission: AppPermission): boolean {
  const allowed = ROLE_PERMISSIONS[role] || [];
  return allowed.includes(permission);
}

/**
 * Check multiple permissions (all required)
 */
export function hasAllPermissions(role: UserRole, permissions: AppPermission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

/**
 * Check multiple permissions (at least one required)
 */
export function hasAnyPermission(role: UserRole, permissions: AppPermission[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

/**
 * Role Metadata & French/Arabic labels
 */
export const ROLE_METADATA: Record<UserRole, {
  labelFr: string;
  labelAr: string;
  descriptionFr: string;
  badgeColor: string;
  iconName: string;
}> = {
  RESPONSABLE_PATRIMOINE: {
    labelFr: "Administrateur / Responsable du Patrimoine",
    labelAr: "المسؤول العام / مدير الأصول والأملاك",
    descriptionFr: "Accès total : Gouvernance, gestion utilisateurs, clôture campagnes, validation arbitrages et sauvegardes.",
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
  CONTROLEUR_ZONE: {
    labelFr: "Agent de Vérification / Chargement",
    labelAr: "وكيل المراقبة والتحقق والشحن",
    descriptionFr: "Contrôle physique in situ, relevé des écarts d'emplacement, signalement des anomalies et vérification des chargements.",
    badgeColor: "bg-sky-100 text-sky-900 border-sky-300",
    iconName: "ClipboardCheck"
  }
};
