/**
 * KAF-INVENTAIRE - Authentication Service
 * 
 * ✅ Flow:
 *   1. Try online login via NestJS API (timeout 3s)
 *   2. If success → save user to local DB + session
 *   3. If network fails → fallback to local SQLite/IndexedDB
 *   4. Emits isOffline flag in session
 *
 * ✅ FIXED: Handles missing passwordHash in SQLite users
 *           Auto-repairs users by computing SHA-256 from known defaults
 *           Normalizes roles (TEAM_1 -> AGENT_INVENTAIRE, etc.)
 */

import {
  AppUser,
  UserRole,
  UserSession,
  AppPermission,
  ROLE_PERMISSIONS,
  hasPermission,
  normalizeRole // ✅ استيراد دالة تصحيح الأدوار
} from './permissions';
import { CryptoSecurity, INITIAL_USERS } from './crypto';
import { dbService } from '../services/databaseService';

const SESSION_KEY = 'kaf_auth_session_v6';
const API_BASE_URL: string =
  (import.meta as any).env?.VITE_CENTRAL_API_URL || 'http://localhost:5000/api/v1';
const ONLINE_TIMEOUT_MS = 3000; // 3 seconds

console.log('[Auth] API_BASE_URL =', API_BASE_URL);
console.log('[Auth] ONLINE_TIMEOUT_MS =', ONLINE_TIMEOUT_MS);

/**
 * Fallback password map for demo accounts.
 * Used when a user in SQLite has no passwordHash (e.g. after a sync
 * from the server that does not include the hash).
 */
const FALLBACK_PASSWORDS: Record<string, string> = {
  'admin.patrimoine': 'admin123',
  'admin': 'admin123',
  'agent.identification': 'agent123',
  'agent': 'agent123',
  'controleur.chargement': 'ctrl123',
  'ctrl': 'ctrl123',
  'desktop_tech1': 'Kaf2026!Secure',
  'verifier_tech2': 'Kaf2026!Secure',
  'loader_tech3': 'Kaf2026!Secure',
  'team1': 'agent123',
  'team2': 'ctrl123',
  'team3': 'ctrl123',
};

export interface LoginResult {
  success: boolean;
  user?: AppUser;
  isOffline?: boolean;
  error?: string;
}

export class AuthService {
  private currentSession: UserSession | null = null;
  private listeners: Array<(session: UserSession | null) => void> = [];
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private networkListeners: Array<(online: boolean) => void> = [];

  constructor() {
    this.restoreSession();
    this.setupNetworkWatcher();
  }

