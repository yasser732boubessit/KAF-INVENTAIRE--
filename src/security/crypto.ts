/**
 * KAF-INVENTAIRE - Security & Password Hashing Service
 * 
 * ✅ Supports 3 hash types :
 *   1. bcrypt (compatible NestJS backend)
 *   2. SHA-256 with salt (legacy)
 *   3. Plaintext (fallback for demo accounts)
 * 
 * ✅ Works in Browser, Electron Renderer, and Node.js
 */

import { AppUser, UserRole } from './permissions';

const KAF_SALT = 'KAF_SALT_2026_ENTERPRISE';

export class CryptoSecurity {
  /**
   * Get Web Crypto API safely across all environments
   */
  private static getCryptoAPI(): Crypto {
    const g: any = globalThis;
    if (g.crypto && g.crypto.subtle) return g.crypto;
    if (g.msCrypto && g.msCrypto.subtle) return g.msCrypto;
    throw new Error('Web Crypto API indisponible');
  }

  /**
   * Detects if a string looks like a bcrypt hash
   * bcrypt hashes start with $2a$, $2b$, $2y$, or $2x$
   */
  private static isBcryptHash(str: string): boolean {
    return /^\$2[abyx]\$\d{2}\$/.test(str);
  }

  /**
   * Detects if a string looks like a SHA-256 hex hash (64 chars, hex)
   */
  private static isSha256Hash(str: string): boolean {
    return /^[a-f0-9]{64}$/i.test(str);
  }

  /**
   * Hash a password using SHA-256 + salt (local storage format)
   */
  public static async hashPassword(
    password: string,
    salt: string = KAF_SALT
  ): Promise<string> {
    if (!password || typeof password !== 'string') {
      throw new Error('hashPassword: password invalide');
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const cryptoAPI = this.getCryptoAPI();
    const hashBuffer = await cryptoAPI.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verify a password against ANY of these formats:
   *   - bcrypt hash    (backend format)
   *   - SHA-256 hash   (frontend format)
   *   - plaintext      (demo accounts)
   * 
   * @param password  The password to verify
   * @param stored    The stored credential (bcrypt hash, SHA-256 hash, or plaintext)
   * @param salt      Salt for SHA-256 (default: KAF_SALT_2026_ENTERPRISE)
   */
  public static async verifyPassword(
    password: string,
    stored: string,
    salt: string = KAF_SALT
  ): Promise<boolean> {
    if (!password || !stored) {
      console.warn('[Crypto] verifyPassword: missing params');
      return false;
    }

    const p = password.trim();
    const s = stored.trim();

    // ═══════════════════════════════════════════════════════════
    // CASE 1 — bcrypt hash ($2a$, $2b$, $2y$, $2x$)
    // ═══════════════════════════════════════════════════════════
    if (this.isBcryptHash(s)) {
      try {
        // Dynamic import for bcryptjs (works in browser + Electron)
        const bcrypt = await import('bcryptjs');
        const match = await bcrypt.compare(p, s);
        console.log('[Crypto] bcrypt verification:', match ? '✅' : '❌');
        return match;
      } catch (err) {
        console.error('[Crypto] bcrypt compare error:', err);
        return false;
      }
    }

    // ═══════════════════════════════════════════════════════════
    // CASE 2 — SHA-256 hash (64 hex chars)
    // ═══════════════════════════════════════════════════════════
    if (this.isSha256Hash(s)) {
      try {
        const computed = await this.hashPassword(p, salt);
        const match = computed.toLowerCase() === s.toLowerCase();
        console.log('[Crypto] SHA-256 verification:', match ? '✅' : '❌');
        return match;
      } catch (err) {
        console.error('[Crypto] SHA-256 compare error:', err);
        return false;
      }
    }

    // ═══════════════════════════════════════════════════════════
    // CASE 3 — Plaintext (demo accounts)
    // ═══════════════════════════════════════════════════════════
    const match = p === s;
    console.log('[Crypto] plaintext verification:', match ? '✅' : '❌');
    return match;
  }

  /**
   * Hash a password using bcrypt (for creating new accounts)
   * Uses bcryptjs which works in browser + Electron
   */
  public static async hashPasswordBcrypt(password: string, rounds = 10): Promise<string> {
    const bcrypt = await import('bcryptjs');
    return bcrypt.hash(password, rounds);
  }
}

/**
 * Seed users for OFFLINE MODE
 * These are used when SQLite is empty AND server is unreachable
 * 
 * ⚠️ IMPORTANT: These passwords are plaintext for demo.
 * In production, replace with real hashes from the server.
 */
export const INITIAL_USERS: AppUser[] = [
  {
    id: 'USR-ADMIN-01',
    username: 'admin.patrimoine',
    fullName: 'Yacine Benali (Responsable Patrimoine)',
    email: 'y.benali@kotama-agrifood.dz',
    role: 'RESPONSABLE_PATRIMOINE',
    isActive: true,
    lastLoginAt: '2026-10-12 08:30:00',
    createdAt: '2026-01-01 08:00:00',
    updatedAt: '2026-10-12 08:30:00',
    passwordHash: 'admin123'
  },
  {
    id: 'USR-AGENT-02',
    username: 'agent.identification',
    fullName: 'Mohamed Brahimi (Agent Identification)',
    email: 'm.brahimi@kotama-agrifood.dz',
    role: 'AGENT_INVENTAIRE',
    isActive: true,
    lastLoginAt: '2026-10-12 07:45:00',
    createdAt: '2026-01-15 08:00:00',
    updatedAt: '2026-10-12 07:45:00',
    passwordHash: 'agent123'
  },
  {
    id: 'USR-CTRL-03',
    username: 'controleur.chargement',
    fullName: 'Amine Khelifi (Agent Contrôle / Chargement)',
    email: 'a.khelifi@kotama-agrifood.dz',
    role: 'CONTROLEUR_ZONE',
    isActive: true,
    lastLoginAt: '2026-10-12 08:15:00',
    createdAt: '2026-02-01 08:00:00',
    updatedAt: '2026-10-12 08:15:00',
    passwordHash: 'ctrl123'
  }
];