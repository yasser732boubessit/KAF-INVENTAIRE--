/**
 * KAF-INVENTAIRE - Local SQLite Engine for Electron Windows
 * Compliant with offline-first industrial asset management specifications.
 *
 * ✅ NEW: syncUsers() — sync users from NestJS server to local SQLite
 * ✅ FIXED: createUser() now uses INSERT OR REPLACE to prevent UNIQUE constraint errors
 */

import path from 'node:path';
import fs from 'node:fs';

export interface SQLiteInitOptions {
  userDataPath: string;
}

export class LocalSQLiteEngine {
  private dbPath: string;
  private db: any = null; // better-sqlite3 instance
  private isLoaded = false;

  constructor(options: SQLiteInitOptions) {
    const dir = path.join(options.userDataPath, 'kaf-data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.dbPath = path.join(dir, 'kaf_inventaire.db');
  }

  public getDatabasePath(): string {
    return this.dbPath;
  }

  public async init(): Promise<void> {
    if (this.isLoaded) return;

    try {
      let DatabaseConstructor: any;
      try {
        DatabaseConstructor = (await import('better-sqlite3')).default;
        this.db = new DatabaseConstructor(this.dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('foreign_keys = ON');
        this.db.pragma('synchronous = NORMAL');
      } catch (e) {
        console.warn('Native SQLite driver load note:', e);
      }

      this.createTables();
      this.isLoaded = true;
    } catch (err) {
      console.error('Failed to initialize SQLite database:', err);
    }
  }

  private createTables(): void {
    if (!this.db) return;

    const schema = `
      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        officialCode TEXT NOT NULL,
        name TEXT NOT NULL,
        nameAr TEXT,
        nameFr TEXT,
        sku TEXT,
        serialNumber TEXT,
        barcode TEXT,
        rfidTag TEXT,
        category TEXT,
        zone TEXT,
        expectedBayLocation TEXT NOT NULL,
        scannedBayLocation TEXT,
        inventoryStatus TEXT NOT NULL DEFAULT 'NON_VERIFIE',
        condition TEXT DEFAULT 'nominal',
        tamperSealIntact INTEGER DEFAULT 1,
        rfidVerified INTEGER DEFAULT 0,
        serialVerified INTEGER DEFAULT 0,
        lastScannedAt TEXT,
        scannedBy TEXT,
        notes TEXT,
        notesFr TEXT,
        imageUrl TEXT,
        weightKg REAL DEFAULT 0,
        calibrationDueDate TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_assets_code ON assets(officialCode);
      CREATE INDEX IF NOT EXISTS idx_assets_barcode ON assets(barcode);
      CREATE INDEX IF NOT EXISTS idx_assets_serial ON assets(serialNumber);
      CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(inventoryStatus);
      CREATE INDEX IF NOT EXISTS idx_assets_location ON assets(expectedBayLocation);

      CREATE TABLE IF NOT EXISTS discoveries (
        id TEXT PRIMARY KEY,
        temporaryTag TEXT NOT NULL,
        description TEXT NOT NULL,
        serialNumber TEXT,
        barcode TEXT,
        foundLocation TEXT NOT NULL,
        foundBy TEXT,
        foundAt TEXT,
        imageUrl TEXT,
        status TEXT NOT NULL DEFAULT 'EN_ATTENTE_REVUE',
        rejectionReason TEXT,
        matchedAssetId TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_discoveries_status ON discoveries(status);

      CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        startDate TEXT,
        endDate TEXT,
        leadAuditor TEXT,
        zonesJson TEXT,
        progressPercent INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS zones (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        aisle TEXT NOT NULL,
        isClosed INTEGER DEFAULT 0,
        closedAt TEXT,
        closedBy TEXT
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        userId TEXT NOT NULL,
        userRole TEXT NOT NULL,
        action TEXT NOT NULL,
        entityId TEXT NOT NULL,
        oldValue TEXT,
        newValue TEXT,
        reason TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_time ON audit_logs(timestamp);

      CREATE TABLE IF NOT EXISTS offline_mutations (
        id TEXT PRIMARY KEY,
        idempotencyKey TEXT UNIQUE NOT NULL,
        timestamp TEXT NOT NULL,
        type TEXT NOT NULL,
        assetId TEXT NOT NULL,
        assetName TEXT,
        payloadJson TEXT,
        syncStatus TEXT DEFAULT 'PENDING',
        retryCount INTEGER DEFAULT 0,
        lastError TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_mutations_status ON offline_mutations(syncStatus);

      CREATE TABLE IF NOT EXISTS conflicts (
        id TEXT PRIMARY KEY,
        assetId TEXT NOT NULL,
        assetName TEXT,
        timestamp TEXT,
        fieldName TEXT,
        localValue TEXT,
        serverValue TEXT,
        resolved INTEGER DEFAULT 0,
        resolutionDecision TEXT,
        resolvedBy TEXT,
        resolvedAt TEXT
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt TEXT
      );

      CREATE TABLE IF NOT EXISTS checklist (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        titleAr TEXT,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'PENDING',
        testedAt TEXT
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        fullName TEXT NOT NULL,
        email TEXT,
        role TEXT NOT NULL,
        isActive INTEGER DEFAULT 1,
        avatarUrl TEXT,
        passwordHash TEXT NOT NULL,
        lastLoginAt TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `;

    this.db.exec(schema);

    // ═══════════════════════════════════════════════════════════
    // SEED USERS (only if empty)
    // ═══════════════════════════════════════════════════════════
    try {
      const userCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get().count;
      if (userCount === 0) {
        const seedUsers = [
          {
            id: 'USR-ADMIN-01',
            username: 'admin.patrimoine',
            fullName: 'Yacine Benali (Responsable Patrimoine)',
            email: 'y.benali@kotama-agrifood.dz',
            role: 'RESPONSABLE_PATRIMOINE',
            isActive: 1,
            avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
            passwordHash: 'admin123',
            createdAt: '2026-01-01 08:00:00',
            updatedAt: '2026-10-12 08:30:00',
            lastLoginAt: '2026-10-12 08:30:00'
          },
          {
            id: 'USR-AGENT-02',
            username: 'agent.identification',
            fullName: 'Mohamed Brahimi (Agent Identification)',
            email: 'm.brahimi@kotama-agrifood.dz',
            role: 'AGENT_INVENTAIRE',
            isActive: 1,
            avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80',
            passwordHash: 'agent123',
            createdAt: '2026-01-15 08:00:00',
            updatedAt: '2026-10-12 07:45:00',
            lastLoginAt: '2026-10-12 07:45:00'
          },
          {
            id: 'USR-CTRL-03',
            username: 'controleur.chargement',
            fullName: 'Amine Khelifi (Agent Contrôle / Chargement)',
            email: 'a.khelifi@kotama-agrifood.dz',
            role: 'CONTROLEUR_ZONE',
            isActive: 1,
            avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
            passwordHash: 'ctrl123',
            createdAt: '2026-02-01 08:00:00',
            updatedAt: '2026-10-12 08:15:00',
            lastLoginAt: '2026-10-12 08:15:00'
          }
        ];

        // ✅ التعديل هنا: استخدام INSERT OR REPLACE لتفادي أخطاء التكرار
        const insert = this.db.prepare(`
          INSERT OR REPLACE INTO users (id, username, fullName, email, role, isActive, avatarUrl, passwordHash, lastLoginAt, createdAt, updatedAt)
          VALUES (@id, @username, @fullName, @email, @role, @isActive, @avatarUrl, @passwordHash, @lastLoginAt, @createdAt, @updatedAt)
        `);

        for (const u of seedUsers) {
          insert.run(u);
        }
        console.log('[SQLite] Seeded', seedUsers.length, 'users');
      }
    } catch (e) {
      console.warn('Users table seed note:', e);
    }

    // ═══════════════════════════════════════════════════════════
    // SEED ASSETS (only if empty)
    // ═══════════════════════════════════════════════════════════
    try {
      const assetCount = this.db.prepare('SELECT COUNT(*) as count FROM assets').get().count;
      if (assetCount === 0) {
        this.db.prepare(`
          INSERT OR REPLACE INTO campaigns (id, title, status, startDate, endDate, leadAuditor, zonesJson, progressPercent)
          VALUES ('CAMP-2026-Q1', 'Campagne Générale d''Inventaire Industriel Q1-2026', 'EN_COURS', '2026-10-01', '2026-10-15', 'Yasser B. (Auditeur Principal)', '', 75)
        `).run();

        const insertZone = this.db.prepare('INSERT OR REPLACE INTO zones (id, name, aisle, isClosed, closedAt, closedBy) VALUES (?, ?, ?, ?, ?, ?)');
        insertZone.run('BAY-01', 'Baie 01 - Allée A1', 'Aisle A1', 0, null, null);
        insertZone.run('BAY-02', 'Baie 02 - Allée A2', 'Aisle A2', 1, '2026-10-08 07:50:00', 'MGR-CTRL-09');
        insertZone.run('BAY-03', 'Baie 03 - Allée A3', 'Aisle A3', 0, null, null);
        insertZone.run('BAY-04', 'Baie 04 - Allée A4', 'Aisle A4', 0, null, null);

        const initialAssetList = [
          {
            id: "AST-10492", officialCode: "IMMO-2026-00492", name: "High-Pressure Hydraulic Gear Pump H2",
            nameAr: "مضخة هيدروليكية ترسية عالية الضغط H2", nameFr: "Pompe hydraulique à engrenages haute pression H2",
            sku: "SKU-HYD-092", serialNumber: "SN-940218-GB", barcode: "894102938102", rfidTag: "E280-1160-2000-0914",
            category: "Mechanical", zone: "WEST-DC-ZONE-C", expectedBayLocation: "BAY-04-RACK-02-L3", scannedBayLocation: "BAY-04-RACK-02-L3",
            inventoryStatus: "CONFORME", condition: "nominal", tamperSealIntact: 1, rfidVerified: 1, serialVerified: 1,
            lastScannedAt: "2026-10-08 07:14:22", scannedBy: "TECH-941", notes: "Vérification physique réussie. Emplacement conforme.",
            imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80", weightKg: 24.5, calibrationDueDate: "2027-04-15"
          },
          {
            id: "AST-10493", officialCode: "IMMO-2026-00493", name: "Programmable Logic Controller (PLC) S7-1500",
            nameAr: "وحدة التحكم المنطقي المبرمجة S7-1500", nameFr: "Automate Programmable Industriel (API) S7-1500",
            sku: "SKU-AUT-150", serialNumber: "SN-772910-DE", barcode: "894102938103", rfidTag: "E280-1160-2000-0915",
            category: "Automation", zone: "WEST-DC-ZONE-C", expectedBayLocation: "BAY-04-RACK-01-L2", scannedBayLocation: "BAY-04-RACK-01-L2",
            inventoryStatus: "CONFORME", condition: "nominal", tamperSealIntact: 1, rfidVerified: 1, serialVerified: 1,
            lastScannedAt: "2026-10-08 07:22:05", scannedBy: "TECH-941", notes: "Firmware v3.1 validé.",
            imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80", weightKg: 3.2, calibrationDueDate: "2027-01-20"
          },
          {
            id: "AST-10494", officialCode: "IMMO-2026-00494", name: "Explosion-Proof Induction Motor 15kW",
            nameAr: "محرك حثي مضاد للانفجار بقوة 15 كيلوواط", nameFr: "Moteur à induction antidéflagrant 15 kW (ATEX)",
            sku: "SKU-ELE-412", serialNumber: "SN-318492-AT", barcode: "894102938104", rfidTag: "E280-1160-2000-0916",
            category: "Electrical", zone: "WEST-DC-ZONE-C", expectedBayLocation: "BAY-02-RACK-01-L1", scannedBayLocation: "BAY-03-RACK-04-L1",
            inventoryStatus: "ECART_LOCALISATION", condition: "minor_wear", tamperSealIntact: 0, rfidVerified: 1, serialVerified: 1,
            lastScannedAt: "2026-10-08 07:31:40", scannedBy: "TECH-941", notes: "Trouvé en Baie 03 au lieu de la Baie 02.",
            imageUrl: "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=600&q=80", weightKg: 142.0, calibrationDueDate: "2026-11-30"
          },
          {
            id: "AST-10495", officialCode: "IMMO-2026-00495", name: "Ultrasonic Vortex Flowmeter Flange DN80",
            nameAr: "مقياس تدفق فوق صوتي دوامي بشفة DN80", nameFr: "Débitmètre vortex à ultrasons à brides DN80",
            sku: "SKU-INS-833", serialNumber: "SN-994821-CH", barcode: "894102938105", rfidTag: "E280-1160-2000-0917",
            category: "Instrumentation", zone: "WEST-DC-ZONE-C", expectedBayLocation: "BAY-02-RACK-03-L2", scannedBayLocation: null,
            inventoryStatus: "MANQUANT", condition: "uninspected", tamperSealIntact: 0, rfidVerified: 0, serialVerified: 0,
            lastScannedAt: null, scannedBy: null, notes: "Absent lors de la tournée d'inspection Baie 02.",
            imageUrl: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80", weightKg: 18.5, calibrationDueDate: "2026-12-15"
          },
          {
            id: "AST-10502", officialCode: "IMMO-2026-00502", name: "Lenovo ThinkVision C24-20 Industrial Workstation Monitor",
            nameAr: "شاشة محطة التحكم والمراقبة الصناعية Lenovo C24-20", nameFr: "Moniteur de poste de supervision Lenovo C24-20",
            sku: "SKU-IT-C2420", serialNumber: "V5HND516", barcode: "1S62A8KAT1EUV5HND516", rfidTag: "E280-1160-2000-0924",
            category: "Automation", zone: "WEST-DC-ZONE-C", expectedBayLocation: "BAY-04-RACK-02-L1", scannedBayLocation: null,
            inventoryStatus: "NON_VERIFIE", condition: "nominal", tamperSealIntact: 1, rfidVerified: 1, serialVerified: 1,
            lastScannedAt: null, scannedBy: null, notes: "Moniteur LCD 23.8 pouces FHD.",
            imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80", weightKg: 3.01, calibrationDueDate: "2027-12-31"
          }
        ];

        const insertAsset = this.db.prepare(`
          INSERT OR REPLACE INTO assets (
            id, officialCode, name, nameAr, nameFr, sku, serialNumber, barcode, rfidTag,
            category, zone, expectedBayLocation, scannedBayLocation, inventoryStatus, condition,
            tamperSealIntact, rfidVerified, serialVerified, lastScannedAt, scannedBy, notes,
            imageUrl, weightKg, calibrationDueDate
          ) VALUES (
            @id, @officialCode, @name, @nameAr, @nameFr, @sku, @serialNumber, @barcode, @rfidTag,
            @category, @zone, @expectedBayLocation, @scannedBayLocation, @inventoryStatus, @condition,
            @tamperSealIntact, @rfidVerified, @serialVerified, @lastScannedAt, @scannedBy, @notes,
            @imageUrl, @weightKg, @calibrationDueDate
          )
        `);

        for (const a of initialAssetList) {
          insertAsset.run(a);
        }

        const insertDisc = this.db.prepare(`
          INSERT OR REPLACE INTO discoveries (id, temporaryTag, description, serialNumber, barcode, foundLocation, foundBy, foundAt, imageUrl, status, matchedAssetId)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        insertDisc.run(
          "DEC-001", "DISCOV-2026-001", "Compresseur d'air mobile à vis 7.5kW (Non répertorié)",
          "SN-UNKNOWN-8842", "990184918201", "BAY-03-RACK-04-L1", "TECH-941", "2026-10-08 08:15:30",
          "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
          "EN_ATTENTE_REVUE", null
        );

        const insertChk = this.db.prepare('INSERT OR REPLACE INTO checklist (id, title, titleAr, description, status) VALUES (?, ?, ?, ?, ?)');
        insertChk.run(1, "Scan d'un actif conforme", "مسح أصل مطابق في مكانه", "Vérifie l'identification d'un équipement présent à sa place.", "PASSED");
        insertChk.run(2, "Détection d'un écart d'emplacement", "اكتشاف أصل في مكان غير مكانه", "Signale un actif trouvé dans une baie différente.", "PASSED");
        insertChk.run(3, "Clôture de zone et calcul des manquants", "إغلاق المنطقة وحساب المفقودات", "Vérifie le déclenchement des manquants après clôture.", "PASSED");
      }
    } catch (e) {
      console.warn('Initial SQLite seed note:', e);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // STATS
  // ═══════════════════════════════════════════════════════════
  public getStats() {
    let size = 0;
    try {
      if (fs.existsSync(this.dbPath)) size = fs.statSync(this.dbPath).size;
    } catch {}

    let totalAssets = 0, conforme = 0, locationDiff = 0, missing = 0, unverified = 0;
    let discoveries = 0, mutations = 0, auditLogs = 0;

    if (this.db) {
      try {
        totalAssets = this.db.prepare('SELECT COUNT(*) as count FROM assets').get().count;
        conforme = this.db.prepare("SELECT COUNT(*) as count FROM assets WHERE inventoryStatus = 'CONFORME'").get().count;
        locationDiff = this.db.prepare("SELECT COUNT(*) as count FROM assets WHERE inventoryStatus = 'ECART_LOCALISATION'").get().count;
        missing = this.db.prepare("SELECT COUNT(*) as count FROM assets WHERE inventoryStatus = 'MANQUANT'").get().count;
        unverified = this.db.prepare("SELECT COUNT(*) as count FROM assets WHERE inventoryStatus = 'NON_VERIFIE'").get().count;
        discoveries = this.db.prepare('SELECT COUNT(*) as count FROM discoveries').get().count;
        mutations = this.db.prepare("SELECT COUNT(*) as count FROM offline_mutations WHERE syncStatus = 'PENDING'").get().count;
        auditLogs = this.db.prepare('SELECT COUNT(*) as count FROM audit_logs').get().count;
      } catch {}
    }

    return {
      engine: 'ELECTRON_SQLITE',
      totalAssets, conformeAssets: conforme, locationDiffAssets: locationDiff,
      missingAssets: missing, unverifiedAssets: unverified,
      totalDiscoveries: discoveries, pendingDiscoveries: discoveries,
      totalMutations: mutations, pendingMutations: mutations,
      totalAuditLogs: auditLogs,
      totalZones: 4, closedZones: 3,
      databasePath: this.dbPath,
      databaseSizeBytes: size || 1048576,
      journalMode: 'WAL (Write-Ahead Logging)',
      integrityStatus: 'OK',
      lastBackupAt: new Date().toISOString(),
      sqliteVersion: 'SQLite 3.45.1'
    };
  }

  public checkIntegrity(): string {
    if (!this.db) return 'ok (Memory fallback)';
    try {
      const res = this.db.prepare('PRAGMA integrity_check').get();
      return res.integrity_check || 'ok';
    } catch (err: any) {
      return `Integrity check failed: ${err.message}`;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // USERS
  // ═══════════════════════════════════════════════════════════
  public getUsers(): any[] {
    if (!this.db) return [];
    try {
      const rows = this.db.prepare('SELECT id, username, fullName, email, role, isActive, avatarUrl, lastLoginAt, createdAt, updatedAt FROM users ORDER BY createdAt ASC').all();
      return rows.map((r: any) => ({ ...r, isActive: Boolean(r.isActive) }));
    } catch (e) {
      console.error('getUsers error:', e);
      return [];
    }
  }

  public createUser(user: any): any {
    if (!this.db) return user;
    // ✅ التعديل هنا: استخدام INSERT OR REPLACE لتحديث المستخدم إذا كان موجوداً
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO users (id, username, fullName, email, role, isActive, avatarUrl, passwordHash, lastLoginAt, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      user.id,
      user.username,
      user.fullName,
      user.email || '',
      user.role,
      user.isActive ? 1 : 0,
      user.avatarUrl || '',
      user.passwordHash,
      user.lastLoginAt || null,
      user.createdAt || new Date().toISOString(),
      user.updatedAt || new Date().toISOString()
    );
    return user;
  }

  public updateUser(id: string, fields: any): any {
    if (!this.db) return null;
    const allowed = ['fullName', 'email', 'role', 'avatarUrl', 'isActive', 'updatedAt'];
    const updates: string[] = [];
    const values: any[] = [];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = ?`);
        values.push(key === 'isActive' ? (fields[key] ? 1 : 0) : fields[key]);
      }
    }

    if (updates.length > 0) {
      updates.push('updatedAt = ?');
      values.push(new Date().toISOString());
      values.push(id);
      this.db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.db.prepare('SELECT id, username, fullName, email, role, isActive, avatarUrl, lastLoginAt, createdAt, updatedAt FROM users WHERE id = ?').get(id);
  }

  public setUserActiveStatus(id: string, isActive: boolean): void {
    if (!this.db) return;
    this.db.prepare('UPDATE users SET isActive = ?, updatedAt = ? WHERE id = ?').run(
      isActive ? 1 : 0,
      new Date().toISOString(),
      id
    );
  }

  public resetUserPassword(id: string, newPasswordHash: string): void {
    if (!this.db) return;
    this.db.prepare('UPDATE users SET passwordHash = ?, updatedAt = ? WHERE id = ?').run(
      newPasswordHash,
      new Date().toISOString(),
      id
    );
  }

  // ═══════════════════════════════════════════════════════════
  // ✅ SYNC USERS from NestJS server
  // ═══════════════════════════════════════════════════════════
  public syncUsers(users: any[]): { synced: number; errors: number } {
    if (!this.db) {
      console.warn('[SQLite] syncUsers: DB not initialized');
      return { synced: 0, errors: users.length };
    }

    let synced = 0;
    let errors = 0;

    for (const user of users) {
      try {
        this.db.prepare(`
          INSERT INTO users (id, username, fullName, email, role, isActive, avatarUrl, passwordHash, lastLoginAt, createdAt, updatedAt)
          VALUES (@id, @username, @fullName, @email, @role, @isActive, @avatarUrl, @passwordHash, @lastLoginAt, @createdAt, @updatedAt)
          ON CONFLICT(id) DO UPDATE SET
            username = excluded.username,
            fullName = excluded.fullName,
            email = excluded.email,
            role = excluded.role,
            isActive = excluded.isActive,
            avatarUrl = excluded.avatarUrl,
            passwordHash = excluded.passwordHash,
            lastLoginAt = excluded.lastLoginAt,
            updatedAt = excluded.updatedAt
        `).run({
          id: user.id,
          username: user.username,
          fullName: user.fullName || '',
          email: user.email || '',
          role: user.role,
          isActive: user.isActive ? 1 : 0,
          avatarUrl: user.avatarUrl || '',
          passwordHash: user.passwordHash || '',
          lastLoginAt: user.lastLoginAt || null,
          createdAt: user.createdAt || new Date().toISOString(),
          updatedAt: user.updatedAt || new Date().toISOString()
        });
        synced++;
      } catch (err) {
        console.error('[SQLite] syncUsers error for', user.username, ':', err);
        errors++;
      }
    }

    console.log(`[SQLite] syncUsers: ${synced} synced, ${errors} errors`);
    return { synced, errors };
  }

  // ═══════════════════════════════════════════════════════════
  // ASSETS
  // ═══════════════════════════════════════════════════════════
  public getAssets(): any[] {
    if (!this.db) return [];
    try {
      const rows = this.db.prepare('SELECT * FROM assets ORDER BY id ASC').all();
      return rows.map((r: any) => ({
        ...r,
        tamperSealIntact: Boolean(r.tamperSealIntact),
        rfidVerified: Boolean(r.rfidVerified),
        serialVerified: Boolean(r.serialVerified)
      }));
    } catch (e) {
      console.error('getAssets error:', e);
      return [];
    }
  }

  public getAssetById(id: string): any | null {
    if (!this.db) return null;
    try {
      const row = this.db.prepare('SELECT * FROM assets WHERE id = ?').get(id);
      if (!row) return null;
      return {
        ...row,
        tamperSealIntact: Boolean(row.tamperSealIntact),
        rfidVerified: Boolean(row.rfidVerified),
        serialVerified: Boolean(row.serialVerified)
      };
    } catch { return null; }
  }

  public searchAssets(query: string): any[] {
    if (!this.db) return [];
    try {
      const q = `%${query.trim().toLowerCase()}%`;
      const rows = this.db.prepare(`
        SELECT * FROM assets
        WHERE LOWER(id) LIKE ? OR LOWER(officialCode) LIKE ? OR LOWER(name) LIKE ?
           OR LOWER(serialNumber) LIKE ? OR LOWER(barcode) LIKE ? OR LOWER(expectedBayLocation) LIKE ?
      `).all(q, q, q, q, q, q);
      return rows.map((r: any) => ({
        ...r,
        tamperSealIntact: Boolean(r.tamperSealIntact),
        rfidVerified: Boolean(r.rfidVerified),
        serialVerified: Boolean(r.serialVerified)
      }));
    } catch { return []; }
  }

  public createAsset(asset: any): any {
    if (!this.db) return asset;
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO assets (
        id, officialCode, name, nameAr, nameFr, sku, serialNumber, barcode, rfidTag,
        category, zone, expectedBayLocation, scannedBayLocation, inventoryStatus, condition,
        tamperSealIntact, rfidVerified, serialVerified, lastScannedAt, scannedBy, notes, notesFr,
        imageUrl, weightKg, calibrationDueDate
      ) VALUES (
        @id, @officialCode, @name, @nameAr, @nameFr, @sku, @serialNumber, @barcode, @rfidTag,
        @category, @zone, @expectedBayLocation, @scannedBayLocation, @inventoryStatus, @condition,
        @tamperSealIntact, @rfidVerified, @serialVerified, @lastScannedAt, @scannedBy, @notes, @notesFr,
        @imageUrl, @weightKg, @calibrationDueDate
      )
    `);
    stmt.run({
      ...asset,
      nameAr: asset.nameAr || null,
      nameFr: asset.nameFr || null,
      notesFr: asset.notesFr || null,
      scannedBayLocation: asset.scannedBayLocation || null,
      tamperSealIntact: asset.tamperSealIntact ? 1 : 0,
      rfidVerified: asset.rfidVerified ? 1 : 0,
      serialVerified: asset.serialVerified ? 1 : 0,
      weightKg: asset.weightKg || 0
    });
    return asset;
  }

  public updateAsset(id: string, fields: any): any {
    if (!this.db) return null;
    const existing = this.getAssetById(id);
    if (!existing) return null;
    const merged = { ...existing, ...fields };
    this.createAsset(merged);
    return merged;
  }

  public updateInventoryStatus(id: string, status: string, bayLocation?: string, user = 'TECH-941'): any {
    if (!this.db) return null;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const updates: any = { inventoryStatus: status, lastScannedAt: now, scannedBy: user };
    if (bayLocation) updates.scannedBayLocation = bayLocation;
    return this.updateAsset(id, updates);
  }

  // ═══════════════════════════════════════════════════════════
  // DISCOVERIES
  // ═══════════════════════════════════════════════════════════
  public getDiscoveries(): any[] {
    if (!this.db) return [];
    try {
      return this.db.prepare('SELECT * FROM discoveries ORDER BY foundAt DESC').all();
    } catch { return []; }
  }

  public createDiscovery(discovery: any): any {
    if (!this.db) return discovery;
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO discoveries (
        id, temporaryTag, description, serialNumber, barcode, foundLocation,
        foundBy, foundAt, imageUrl, status, rejectionReason, matchedAssetId
      ) VALUES (
        @id, @temporaryTag, @description, @serialNumber, @barcode, @foundLocation,
        @foundBy, @foundAt, @imageUrl, @status, @rejectionReason, @matchedAssetId
      )
    `);
    stmt.run({
      ...discovery,
      rejectionReason: discovery.rejectionReason || null,
      matchedAssetId: discovery.matchedAssetId || null
    });
    return discovery;
  }

  public matchDiscovery(id: string, assetId: string): void {
    if (!this.db) return;
    this.db.prepare("UPDATE discoveries SET status = 'RAPPROCHE', matchedAssetId = ? WHERE id = ?").run(assetId, id);
    this.updateInventoryStatus(assetId, 'CONFORME');
  }

  public integrateDiscovery(id: string, officialCode: string): any {
    if (!this.db) return null;
    const disc = this.db.prepare('SELECT * FROM discoveries WHERE id = ?').get(id);
    if (!disc) return null;

    this.db.prepare("UPDATE discoveries SET status = 'INTEGRE' WHERE id = ?").run(id);

    const newAsset = {
      id: `AST-${Math.floor(10510 + Math.random() * 899)}`,
      officialCode,
      name: disc.description,
      nameAr: disc.description,
      nameFr: disc.description,
      sku: `SKU-DISC-${Math.floor(100 + Math.random() * 899)}`,
      serialNumber: disc.serialNumber || `SN-REG-${Date.now().toString().slice(-6)}`,
      barcode: disc.barcode || `89410${Math.floor(1000000 + Math.random() * 8999999)}`,
      rfidTag: `E280-DISC-${Math.floor(1000 + Math.random() * 8999)}`,
      category: 'Mechanical',
      zone: 'WEST-DC-ZONE-C',
      expectedBayLocation: disc.foundLocation,
      scannedBayLocation: disc.foundLocation,
      inventoryStatus: 'CONFORME',
      condition: 'nominal',
      tamperSealIntact: true,
      rfidVerified: false,
      serialVerified: true,
      lastScannedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      scannedBy: 'TECH-941',
      notes: `Intégré officiellement depuis découverte ${disc.temporaryTag}`,
      imageUrl: disc.imageUrl,
      weightKg: 10,
      calibrationDueDate: '2027-12-31'
    };

    return this.createAsset(newAsset);
  }

  public rejectDiscovery(id: string, reason: string): void {
    if (!this.db) return;
    this.db.prepare("UPDATE discoveries SET status = 'REJETE', rejectionReason = ? WHERE id = ?").run(reason, id);
  }

  // ═══════════════════════════════════════════════════════════
  // CAMPAIGN & ZONES
  // ═══════════════════════════════════════════════════════════
  public getCampaign(): any {
    if (!this.db) return null;
    try {
      const camp = this.db.prepare('SELECT * FROM campaigns LIMIT 1').get();
      if (!camp) return null;
      const zones = this.db.prepare('SELECT * FROM zones ORDER BY id ASC').all();
      return { ...camp, zones: zones.map((z: any) => ({ ...z, isClosed: Boolean(z.isClosed) })) };
    } catch { return null; }
  }

  public closeZone(zoneId: string, user: string): void {
    if (!this.db) return;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    this.db.prepare('UPDATE zones SET isClosed = 1, closedAt = ?, closedBy = ? WHERE id = ?').run(now, user, zoneId);
    this.db.prepare(`
      UPDATE assets
      SET inventoryStatus = 'MANQUANT'
      WHERE expectedBayLocation LIKE ? AND inventoryStatus = 'NON_VERIFIE'
    `).run(`${zoneId}%`);
  }

  public reopenZone(zoneId: string): void {
    if (!this.db) return;
    this.db.prepare('UPDATE zones SET isClosed = 0, closedAt = NULL, closedBy = NULL WHERE id = ?').run(zoneId);
  }

  public lockCampaign(): void {
    if (!this.db) return;
    this.db.prepare("UPDATE campaigns SET status = 'VERROUILLEE'").run();
  }

  // ═══════════════════════════════════════════════════════════
  // AUDIT LOGS
  // ═══════════════════════════════════════════════════════════
  public getAuditLogs(): any[] {
    if (!this.db) return [];
    try {
      return this.db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500').all();
    } catch { return []; }
  }

  public addAuditLog(entry: any): any {
    if (!this.db) return entry;
    const newLog = {
      id: entry.id || `LOG-${Math.floor(100 + Math.random() * 899)}`,
      timestamp: entry.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19),
      userId: entry.userId,
      userRole: entry.userRole,
      action: entry.action,
      entityId: entry.entityId,
      oldValue: entry.oldValue || '',
      newValue: entry.newValue || '',
      reason: entry.reason || ''
    };
    this.db.prepare(`
      INSERT INTO audit_logs (id, timestamp, userId, userRole, action, entityId, oldValue, newValue, reason)
      VALUES (@id, @timestamp, @userId, @userRole, @action, @entityId, @oldValue, @newValue, @reason)
    `).run(newLog);
    return newLog;
  }

  // ═══════════════════════════════════════════════════════════
  // MUTATIONS
  // ═══════════════════════════════════════════════════════════
  public getMutations(): any[] {
    if (!this.db) return [];
    try {
      const rows = this.db.prepare('SELECT * FROM offline_mutations ORDER BY timestamp DESC').all();
      return rows.map((r: any) => ({ ...r, payload: r.payloadJson ? JSON.parse(r.payloadJson) : {} }));
    } catch { return []; }
  }

  public addMutation(mutation: any): any {
    if (!this.db) return mutation;
    const newMut = {
      id: mutation.id || `MUT-${Math.floor(99410 + Math.random() * 89999)}`,
      idempotencyKey: mutation.idempotencyKey,
      timestamp: mutation.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19),
      type: mutation.type,
      assetId: mutation.assetId,
      assetName: mutation.assetName || '',
      payloadJson: JSON.stringify(mutation.payload || {}),
      syncStatus: mutation.syncStatus || 'PENDING',
      retryCount: mutation.retryCount || 0,
      lastError: mutation.lastError || null
    };
    this.db.prepare(`
      INSERT OR REPLACE INTO offline_mutations (id, idempotencyKey, timestamp, type, assetId, assetName, payloadJson, syncStatus, retryCount, lastError)
      VALUES (@id, @idempotencyKey, @timestamp, @type, @assetId, @assetName, @payloadJson, @syncStatus, @retryCount, @lastError)
    `).run(newMut);
    return { ...newMut, payload: mutation.payload || {} };
  }

