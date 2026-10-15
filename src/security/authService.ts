/**
 * KAF-INVENTAIRE - Authentication & Session Service
 * Manages active user session, token, and persistent login state.
 * Offline-first compliant: supports online central authentication with local SQLite/IndexedDB offline fallback.
 */

import { AppUser, UserRole, UserSession, AppPermission, ROLE_PERMISSIONS, hasPermission } from './permissions';
import { CryptoSecurity, INITIAL_USERS } from './crypto';
import { dbService } from '../services/databaseService';

const SESSION_KEY = 'kaf_auth_session_v5';

export class AuthService {
  private currentSession: UserSession | null = null;
  private listeners: Array<(session: UserSession | null) => void> = [];

  constructor() {
    this.restoreSession();
  }

  /**
   * Restore existing session from storage if valid
   * Strictly verifies session without any default administrator bypass.
   */
  private restoreSession(): void {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const session: UserSession = JSON.parse(saved);
        if (session && session.user && session.user.isActive) {
          // Check 24h session expiration
          const authTime = new Date(session.authenticatedAt).getTime();
          const now = Date.now();
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours

          if (now - authTime < maxAge) {
            // Re-calculate permissions dynamically to avoid client-side tampering
            session.permissions = ROLE_PERMISSIONS[session.user.role] || [];
            this.currentSession = session;
          } else {
            console.log('[Auth] Session expirée. Reconnexion requise.');
            localStorage.removeItem(SESSION_KEY);
            this.currentSession = null;
          }
        } else {
          localStorage.removeItem(SESSION_KEY);
          this.currentSession = null;
        }
      } else {
        // No auto-login! User must explicitly log in.
        this.currentSession = null;
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
    return this.currentSession?.user.role || 'AGENT_INVENTAIRE';
  }

  public isAuthenticated(): boolean {
    return !!this.currentSession && !!this.currentSession.user;
  }

  public isOfflineSession(): boolean {
    return !!this.currentSession?.isOffline;
  }

  public can(permission: AppPermission): boolean {
    if (!this.currentSession || !this.currentSession.user.isActive) {
      return false;
    }
    return hasPermission(this.currentSession.user.role, permission);
  }

