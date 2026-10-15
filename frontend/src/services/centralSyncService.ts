import { 
  OfflineMutation, 
  BackendRole, 
  BackendWorkflowState, 
  BackendSyncBatchResult, 
  ApiHttpLog, 
  BackendConnectionStatus 
} from '../types';

class CentralSyncService {
  private configKey = 'kaf_backend_sync_cfg_v1';
  private logsKey = 'kaf_backend_http_logs_v1';
  private subscribers: Array<(status: BackendConnectionStatus) => void> = [];
  private logSubscribers: Array<(logs: ApiHttpLog[]) => void> = [];

  private status: BackendConnectionStatus = {
    isConnected: false,
    status: 'OFFLINE',
    apiUrl: (import.meta.env.VITE_CENTRAL_API_URL as string) || '/api',
    target: 'INTERNAL_EXPRESS',
    latencyMs: 0,
    database: 'PostgreSQL 16 (Central Truth)',
    redis: 'Redis 7 (Queue & Cache)',
    deviceId: (import.meta.env.VITE_DEVICE_ID as string) || 'TERM-WH-01',
    registered: true,
    activeRole: 'TEAM_1',
    token: null,
    lastSyncAt: null
  };

  private httpLogs: ApiHttpLog[] = [];

  constructor() {
    this.loadConfig();
    this.loadLogs();
  }

  private loadConfig() {
    try {
      const saved = localStorage.getItem(this.configKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.status = { ...this.status, ...parsed };
      }
    } catch (e) {
      console.warn('Error loading sync config:', e);
    }
  }

  private saveConfig() {
    try {
      localStorage.setItem(this.configKey, JSON.stringify({
        apiUrl: this.status.apiUrl,
        target: this.status.target,
        deviceId: this.status.deviceId,
        activeRole: this.status.activeRole,
        token: this.status.token,
        lastSyncAt: this.status.lastSyncAt
      }));
    } catch {}
    this.notifySubscribers();
  }

  private loadLogs() {
    try {
      const saved = localStorage.getItem(this.logsKey);
      if (saved) {
        this.httpLogs = JSON.parse(saved).slice(0, 50);
      }
    } catch {}
  }

  private saveLogs() {
    try {
      localStorage.setItem(this.logsKey, JSON.stringify(this.httpLogs.slice(0, 50)));
    } catch {}
    this.logSubscribers.forEach(cb => cb([...this.httpLogs]));
  }

