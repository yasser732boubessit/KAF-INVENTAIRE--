/**
 * KAF-INVENTAIRE - Security & Password Hashing Service
 * Uses Web Crypto API (SHA-256 with salt) for zero external dependencies
 * Works identically in both Electron Main/Renderer and Browser environments.
 */

import { AppUser, UserRole } from './permissions';

export class CryptoSecurity {
  /**
   * Hashes a password using PBKDF2-like SHA-256 with a salt.
   */
  public static async hashPassword(password: string, salt: string = 'KAF_SALT_2026_ENTERPRISE'): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verifies if a password matches the stored hash
   */
  public static async verifyPassword(password: string, hash: string, salt: string = 'KAF_SALT_2026_ENTERPRISE'): Promise<boolean> {
    const computed = await this.hashPassword(password, salt);
    return computed === hash;
  }
}

/**
 * Seed users conforming to the 3 mandatory operational roles
 */
export const INITIAL_USERS: AppUser[] = [
  {
    id: 'USR-ADMIN-01',
    username: 'admin.patrimoine',
    fullName: 'Yacine Benali (Responsable Patrimoine)',
    email: 'y.benali@kotama-agrifood.dz',
    role: 'RESPONSABLE_PATRIMOINE',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
    lastLoginAt: '2026-10-12 08:30:00',
    createdAt: '2026-01-01 08:00:00',
    updatedAt: '2026-10-12 08:30:00',
    // Hash for 'admin123'
    passwordHash: 'e6c279f6271ed4936e3b315f4b869f329316a49d5ecd25275ea473634099e097'
  },
  {
    id: 'USR-AGENT-02',
    username: 'agent.identification',
    fullName: 'Mohamed Brahimi (Agent Identification)',
    email: 'm.brahimi@kotama-agrifood.dz',
    role: 'AGENT_INVENTAIRE',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80',
    lastLoginAt: '2026-10-12 07:45:00',
    createdAt: '2026-01-15 08:00:00',
    updatedAt: '2026-10-12 07:45:00',
    // Hash for 'agent123'
    passwordHash: '35d72ef7daae93d567ad00cb016788556f8f553efef24f8d95fe76a742cb5294'
  },
  {
    id: 'USR-CTRL-03',
    username: 'controleur.chargement',
    fullName: 'Amine Khelifi (Agent Contrôle / Chargement)',
    email: 'a.khelifi@kotama-agrifood.dz',
    role: 'CONTROLEUR_ZONE',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    lastLoginAt: '2026-10-12 08:15:00',
    createdAt: '2026-02-01 08:00:00',
    updatedAt: '2026-10-12 08:15:00',
    // Hash for 'ctrl123'
    passwordHash: '8b6d8591ef1fc5773199c0d3557e5e3e2a77a45fc9e779a51980ee90efecbcf0'
  }
];