  // ═══════════════════════════════════════════════════════════
  // NETWORK MONITORING
  // ═══════════════════════════════════════════════════════════
  private setupNetworkWatcher(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('[Auth] 🌐 Network ONLINE');
      this.isOnline = true;
      this.notifyNetworkListeners(true);
    });

    window.addEventListener('offline', () => {
      console.log('[Auth] 📴 Network OFFLINE');
      this.isOnline = false;
      this.notifyNetworkListeners(false);
    });
  }

  private notifyNetworkListeners(online: boolean): void {
    this.networkListeners.forEach(cb => cb(online));
  }

  public onNetworkChange(cb: (online: boolean) => void): () => void {
    this.networkListeners.push(cb);
    return () => {
      this.networkListeners = this.networkListeners.filter(l => l !== cb);
    };
  }

  public isNetworkOnline(): boolean {
    return this.isOnline;
  }

  // ═══════════════════════════════════════════════════════════
  // SESSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════
  private restoreSession(): void {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const session: UserSession = JSON.parse(saved);
        if (session && session.user && session.user.isActive) {
          const authTime = new Date(session.authenticatedAt).getTime();
          const now = Date.now();
          const maxAge = 24 * 60 * 60 * 1000; // 24h

          if (now - authTime < maxAge) {
            // ✅ تصحيح الدور عند استعادة الجلسة لضمان توافقه
            session.user.role = normalizeRole(session.user.role);
            session.permissions = ROLE_PERMISSIONS[session.user.role] || [];
            this.currentSession = session;
            console.log('[Auth] Session restored:', session.user.username);
          } else {
            localStorage.removeItem(SESSION_KEY);
            this.currentSession = null;
          }
        }
      }
    } catch (err) {
      console.warn('[Auth] Could not restore session:', err);
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
    } catch (err) {
      console.warn('[Auth] Could not persist session:', err);
    }
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l(this.currentSession));
  }

  public subscribe(listener: (session: UserSession | null) => void): () => void {
    this.listeners.push(listener);
    listener(this.currentSession);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // ═══════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════
  public getSession(): UserSession | null {
    return this.currentSession;
  }

  public getCurrentUser(): AppUser | null {
    return this.currentSession?.user || null;
  }

  public getCurrentRole(): UserRole {
    return this.currentSession?.user.role || 'AGENT_INVENTAIRE';
  }

  public isAuthenticated(): boolean {
    return !!this.currentSession?.user;
  }

  public isOfflineSession(): boolean {
    return this.currentSession?.isOffline === true;
  }

  public can(permission: AppPermission): boolean {
    if (!this.currentSession?.user.isActive) return false;
    return hasPermission(this.currentSession.user.role, permission);
  }

  // ═══════════════════════════════════════════════════════════
  // LOGIN — Main entry point
  // ═══════════════════════════════════════════════════════════
  public async login(username: string, passwordPlain: string): Promise<LoginResult> {
    const cleanUser = username.trim();
    if (!cleanUser || !passwordPlain) {
      return { success: false, error: 'Veuillez saisir votre identifiant et votre mot de passe.' };
    }

    // ─── Tentative 1 : ONLINE (timeout 3s) ───────────────────
    console.log('[Auth] 🔐 Login attempt for:', cleanUser);
    console.log('[Auth] 🌐 Trying online authentication...');

    const onlineResult = await this.tryOnlineLogin(cleanUser, passwordPlain);

    if (onlineResult.success) {
      // Sync user to local DB for future offline logins
      if (onlineResult.user) {
        try {
          await dbService.createUser(onlineResult.user);
          console.log('[Auth] 💾 User saved to local DB (with SHA-256 hash)');
        } catch (err) {
          console.warn('[Auth] Could not save user locally:', err);
        }
      }
      return onlineResult;
    }

    // If online returned a definite rejection (wrong password), don't fallback
    if (onlineResult.error && !onlineResult.error.includes('unreachable') &&
        !onlineResult.error.includes('timeout') &&
        !onlineResult.error.includes('network')) {
      console.log('[Auth] ❌ Online rejection (bad credentials), not falling back');
      return onlineResult;
    }

    // ─── Tentative 2 : OFFLINE (local DB) ────────────────────
    console.log('[Auth] 📴 Falling back to offline authentication...');
    return this.tryOfflineLogin(cleanUser, passwordPlain);
  }

  // ═══════════════════════════════════════════════════════════
  // ONLINE LOGIN (with 3s timeout)
  // ═══════════════════════════════════════════════════════════
  private async tryOnlineLogin(username: string, password: string): Promise<LoginResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ONLINE_TIMEOUT_MS);

    try {
      const url = `${API_BASE_URL}/auth/login`;
      console.log('[Auth] POST', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username, password }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('[Auth] Response status:', response.status);

      const data = await response.json().catch(() => null);
      console.log('[Auth] Response body:', data);

      const authToken = data?.access_token || data?.token;

      // ─── Success ─────────────────────────────────────────
      if (response.ok && authToken && data?.user) {
        // Compute SHA-256 of password locally for offline verification
        const passwordHash = await CryptoSecurity.hashPassword(password);

        // ✅ تصحيح الدور القادم من الخادم
        const normalizedRole = normalizeRole(data.user.role);

        const apiUser: AppUser = {
          id: data.user.id,
          username: data.user.username,
          fullName: data.user.fullName,
          email: data.user.email || `${username}@kotama-agrifood.dz`,
          role: normalizedRole, // استخدام الدور المصحح
          isActive: data.user.isActive !== false,
          lastLoginAt: new Date().toISOString(),
          createdAt: data.user.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          passwordHash
        };

        const session: UserSession = {
          user: apiUser,
          token: authToken,
          authenticatedAt: new Date().toISOString(),
          permissions: ROLE_PERMISSIONS[apiUser.role] || [],
          isOffline: false
        };

        this.currentSession = session;
        this.persistSession(session);
        this.isOnline = true;

        console.log('[Auth] ✅ ONLINE login success:', apiUser.username);
        console.log('[Auth] 📝 Hash stored for offline:', passwordHash.substring(0, 16) + '...');
        return { success: true, user: apiUser, isOffline: false };
      }

      // ─── Credentials rejected ────────────────────────────
      if (response.status === 401 || response.status === 403) {
        console.log('[Auth] ❌ ONLINE: bad credentials');
        return {
          success: false,
          error: data?.message || 'Identifiant ou mot de passe incorrect.'
        };
      }

      // ─── Other server error ──────────────────────────────
      console.warn('[Auth] ⚠️ ONLINE: unexpected response', response.status);
      return {
        success: false,
        error: `Erreur serveur (${response.status})`
      };
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        console.log('[Auth] ⏱️ ONLINE: timeout (3s), falling back to offline');
        return { success: false, error: 'timeout — server unreachable' };
      }

      console.log('[Auth] 🔌 ONLINE: network error, falling back to offline:', err.message);
      return { success: false, error: 'network error — server unreachable' };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // OFFLINE LOGIN (local DB) — WITH FALLBACK FOR MISSING HASH
  // ═══════════════════════════════════════════════════════════
  private async tryOfflineLogin(username: string, password: string): Promise<LoginResult> {
    try {
      console.log('[Auth] 📴 Offline login for:', username);

      // ─── Load users from local DB ────────────────────────────
      let localUsers: AppUser[] = [];
      try {
        localUsers = await dbService.getUsers();
        console.log('[Auth] Found', localUsers.length, 'local users');
      } catch (err) {
        console.warn('[Auth] Could not load local users, using INITIAL_USERS:', err);
        localUsers = [...INITIAL_USERS];
      }

      // ─── If DB is empty, seed with INITIAL_USERS ─────────────
      if (!localUsers || localUsers.length === 0) {
        console.log('[Auth] 🎲 Empty local DB, seeding with INITIAL_USERS');
        localUsers = [...INITIAL_USERS];
        for (const u of INITIAL_USERS) {
          try { await dbService.createUser(u); } catch {}
        }
      }

      // ─── Find user ───────────────────────────────────────────
      const user = localUsers.find(u =>
        u.username.toLowerCase() === username.toLowerCase() ||
        (u.email && u.email.toLowerCase() === username.toLowerCase())
      );

      if (!user) {
        console.log('[Auth] ❌ Offline: user not found');
        return {
          success: false,
          error: 'Identifiant ou mot de passe incorrect (mode hors-ligne).'
        };
      }

      if (!user.isActive) {
        console.log('[Auth] ❌ Offline: user disabled');
        return {
          success: false,
          error: 'Ce compte a été désactivé.'
        };
      }

      // ═══════════════════════════════════════════════════════
      // ✅ FIX: Handle missing passwordHash
      // ═══════════════════════════════════════════════════════
      let effectiveHash = user.passwordHash;

      if (!effectiveHash || effectiveHash === '') {
        console.warn('[Auth] ⚠️ User', user.username, 'has NO passwordHash in local DB');
        console.warn('[Auth] 🔧 Using fallback map + auto-repair...');

        // Try to compute hash from known default password
        const fallbackPassword = FALLBACK_PASSWORDS[user.username.toLowerCase()];

        if (fallbackPassword) {
          try {
            // Compute hash of fallback password
            const computedHash = await CryptoSecurity.hashPassword(fallbackPassword);

            // Auto-repair: save hash in local DB for next time
            try {
              await dbService.updateUser(user.id, { passwordHash: computedHash });
              console.log('[Auth] ✅ Auto-repaired passwordHash for', user.username);
            } catch (repairErr) {
              console.warn('[Auth] Could not persist repair:', repairErr);
            }

            // Use computed hash for current verification
            effectiveHash = computedHash;
          } catch (hashErr) {
            console.error('[Auth] Could not compute fallback hash:', hashErr);
          }
        } else {
          console.warn('[Auth] ⚠️ No fallback password known for', user.username);
        }
      }

      // ─── Verify password ─────────────────────────────────────
      if (!effectiveHash) {
        console.error('[Auth] ❌ Cannot verify: no passwordHash available');
        return {
          success: false,
          error: 'Utilisateur non configuré pour le mode hors-ligne. Connectez-vous une première fois en ligne.'
        };
      }

      const isValid = await CryptoSecurity.verifyPassword(password, effectiveHash);

      if (!isValid) {
        console.log('[Auth] ❌ Offline: bad password');
        return {
          success: false,
          error: 'Identifiant ou mot de passe incorrect.'
        };
      }

      // ═══════════════════════════════════════════════════════
      // ✅ SUCCESS
      // ═══════════════════════════════════════════════════════
      const now = new Date().toISOString();
      try {
        await dbService.updateUser(user.id, { lastLoginAt: now });
      } catch {}
      
      user.lastLoginAt = now;
      user.passwordHash = effectiveHash;  // ensure in-memory hash is set

      // ✅ تصحيح الدور القادم من SQLite
      const normalizedRole = normalizeRole(user.role);
      const effectiveUser: AppUser = { ...user, role: normalizedRole };

      const session: UserSession = {
        user: effectiveUser,
        token: `OFFLINE-${user.id}-${Date.now()}`,
        authenticatedAt: now,
        permissions: ROLE_PERMISSIONS[normalizedRole] || [],
        isOffline: true
      };

      this.currentSession = session;
      this.persistSession(session);
      this.isOnline = false;

      console.log('[Auth] ✅ OFFLINE login success:', effectiveUser.username);
      console.log('[Auth] 🎭 Role:', effectiveUser.role);
      return { success: true, user: effectiveUser, isOffline: true };
    } catch (err: any) {
      console.error('[Auth] Offline login error:', err);
      return {
        success: false,
        error: err.message || 'Erreur d\'authentification hors-ligne.'
      };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // LOGOUT
  // ═══════════════════════════════════════════════════════════
  public async logout(): Promise<void> {
    const token = this.currentSession?.token;
    if (token && !this.currentSession?.isOffline) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch {}
    }

    this.currentSession = null;
    this.persistSession(null);
    console.log('[Auth] 👋 Logged out');
  }

  // ═══════════════════════════════════════════════════════════
  // CHANGE PASSWORD
  // ═══════════════════════════════════════════════════════════
  public async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (!this.currentSession) {
      return { success: false, error: 'Aucun utilisateur connecté.' };
    }
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Le mot de passe doit comporter au moins 6 caractères.' };
    }

    // If online, try server first
    if (!this.currentSession.isOffline && this.currentSession.token) {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.currentSession.token}`
          },
          body: JSON.stringify({ currentPassword, newPassword })
        });
        if (!res.ok) {
          const data = await res.json();
          return { success: false, error: data.message || 'Erreur serveur.' };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Serveur inaccessible.' };
      }
    }

    // Update local hash (SHA-256)
    const newHash = await CryptoSecurity.hashPassword(newPassword);
    try {
      await dbService.resetUserPassword(this.currentSession.user.id, newHash);
    } catch {}
    this.currentSession.user.passwordHash = newHash;
    this.persistSession(this.currentSession);

    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════
  // SWITCH USER (Admin testing)
  // ═══════════════════════════════════════════════════════════
  public async switchActiveUser(userId: string): Promise<boolean> {
    try {
      const users = await dbService.getUsers();
      const target = users.find(u => u.id === userId);
      if (!target || !target.isActive) return false;

      const normalizedRole = normalizeRole(target.role); // ✅ تصحيح الدور
      const effectiveTarget = { ...target, role: normalizedRole };

      const session: UserSession = {
        user: effectiveTarget,
        token: `SWITCH-${target.id}-${Date.now()}`,
        authenticatedAt: new Date().toISOString(),
        permissions: ROLE_PERMISSIONS[normalizedRole] || [],
        isOffline: this.currentSession?.isOffline ?? false
      };

      this.currentSession = session;
      this.persistSession(session);
      return true;
    } catch {
      return false;
    }
  }
}

export const authService = new AuthService();