  /**
   * Authenticate user with username and password
   * Flow:
   * 1. Try central API online authentication (POST /api/auth/login)
   * 2. If online fails due to network/offline, fallback to local SQLite/IndexedDB credentials
   */
  public async login(
    username: string, 
    passwordPlain: string
  ): Promise<{ success: boolean; user?: AppUser; isOffline?: boolean; error?: string }> {
    const cleanUser = username.trim();
    if (!cleanUser || !passwordPlain) {
      return { success: false, error: 'Veuillez saisir votre identifiant et votre mot de passe.' };
    }

    // --- Tentative 1 : Authentification Centrale en Ligne ---
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username: cleanUser, password: passwordPlain })
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data?.access_token) {
        // Authentifié avec succès auprès du serveur central
        const apiUser: AppUser = {
          id: data.user.id,
          username: data.user.username,
          fullName: data.user.fullName,
          email: data.user.email || `${cleanUser}@kotama-agrifood.dz`,
          role: data.user.role as UserRole,
          isActive: data.user.isActive !== false,
          lastLoginAt: new Date().toISOString(),
          createdAt: data.user.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // Store hash locally for offline continuity
          passwordHash: await CryptoSecurity.hashPassword(passwordPlain)
        };

        // Cache user in local database for offline fallback
        try {
          await dbService.createUser(apiUser);
        } catch {}

        const session: UserSession = {
          user: apiUser,
          token: data.access_token,
          authenticatedAt: new Date().toISOString(),
          permissions: ROLE_PERMISSIONS[apiUser.role] || [],
          isOffline: false
        };

        this.currentSession = session;
        this.persistSession(session);

        return { success: true, user: apiUser, isOffline: false };
      } else if (response.status === 401 || response.status === 403) {
        // Le serveur a rejeté explicitement les identifiants (mot de passe faux ou compte inactif)
        return { 
          success: false, 
          error: data?.message || 'Identifiant ou mot de passe incorrect.' 
        };
      }
    } catch (networkErr) {
      console.warn('[Auth] Serveur central injoignable, bascule sur l\'authentification locale offline:', networkErr);
    }

    // --- Tentative 2 : Authentification Locale Hors-Ligne (Offline Local) ---
    try {
      const localUsers = await dbService.getUsers();
      const localUser = localUsers.find(u => 
        u.username.toLowerCase() === cleanUser.toLowerCase() || 
        (u.email && u.email.toLowerCase() === cleanUser.toLowerCase())
      );

      if (!localUser) {
        return { 
          success: false, 
          error: 'Identifiant ou mot de passe incorrect (ou serveur central inaccessible).' 
        };
      }

      if (!localUser.isActive) {
        return { 
          success: false, 
          error: 'Ce compte utilisateur a été désactivé par l\'administrateur.' 
        };
      }

      const isPasswordValid = await CryptoSecurity.verifyPassword(passwordPlain, localUser.passwordHash || '');
      if (!isPasswordValid) {
        return { 
          success: false, 
          error: 'Identifiant ou mot de passe incorrect.' 
        };
      }

      // Offline login success!
      const now = new Date().toISOString();
      await dbService.updateUser(localUser.id, { lastLoginAt: now });
      localUser.lastLoginAt = now;

      const offlineSession: UserSession = {
        user: localUser,
        token: `OFFLINE-TOKEN-${localUser.id}-${Date.now()}`,
        authenticatedAt: now,
        permissions: ROLE_PERMISSIONS[localUser.role] || [],
        isOffline: true
      };

      this.currentSession = offlineSession;
      this.persistSession(offlineSession);

      return { success: true, user: localUser, isOffline: true };
    } catch (localErr: any) {
      return { 
        success: false, 
        error: localErr.message || 'Erreur lors de l\'authentification hors-ligne.' 
      };
    }
  }

  /**
   * Log out active user and clear session
   */
  public async logout(): Promise<void> {
    const token = this.currentSession?.token;
    if (token && !this.currentSession?.isOffline) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch {}
    }

    this.currentSession = null;
    this.persistSession(null);
  }

  /**
   * Change password for the current user
   */
  public async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (!this.currentSession) {
      return { success: false, error: 'Aucun utilisateur connecté.' };
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Le nouveau mot de passe doit comporter au moins 6 caractères.' };
    }

    // If online, call central API
    if (!this.currentSession.isOffline && this.currentSession.token) {
      try {
        const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.currentSession.token}`
          },
          body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await res.json();
        if (!res.ok) {
          return { success: false, error: data.message || 'Erreur lors du changement de mot de passe.' };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Serveur inaccessible.' };
      }
    }

    // Update local hash as well
    const newHash = await CryptoSecurity.hashPassword(newPassword);
    await dbService.resetUserPassword(this.currentSession.user.id, newHash);
    this.currentSession.user.passwordHash = newHash;
    this.persistSession(this.currentSession);

    return { success: true };
  }

  /**
   * Switch active user session (Admin testing/impersonation)
   */
  public async switchActiveUser(userId: string): Promise<boolean> {
    try {
      const users = await dbService.getUsers();
      const targetUser = users.find(u => u.id === userId);
      if (!targetUser || !targetUser.isActive) return false;

      const newSession: UserSession = {
        user: targetUser,
        token: `SWITCH-${targetUser.id}-${Date.now()}`,
        authenticatedAt: new Date().toISOString(),
        permissions: ROLE_PERMISSIONS[targetUser.role] || [],
        isOffline: this.currentSession?.isOffline ?? false
      };

      this.currentSession = newSession;
      this.persistSession(newSession);
      return true;
    } catch {
      return false;
    }
  }
}

export const authService = new AuthService();