  public subscribe(cb: (status: BackendConnectionStatus) => void) {
    this.subscribers.push(cb);
    cb({ ...this.status });
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== cb);
    };
  }

  public subscribeLogs(cb: (logs: ApiHttpLog[]) => void) {
    this.logSubscribers.push(cb);
    cb([...this.httpLogs]);
    return () => {
      this.logSubscribers = this.logSubscribers.filter(s => s !== cb);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach(cb => cb({ ...this.status }));
  }

  private recordLog(log: Omit<ApiHttpLog, 'id' | 'timestamp'>) {
    const entry: ApiHttpLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 999)}`,
      timestamp: new Date().toLocaleTimeString(),
      ...log
    };
    this.httpLogs.unshift(entry);
    if (this.httpLogs.length > 50) this.httpLogs.pop();
    this.saveLogs();
  }

  public clearLogs() {
    this.httpLogs = [];
    this.saveLogs();
  }

  public getStatus(): BackendConnectionStatus {
    return { ...this.status };
  }

  public getLogs(): ApiHttpLog[] {
    return [...this.httpLogs];
  }

  public updateConfig(fields: Partial<BackendConnectionStatus>) {
    this.status = { ...this.status, ...fields };
    this.saveConfig();
  }

  /**
   * Normalizes backend URL for local, preview and docker environments
   */
  public buildUrl(endpoint: string): string {
    let base = (this.status.apiUrl || '/api').trim().replace(/\/+$/, '');
    
    // In Cloud Run browser preview, rewrite localhost:3000 to current origin to avoid connection errors
    if (typeof window !== 'undefined' && base.startsWith('http://localhost:3000')) {
      if (!window.location.host.includes('localhost:3000')) {
        base = `${window.location.origin}/api`;
      }
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${base}${cleanEndpoint}`;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-device-id': this.status.deviceId,
      'x-device-api-key': 'dev_key_alpha_9921',
      'x-user-role': this.status.activeRole
    };

    if (this.status.token) {
      headers['Authorization'] = `Bearer ${this.status.token}`;
    }

    return headers;
  }

  /**
   * 1. Health check & Ping
   */
  public async checkHealth(): Promise<{ ok: boolean; data?: any; error?: string }> {
    const start = performance.now();
    this.status.status = 'CONNECTING';
    this.notifySubscribers();

    const url = this.buildUrl('/health');
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });
      const durationMs = Math.round(performance.now() - start);
      const data = await res.json();

      this.recordLog({
        method: 'GET',
        endpoint: url,
        status: res.status,
        durationMs,
        role: this.status.activeRole,
        responsePayload: data
      });

      if (res.ok) {
        this.status = {
          ...this.status,
          isConnected: true,
          status: 'ONLINE',
          latencyMs: durationMs,
          database: data.database?.engine || 'PostgreSQL 16',
          redis: data.redis?.engine || 'Redis 7'
        };
        this.saveConfig();
        return { ok: true, data };
      } else {
        throw new Error(data.message || `HTTP ${res.status}`);
      }
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);
      this.status = {
        ...this.status,
        isConnected: false,
        status: 'OFFLINE',
        latencyMs: durationMs
      };
      this.recordLog({
        method: 'GET',
        endpoint: url,
        status: 0,
        durationMs,
        role: this.status.activeRole,
        error: err.message || 'Connection refused'
      });
      this.saveConfig();
      return { ok: false, error: err.message || 'Connexion au serveur impossible' };
    }
  }

  /**
   * 2. Auth Login (Function 1)
   */
  public async login(role: BackendRole = this.status.activeRole, username?: string, password?: string): Promise<{ ok: boolean; user?: any; token?: string; error?: string }> {
    const start = performance.now();
    const url = this.buildUrl('/auth/login');
    try {
      const payload = {
        username: username || role.toLowerCase(),
        password: password || 'kaf_secure_pass_2026',
        role
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const durationMs = Math.round(performance.now() - start);
      const data = await res.json();

      this.recordLog({
        method: 'POST',
        endpoint: url,
        status: res.status,
        durationMs,
        role,
        requestPayload: payload,
        responsePayload: data
      });

      if (res.ok && data.access_token) {
        this.status = {
          ...this.status,
          activeRole: role,
          token: data.access_token,
          isConnected: true,
          status: 'ONLINE'
        };
        this.saveConfig();
        return { ok: true, user: data.user, token: data.access_token };
      } else {
        return { ok: false, error: data.message || 'Échec de connexion' };
      }
    } catch (e: any) {
      return { ok: false, error: e.message || 'Erreur réseau' };
    }
  }

  /**
   * 3. Sync Batch Push (Function 5 & 6)
   */
  public async syncBatch(mutations: OfflineMutation[]): Promise<BackendSyncBatchResult> {
    const start = performance.now();
    const batchId = `BATCH-${Date.now().toString().slice(-6)}`;
    const url = this.buildUrl('/sync');

    const payload = {
      deviceId: this.status.deviceId,
      apiKey: 'dev_key_alpha_9921',
      syncBatchId: batchId,
      mutations: mutations.map(m => ({
        id: m.id,
        idempotencyKey: m.idempotencyKey || m.id,
        type: m.type,
        assetId: m.assetId,
        assetName: m.assetName,
        payload: m.payload,
        timestamp: m.timestamp
      }))
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });

      const durationMs = Math.round(performance.now() - start);
      const data = await res.json();

      this.recordLog({
        method: 'POST',
        endpoint: url,
        status: res.status,
        durationMs,
        role: this.status.activeRole,
        requestPayload: { ...payload, mutationsCount: mutations.length },
        responsePayload: data
      });

      if (res.ok) {
        this.status.lastSyncAt = new Date().toLocaleString();
        this.saveConfig();
        return {
          success: true,
          batchId,
          processedCount: data.processedCount || mutations.length,
          successes: data.successes || [],
          conflicts: data.conflicts || [],
          duplicates: data.duplicates || [],
          serverTimestamp: data.serverTimestamp || new Date().toISOString()
        };
      } else {
        throw new Error(data.message || `HTTP ${res.status}`);
      }
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);
      this.recordLog({
        method: 'POST',
        endpoint: url,
        status: 0,
        durationMs,
        role: this.status.activeRole,
        requestPayload: payload,
        error: err.message
      });

      throw err;
    }
  }

  /**
   * 4. Fetch Central Assets (Function 3)
   */
  public async fetchAssets(params?: { search?: string; workflowState?: string }): Promise<any[]> {
    const start = performance.now();
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.workflowState) query.set('workflowState', params.workflowState);

    const qs = query.toString() ? `?${query.toString()}` : '';
    const url = `${this.buildUrl('/assets')}${qs}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    });

    const durationMs = Math.round(performance.now() - start);
    const data = await res.json();

    this.recordLog({
      method: 'GET',
      endpoint: url,
      status: res.status,
      durationMs,
      role: this.status.activeRole,
      responsePayload: { total: data.total, count: data.count }
    });

    return data.data || [];
  }

  /**
   * 5. Verify Asset (Function 4 & 7 - TEAM_2)
   */
  public async verifyAsset(assetId: string, details: { condition?: string; physicalState?: string; bayLocation?: string; notes?: string }): Promise<any> {
    const start = performance.now();
    const url = this.buildUrl(`/verification/${encodeURIComponent(assetId)}`);

    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(details)
    });

    const durationMs = Math.round(performance.now() - start);
    const data = await res.json();

    this.recordLog({
      method: 'POST',
      endpoint: url,
      status: res.status,
      durationMs,
      role: this.status.activeRole,
      requestPayload: details,
      responsePayload: data
    });

    if (!res.ok) {
      throw new Error(data.message || `HTTP ${res.status}`);
    }

    return data;
  }

  /**
   * 6. Load Asset (Function 4 & 7 - TEAM_3)
   */
  public async loadAsset(assetId: string, details: { containerCode?: string; truckPlate?: string }): Promise<any> {
    const start = performance.now();
    const url = this.buildUrl(`/loading/${encodeURIComponent(assetId)}`);

    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(details)
    });

    const durationMs = Math.round(performance.now() - start);
    const data = await res.json();

    this.recordLog({
      method: 'POST',
      endpoint: url,
      status: res.status,
      durationMs,
      role: this.status.activeRole,
      requestPayload: details,
      responsePayload: data
    });

    if (!res.ok) {
      throw new Error(data.message || `HTTP ${res.status}`);
    }

    return data;
  }

  /**
   * 7. ETL Mass Import (Function 8 - ADMIN)
   */
  public async importEtl(assets: any[]): Promise<any> {
    const start = performance.now();
    const url = this.buildUrl('/etl/import');

    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ assets })
    });

    const durationMs = Math.round(performance.now() - start);
    const data = await res.json();

    this.recordLog({
      method: 'POST',
      endpoint: url,
      status: res.status,
      durationMs,
      role: this.status.activeRole,
      requestPayload: { assetsCount: assets.length },
      responsePayload: data
    });

    if (!res.ok) {
      throw new Error(data.message || `HTTP ${res.status}`);
    }

    return data;
  }
}

export const centralSyncService = new CentralSyncService();
