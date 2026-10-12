/**
 * KAF-INVENTAIRE - Authentication & Session Service
 * Manages active user session, token, and persistent login state.
 * Offline-first compliant: caches session in localStorage/IndexedDB.
 */

import { AppUser, UserRole, UserSession, AppPermission, ROLE_PERMISSIONS, hasPermission } from './permissions';
import { CryptoSecurity, INITIAL_USERS } from './crypto';
import { dbService } from '../services/databaseService';

const SESSION_KEY = 'kaf_auth_session_v4';

export class AuthService {
  private currentSession: UserSession | null = null;
  private listeners: Array<(session: UserSession | null) => void> = [];

  constructor() {
    this.restoreSession();
  }

  /**
   * Restore existing session from storage if valid
   */
  private restoreSession(): void {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const session: UserSession = JSON.parse(saved);
        if (session && session.user && session.user.isActive) {
          // Re-calculate permissions dynamically to avoid tampering
          session.permissions = ROLE_PERMISSIONS[session.user.role] || [];
          this.currentSession = session;
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      } else {
        // Fallback default session: Admin on first load
        const defaultAdmin = INITIAL_USERS[0];
        this.currentSession = {
          user: defaultAdmin,
          token: `TOKEN-${Date.now()}-INITIAL`,
          authenticatedAt: new Date().toISOString(),
          permissions: ROLE_PERMISSIONS[defaultAdmin.role]
        };
        this.persistSession(this.currentSession);
      }
    } catch {
      this.currentSession = null;
    }
  }

  private persistSession(session: UserSession | null): void {
    try {
      if (session) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch {}
    this.notifyListeners();
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.currentSession);
    }
  }

  public subscribe(listener: (session: UserSession | null) => void): () => void {
    this.listeners.push(listener);
    listener(this.currentSession);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public getSession(): UserSession | null {
    return this.currentSession;
  }

  public getCurrentUser(): AppUser | null {
    return this.currentSession ? this.currentSession.user : null;
  }

  public getCurrentRole(): UserRole {
    return this.currentSession?.user.role || 'RESPONSABLE_PATRIMOINE';
  }

  public can(permission: AppPermission): boolean {
    if (!this.currentSession || !this.currentSession.user.isActive) {
      return false;
    }
    return hasPermission(this.currentSession.user.role, permission);
  }

  /**
   * Authenticate user with username and password
   */
  public async login(username: string, passwordPlain: string): Promise<{ success: boolean; error?: string }> {
    try {
      const users = await dbService.getUsers();
      const user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());

      if (!user) {
        return { success: false, error: 'Identifiant ou mot de passe incorrect.' };
      }

      if (!user.isActive) {
        return { success: false, error: 'Ce compte utilisateur a été désactivé par l\'administrateur.' };
      }

      const isValid = await CryptoSecurity.verifyPassword(passwordPlain, user.passwordHash || '');
      if (!isValid) {
        return { success: false, error: 'Identifiant ou mot de passe incorrect.' };
      }

      // Update lastLoginAt
      const now = new Date().toISOString();
      await dbService.updateUser(user.id, { lastLoginAt: now });
      user.lastLoginAt = now;

      const newSession: UserSession = {
        user,
        token: `AUTH-${user.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        authenticatedAt: now,
        permissions: ROLE_PERMISSIONS[user.role]
      };

      this.currentSession = newSession;
      this.persistSession(newSession);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erreur d\'authentification' };
    }
  }

  /**
   * Fast Switch / Impersonation for quick terminal login
   */
  public async switchActiveUser(userId: string): Promise<boolean> {
    try {
      const users = await dbService.getUsers();
      const user = users.find(u => u.id === userId);
      if (!user || !user.isActive) return false;

      const newSession: UserSession = {
        user,
        token: `AUTH-${user.id}-${Date.now()}`,
        authenticatedAt: new Date().toISOString(),
        permissions: ROLE_PERMISSIONS[user.role]
      };

      this.currentSession = newSession;
      this.persistSession(newSession);
      return true;
    } catch {
      return false;
    }
  }

  public logout(): void {
    this.currentSession = null;
    this.persistSession(null);
  }
}

export const authService = new AuthService();