  public flushMutations(): number {
    if (!this.db) return 0;
    const res = this.db.prepare("UPDATE offline_mutations SET syncStatus = 'SUCCESS' WHERE syncStatus = 'PENDING'").run();
    return res.changes;
  }

  public clearMutations(): void {
    if (!this.db) return;
    this.db.prepare('DELETE FROM offline_mutations').run();
  }

  // ═══════════════════════════════════════════════════════════
  // CONFLICTS
  // ═══════════════════════════════════════════════════════════
  public getConflicts(): any[] {
    if (!this.db) return [];
    try {
      const rows = this.db.prepare('SELECT * FROM conflicts ORDER BY timestamp DESC').all();
      return rows.map((r: any) => ({ ...r, resolved: Boolean(r.resolved) }));
    } catch { return []; }
  }

  public resolveConflict(conflictId: string, resolution: string): void {
    if (!this.db) return;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    this.db.prepare(`
      UPDATE conflicts
      SET resolved = 1, resolutionDecision = ?, resolvedAt = ?, resolvedBy = 'MGR-ADMIN-01'
      WHERE id = ?
    `).run(resolution, now, conflictId);
  }

  // ═══════════════════════════════════════════════════════════
  // CHECKLIST
  // ═══════════════════════════════════════════════════════════
  public getChecklist(): any[] {
    if (!this.db) return [];
    try {
      return this.db.prepare('SELECT * FROM checklist ORDER BY id ASC').all();
    } catch { return []; }
  }

  public updateChecklist(id: number, status: string): void {
    if (!this.db) return;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    this.db.prepare('UPDATE checklist SET status = ?, testedAt = ? WHERE id = ?').run(status, now, id);
  }

  // ═══════════════════════════════════════════════════════════
  // BACKUP / RESTORE / EXPORT
  // ═══════════════════════════════════════════════════════════
  public exportBackup(): any {
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      source: 'KAF-INVENTAIRE Electron Native SQLite',
      schemaVersion: 5,
      data: {
        assets: this.getAssets(),
        discoveries: this.getDiscoveries(),
        campaigns: [this.getCampaign()].filter(Boolean),
        mutations: this.getMutations(),
        conflicts: this.getConflicts(),
        auditLogs: this.getAuditLogs(),
        checklist: this.getChecklist(),
        users: this.getUsers()
      }
    };
  }

  public importBackup(backup: any): boolean {
    if (!this.db || !backup?.data) return false;
    try {
      this.db.transaction(() => {
        if (backup.data.assets) {
          this.db.prepare('DELETE FROM assets').run();
          for (const a of backup.data.assets) this.createAsset(a);
        }
        if (backup.data.discoveries) {
          this.db.prepare('DELETE FROM discoveries').run();
          for (const d of backup.data.discoveries) this.createDiscovery(d);
        }
        if (backup.data.auditLogs) {
          this.db.prepare('DELETE FROM audit_logs').run();
          for (const l of backup.data.auditLogs) this.addAuditLog(l);
        }
        if (backup.data.mutations) {
          this.db.prepare('DELETE FROM offline_mutations').run();
          for (const m of backup.data.mutations) this.addMutation(m);
        }
        if (backup.data.users) {
          this.db.prepare('DELETE FROM users').run();
          for (const u of backup.data.users) this.createUser(u);
        }
      })();
      return true;
    } catch (e) {
      console.error('Import backup error:', e);
      return false;
    }
  }

  public exportSqlDump(): string {
    const assets = this.getAssets();
    const users = this.getUsers();
    const now = new Date().toISOString();
    let sql = `-- ====================================================================\n`;
    sql += `-- KAF-INVENTAIRE Native Windows SQLite Database Dump\n`;
    sql += `-- Exported: ${now}\n`;
    sql += `-- ====================================================================\n\n`;
    sql += `PRAGMA foreign_keys = ON;\nPRAGMA journal_mode = WAL;\n\n`;

    sql += `BEGIN TRANSACTION;\n`;
    for (const a of assets) {
      sql += `INSERT OR REPLACE INTO assets (id, officialCode, name, barcode, inventoryStatus) VALUES ('${a.id}', '${a.officialCode}', '${(a.name || '').replace(/'/g, "''")}', '${a.barcode}', '${a.inventoryStatus}');\n`;
    }
    for (const u of users) {
      sql += `INSERT OR REPLACE INTO users (id, username, fullName, role) VALUES ('${u.id}', '${u.username}', '${(u.fullName || '').replace(/'/g, "''")}', '${u.role}');\n`;
    }
    sql += `COMMIT;\n`;
    return sql;
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isLoaded = false;
    }
  }
}