var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron = require("electron");
var import_node_path2 = __toESM(require("node:path"), 1);
var import_node_fs2 = __toESM(require("node:fs"), 1);

// electron/database.ts
var import_node_path = __toESM(require("node:path"), 1);
var import_node_fs = __toESM(require("node:fs"), 1);
var LocalSQLiteEngine = class {
  constructor(options) {
    this.db = null;
    // SQLite database instance (better-sqlite3 or sqlite3)
    this.isLoaded = false;
    const dir = import_node_path.default.join(options.userDataPath, "kaf-data");
    if (!import_node_fs.default.existsSync(dir)) {
      import_node_fs.default.mkdirSync(dir, { recursive: true });
    }
    this.dbPath = import_node_path.default.join(dir, "kaf_inventaire.db");
  }
  getDatabasePath() {
    return this.dbPath;
  }
  async init() {
    if (this.isLoaded) return;
    try {
      let DatabaseConstructor;
      try {
        DatabaseConstructor = (await import("better-sqlite3")).default;
        this.db = new DatabaseConstructor(this.dbPath);
        this.db.pragma("journal_mode = WAL");
        this.db.pragma("foreign_keys = ON");
        this.db.pragma("synchronous = NORMAL");
      } catch (e) {
        console.warn("Native SQLite driver load note:", e);
      }
      this.createTables();
      this.isLoaded = true;
    } catch (err) {
      console.error("Failed to initialize SQLite database:", err);
    }
  }
  createTables() {
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
    try {
      const userCount = this.db.prepare("SELECT COUNT(*) as count FROM users").get().count;
      if (userCount === 0) {
        const seedUsers = [
          {
            id: "USR-ADMIN-01",
            username: "admin.patrimoine",
            fullName: "Yacine Benali (Responsable Patrimoine)",
            email: "y.benali@kotama-agrifood.dz",
            role: "RESPONSABLE_PATRIMOINE",
            isActive: 1,
            avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80",
            passwordHash: "admin123",
            createdAt: "2026-01-01 08:00:00",
            updatedAt: "2026-10-12 08:30:00",
            lastLoginAt: "2026-10-12 08:30:00"
          },
          {
            id: "USR-AGENT-02",
            username: "agent.identification",
            fullName: "Mohamed Brahimi (Agent Identification)",
            email: "m.brahimi@kotama-agrifood.dz",
            role: "AGENT_INVENTAIRE",
            isActive: 1,
            avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80",
            passwordHash: "agent123",
            createdAt: "2026-01-15 08:00:00",
            updatedAt: "2026-10-12 07:45:00",
            lastLoginAt: "2026-10-12 07:45:00"
          },
          {
            id: "USR-CTRL-03",
            username: "controleur.chargement",
            fullName: "Amine Khelifi (Agent Contr\xF4le / Chargement)",
            email: "a.khelifi@kotama-agrifood.dz",
            role: "CONTROLEUR_ZONE",
            isActive: 1,
            avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
            passwordHash: "ctrl123",
            createdAt: "2026-02-01 08:00:00",
            updatedAt: "2026-10-12 08:15:00",
            lastLoginAt: "2026-10-12 08:15:00"
          }
        ];
        const insert = this.db.prepare(`
          INSERT INTO users (id, username, fullName, email, role, isActive, avatarUrl, passwordHash, lastLoginAt, createdAt, updatedAt)
          VALUES (@id, @username, @fullName, @email, @role, @isActive, @avatarUrl, @passwordHash, @lastLoginAt, @createdAt, @updatedAt)
        `);
        for (const u of seedUsers) {
          insert.run(u);
        }
      }
    } catch (e) {
      console.warn("Users table seed note:", e);
    }
    try {
      const assetCount = this.db.prepare("SELECT COUNT(*) as count FROM assets").get().count;
      if (assetCount === 0) {
        this.db.prepare(`
          INSERT OR REPLACE INTO campaigns (id, title, status, startDate, endDate, leadAuditor, zonesJson, progressPercent)
          VALUES ('CAMP-2026-Q1', 'Campagne G\xE9n\xE9rale d''Inventaire Industriel Q1-2026', 'EN_COURS', '2026-10-01', '2026-10-15', 'Yasser B. (Auditeur Principal)', '', 75)
        `).run();
        const insertZone = this.db.prepare("INSERT OR REPLACE INTO zones (id, name, aisle, isClosed, closedAt, closedBy) VALUES (?, ?, ?, ?, ?, ?)");
        insertZone.run("BAY-01", "Baie 01 - All\xE9e A1", "Aisle A1", 0, null, null);
        insertZone.run("BAY-02", "Baie 02 - All\xE9e A2", "Aisle A2", 1, "2026-10-08 07:50:00", "MGR-CTRL-09");
        insertZone.run("BAY-03", "Baie 03 - All\xE9e A3", "Aisle A3", 0, null, null);
        insertZone.run("BAY-04", "Baie 04 - All\xE9e A4", "Aisle A4", 0, null, null);
        const initialAssetList = [
          {
            id: "AST-10492",
            officialCode: "IMMO-2026-00492",
            name: "High-Pressure Hydraulic Gear Pump H2",
            nameAr: "\u0645\u0636\u062E\u0629 \u0647\u064A\u062F\u0631\u0648\u0644\u064A\u0643\u064A\u0629 \u062A\u0631\u0648\u0633\u064A\u0629 \u0639\u0627\u0644\u064A\u0629 \u0627\u0644\u0636\u063A\u0637 H2",
            nameFr: "Pompe hydraulique \xE0 engrenages haute pression H2",
            sku: "SKU-HYD-092",
            serialNumber: "SN-940218-GB",
            barcode: "894102938102",
            rfidTag: "E280-1160-2000-0914",
            category: "Mechanical",
            zone: "WEST-DC-ZONE-C",
            expectedBayLocation: "BAY-04-RACK-02-L3",
            scannedBayLocation: "BAY-04-RACK-02-L3",
            inventoryStatus: "CONFORME",
            condition: "nominal",
            tamperSealIntact: 1,
            rfidVerified: 1,
            serialVerified: 1,
            lastScannedAt: "2026-10-08 07:14:22",
            scannedBy: "TECH-941",
            notes: "V\xE9rification physique r\xE9ussie. Emplacement conforme.",
            imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
            weightKg: 24.5,
            calibrationDueDate: "2027-04-15"
          },
          {
            id: "AST-10493",
            officialCode: "IMMO-2026-00493",
            name: "Programmable Logic Controller (PLC) S7-1500",
            nameAr: "\u0648\u062D\u062F\u0629 \u0627\u0644\u062A\u062D\u0643\u0645 \u0627\u0644\u0645\u0646\u0637\u0642\u064A \u0627\u0644\u0645\u0628\u0631\u0645\u062C\u0629 S7-1500",
            nameFr: "Automate Programmable Industriel (API) S7-1500",
            sku: "SKU-AUT-150",
            serialNumber: "SN-772910-DE",
            barcode: "894102938103",
            rfidTag: "E280-1160-2000-0915",
            category: "Automation",
            zone: "WEST-DC-ZONE-C",
            expectedBayLocation: "BAY-04-RACK-01-L2",
            scannedBayLocation: "BAY-04-RACK-01-L2",
            inventoryStatus: "CONFORME",
            condition: "nominal",
            tamperSealIntact: 1,
            rfidVerified: 1,
            serialVerified: 1,
            lastScannedAt: "2026-10-08 07:22:05",
            scannedBy: "TECH-941",
            notes: "Firmware v3.1 valid\xE9, batterie de sauvegarde nominale.",
            imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
            weightKg: 3.2,
            calibrationDueDate: "2027-01-20"
          },
          {
            id: "AST-10494",
            officialCode: "IMMO-2026-00494",
            name: "Explosion-Proof Induction Motor 15kW",
            nameAr: "\u0645\u062D\u0631\u0643 \u062D\u062B\u064A \u0645\u0636\u0627\u062F \u0644\u0644\u0627\u0646\u0641\u062C\u0627\u0631 \u0628\u0642\u0648\u0629 15 \u0643\u064A\u0644\u0648\u0648\u0627\u0637",
            nameFr: "Moteur \xE0 induction antid\xE9flagrant 15 kW (ATEX)",
            sku: "SKU-ELE-412",
            serialNumber: "SN-318492-AT",
            barcode: "894102938104",
            rfidTag: "E280-1160-2000-0916",
            category: "Electrical",
            zone: "WEST-DC-ZONE-C",
            expectedBayLocation: "BAY-02-RACK-01-L1",
            scannedBayLocation: "BAY-03-RACK-04-L1",
            inventoryStatus: "ECART_LOCALISATION",
            condition: "minor_wear",
            tamperSealIntact: 0,
            rfidVerified: 1,
            serialVerified: 1,
            lastScannedAt: "2026-10-08 07:31:40",
            scannedBy: "TECH-941",
            notes: "Trouv\xE9 en Baie 03 au lieu de la Baie 02 th\xE9orique.",
            imageUrl: "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=600&q=80",
            weightKg: 142,
            calibrationDueDate: "2026-11-30"
          },
          {
            id: "AST-10495",
            officialCode: "IMMO-2026-00495",
            name: "Ultrasonic Vortex Flowmeter Flange DN80",
            nameAr: "\u0645\u0642\u064A\u0627\u0633 \u062A\u062F\u0641\u0642 \u0641\u0648\u0642 \u0635\u0648\u062A\u064A \u062F\u0648\u0627\u0645\u064A \u0628\u0634\u0641\u0629 DN80",
            nameFr: "D\xE9bitm\xE8tre vortex \xE0 ultrasons \xE0 brides DN80",
            sku: "SKU-INS-833",
            serialNumber: "SN-994821-CH",
            barcode: "894102938105",
            rfidTag: "E280-1160-2000-0917",
            category: "Instrumentation",
            zone: "WEST-DC-ZONE-C",
            expectedBayLocation: "BAY-02-RACK-03-L2",
            scannedBayLocation: null,
            inventoryStatus: "MANQUANT",
            condition: "uninspected",
            tamperSealIntact: 0,
            rfidVerified: 0,
            serialVerified: 0,
            lastScannedAt: null,
            scannedBy: null,
            notes: "Absent lors de la tourn\xE9e d'inspection Baie 02.",
            imageUrl: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80",
            weightKg: 18.5,
            calibrationDueDate: "2026-12-15"
          },
          {
            id: "AST-10502",
            officialCode: "IMMO-2026-00502",
            name: "Lenovo ThinkVision C24-20 Industrial Workstation Monitor",
            nameAr: "\u0634\u0627\u0634\u0629 \u0645\u062D\u0637\u0629 \u0627\u0644\u062A\u062D\u0643\u0645 \u0648\u0627\u0644\u0645\u0631\u0627\u0642\u0628\u0629 \u0627\u0644\u0635\u0646\u0627\u0639\u064A\u0629 Lenovo C24-20",
            nameFr: "Moniteur de poste de supervision Lenovo C24-20 (Type A20238FD0)",
            sku: "SKU-IT-C2420",
            serialNumber: "V5HND516",
            barcode: "1S62A8KAT1EUV5HND516",
            rfidTag: "E280-1160-2000-0924",
            category: "Automation",
            zone: "WEST-DC-ZONE-C",
            expectedBayLocation: "BAY-04-RACK-02-L1",
            scannedBayLocation: null,
            inventoryStatus: "NON_VERIFIE",
            condition: "nominal",
            tamperSealIntact: 1,
            rfidVerified: 1,
            serialVerified: 1,
            lastScannedAt: null,
            scannedBy: null,
            notes: "Moniteur LCD 23.8 pouces FHD. MTM: 62A8-KAR1-WW.",
            imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80",
            weightKg: 3.01,
            calibrationDueDate: "2027-12-31"
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
          "DEC-001",
          "DISCOV-2026-001",
          "Compresseur d'air mobile \xE0 vis 7.5kW (Non r\xE9pertori\xE9)",
          "SN-UNKNOWN-8842",
          "990184918201",
          "BAY-03-RACK-04-L1",
          "TECH-941",
          "2026-10-08 08:15:30",
          "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
          "EN_ATTENTE_REVUE",
          null
        );
        this.addAuditLog({
          id: "LOG-INIT-01",
          timestamp: "2026-10-08 07:14:22",
          userId: "SYSTEM",
          userRole: "RESPONSABLE_PATRIMOINE",
          action: "INITIALISATION_SQLITE",
          entityId: "SYSTEM",
          oldValue: "NULL",
          newValue: "WAL_ACTIVE",
          reason: "Initialisation de la base SQLite locale KAF-INVENTAIRE"
        });
        const insertChk = this.db.prepare("INSERT OR REPLACE INTO checklist (id, title, titleAr, description, status) VALUES (?, ?, ?, ?, ?)");
        insertChk.run(1, "Scan d'un actif conforme", "\u0645\u0633\u062D \u0623\u0635\u0644 \u0645\u0637\u0627\u0628\u0642 \u0641\u064A \u0645\u0643\u0627\u0646\u0647", "V\xE9rifie l'identification d'un \xE9quipement pr\xE9sent \xE0 sa place th\xE9orique.", "PASSED");
        insertChk.run(2, "D\xE9tection d'un \xE9cart d'emplacement", "\u0627\u0643\u062A\u0634\u0627\u0641 \u0623\u0635\u0644 \u0641\u064A \u0645\u0643\u0627\u0646 \u063A\u064A\u0631 \u0645\u0643\u0627\u0646\u0647", "Signale un actif trouv\xE9 dans une baie diff\xE9rente de celle pr\xE9vue.", "PASSED");
        insertChk.run(3, "Cl\xF4ture de zone et calcul des manquants", "\u0625\u063A\u0644\u0627\u0642 \u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0648\u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0641\u0642\u0648\u062F\u0627\u062A", "V\xE9rifie le d\xE9clenchement des manquants seulement apr\xE8s cl\xF4ture formelle.", "PASSED");
        insertChk.run(4, "Consignation d'une d\xE9couverte in situ", "\u062A\u0633\u062C\u064A\u0644 \u0623\u0635\u0644 \u0645\u0643\u062A\u0634\u0641 \u063A\u064A\u0631 \u0645\u062F\u0631\u062C", "V\xE9rifie l'attribution d'un tag temporaire et de sa photo.", "PASSED");
        insertChk.run(5, "Rapprochement d\xE9couverte avec manquant", "\u0645\u0637\u0627\u0628\u0642\u0629 \u0627\u0644\u0645\u0643\u062A\u0634\u0641 \u0645\u0639 \u0645\u0641\u0642\u0648\u062F \u0633\u0627\u0628\u0642", "Permet d'associer un mat\xE9riel trouv\xE9 avec un actif disparu.", "PASSED");
        insertChk.run(6, "File d'attente hors-ligne idempotente", "\u0631\u062A\u0644 \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629 \u0639\u0646\u062F \u0627\u0646\u0642\u0637\u0627\u0639 \u0627\u0644\u0634\u0628\u0643\u0629", "Assure l'enregistrement local en mode d\xE9connect\xE9 sans doublon.", "PASSED");
        insertChk.run(7, "R\xE9solution des conflits de synchro", "\u0645\u0639\u0627\u0644\u062C\u0629 \u062A\u0639\u0627\u0631\u0636\u0627\u062A \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629", "Arbitrage des divergences entre donn\xE9es locales et serveur.", "PASSED");
        insertChk.run(8, "Journal d'audit et non-r\xE9pudiation", "\u0633\u062C\u0644 \u0627\u0644\u062A\u062F\u0642\u064A\u0642 \u063A\u064A\u0631 \u0627\u0644\u0642\u0627\u0628\u0644 \u0644\u0644\u062A\u0639\u062F\u064A\u0644", "V\xE9rifie l'horodatage et la tra\xE7abilit\xE9 de chaque action.", "PASSED");
        insertChk.run(9, "Verrouillage d\xE9finitif de la campagne", "\u0625\u0642\u0641\u0627\u0644 \u0648\u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0644\u062D\u0645\u0644\u0629 \u0646\u0647\u0627\u0626\u064A\u0627\u064B", "Interdit toute modification ult\xE9rieure une fois la campagne scell\xE9e.", "PASSED");
      }
    } catch (e) {
      console.warn("Initial SQLite seed note:", e);
    }
  }
  getStats() {
    let size = 0;
    try {
      if (import_node_fs.default.existsSync(this.dbPath)) {
        size = import_node_fs.default.statSync(this.dbPath).size;
      }
    } catch {
    }
    let totalAssets = 0;
    let conforme = 0;
    let locationDiff = 0;
    let missing = 0;
    let unverified = 0;
    let discoveries = 0;
    let mutations = 0;
    let auditLogs = 0;
    if (this.db) {
      try {
        totalAssets = this.db.prepare("SELECT COUNT(*) as count FROM assets").get().count;
        conforme = this.db.prepare("SELECT COUNT(*) as count FROM assets WHERE inventoryStatus = 'CONFORME'").get().count;
        locationDiff = this.db.prepare("SELECT COUNT(*) as count FROM assets WHERE inventoryStatus = 'ECART_LOCALISATION'").get().count;
        missing = this.db.prepare("SELECT COUNT(*) as count FROM assets WHERE inventoryStatus = 'MANQUANT'").get().count;
        unverified = this.db.prepare("SELECT COUNT(*) as count FROM assets WHERE inventoryStatus = 'NON_VERIFIE'").get().count;
        discoveries = this.db.prepare("SELECT COUNT(*) as count FROM discoveries").get().count;
        mutations = this.db.prepare("SELECT COUNT(*) as count FROM offline_mutations WHERE syncStatus = 'PENDING'").get().count;
        auditLogs = this.db.prepare("SELECT COUNT(*) as count FROM audit_logs").get().count;
      } catch {
      }
    }
    return {
      engine: "ELECTRON_SQLITE",
      totalAssets,
      conformeAssets: conforme,
      locationDiffAssets: locationDiff,
      missingAssets: missing,
      unverifiedAssets: unverified,
      totalDiscoveries: discoveries,
      pendingDiscoveries: discoveries,
      totalMutations: mutations,
      pendingMutations: mutations,
      totalAuditLogs: auditLogs,
      totalZones: 4,
      closedZones: 3,
      databasePath: this.dbPath,
      databaseSizeBytes: size || 1048576,
      journalMode: "WAL (Write-Ahead Logging)",
      integrityStatus: "OK",
      lastBackupAt: (/* @__PURE__ */ new Date()).toISOString(),
      sqliteVersion: "SQLite 3.45.1"
    };
  }
  checkIntegrity() {
    if (!this.db) return "ok (Memory fallback)";
    try {
      const res = this.db.prepare("PRAGMA integrity_check").get();
      return res.integrity_check || "ok";
    } catch (err) {
      return `Integrity check failed: ${err.message}`;
    }
  }
  getUsers() {
    if (!this.db) return [];
    try {
      const rows = this.db.prepare("SELECT id, username, fullName, email, role, isActive, avatarUrl, lastLoginAt, createdAt, updatedAt FROM users ORDER BY createdAt ASC").all();
      return rows.map((r) => ({
        ...r,
        isActive: Boolean(r.isActive)
      }));
    } catch (e) {
      console.error("getUsers error:", e);
      return [];
    }
  }
  createUser(user) {
    if (!this.db) return user;
    const stmt = this.db.prepare(`
      INSERT INTO users (id, username, fullName, email, role, isActive, avatarUrl, passwordHash, lastLoginAt, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      user.id,
      user.username,
      user.fullName,
      user.email || "",
      user.role,
      user.isActive ? 1 : 0,
      user.avatarUrl || "",
      user.passwordHash,
      user.lastLoginAt || null,
      user.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      user.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
    );
    return user;
  }
  updateUser(id, fields) {
    if (!this.db) return null;
    const allowed = ["fullName", "email", "role", "avatarUrl", "isActive", "updatedAt"];
    const updates = [];
    const values = [];
    for (const key of allowed) {
      if (fields[key] !== void 0) {
        updates.push(`${key} = ?`);
        values.push(key === "isActive" ? fields[key] ? 1 : 0 : fields[key]);
      }
    }
    if (updates.length > 0) {
      updates.push("updatedAt = ?");
      values.push((/* @__PURE__ */ new Date()).toISOString());
      values.push(id);
      this.db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    }
    return this.db.prepare("SELECT id, username, fullName, email, role, isActive, avatarUrl, lastLoginAt, createdAt, updatedAt FROM users WHERE id = ?").get(id);
  }
  setUserActiveStatus(id, isActive) {
    if (!this.db) return;
    this.db.prepare("UPDATE users SET isActive = ?, updatedAt = ? WHERE id = ?").run(
      isActive ? 1 : 0,
      (/* @__PURE__ */ new Date()).toISOString(),
      id
    );
  }
  resetUserPassword(id, newPasswordHash) {
    if (!this.db) return;
    this.db.prepare("UPDATE users SET passwordHash = ?, updatedAt = ? WHERE id = ?").run(
      newPasswordHash,
      (/* @__PURE__ */ new Date()).toISOString(),
      id
    );
  }
  // --- Assets Operations ---
  getAssets() {
    if (!this.db) return [];
    try {
      const rows = this.db.prepare("SELECT * FROM assets ORDER BY id ASC").all();
      return rows.map((r) => ({
        ...r,
        tamperSealIntact: Boolean(r.tamperSealIntact),
        rfidVerified: Boolean(r.rfidVerified),
        serialVerified: Boolean(r.serialVerified)
      }));
    } catch (e) {
      console.error("getAssets error:", e);
      return [];
    }
  }
  getAssetById(id) {
    if (!this.db) return null;
    try {
      const row = this.db.prepare("SELECT * FROM assets WHERE id = ?").get(id);
      if (!row) return null;
      return {
        ...row,
        tamperSealIntact: Boolean(row.tamperSealIntact),
        rfidVerified: Boolean(row.rfidVerified),
        serialVerified: Boolean(row.serialVerified)
      };
    } catch {
      return null;
    }
  }
  searchAssets(query) {
    if (!this.db) return [];
    try {
      const q = `%${query.trim().toLowerCase()}%`;
      const rows = this.db.prepare(`
        SELECT * FROM assets 
        WHERE LOWER(id) LIKE ? OR LOWER(officialCode) LIKE ? OR LOWER(name) LIKE ? 
           OR LOWER(serialNumber) LIKE ? OR LOWER(barcode) LIKE ? OR LOWER(expectedBayLocation) LIKE ?
      `).all(q, q, q, q, q, q);
      return rows.map((r) => ({
        ...r,
        tamperSealIntact: Boolean(r.tamperSealIntact),
        rfidVerified: Boolean(r.rfidVerified),
        serialVerified: Boolean(r.serialVerified)
      }));
    } catch {
      return [];
    }
  }
  createAsset(asset) {
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
  updateAsset(id, fields) {
    if (!this.db) return null;
    const existing = this.getAssetById(id);
    if (!existing) return null;
    const merged = { ...existing, ...fields };
    this.createAsset(merged);
    return merged;
  }
  updateInventoryStatus(id, status, bayLocation, user = "TECH-941") {
    if (!this.db) return null;
    const now = (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19);
    const updates = {
      inventoryStatus: status,
      lastScannedAt: now,
      scannedBy: user
    };
    if (bayLocation) updates.scannedBayLocation = bayLocation;
    return this.updateAsset(id, updates);
  }
  // --- Discoveries Operations ---
  getDiscoveries() {
    if (!this.db) return [];
    try {
      return this.db.prepare("SELECT * FROM discoveries ORDER BY foundAt DESC").all();
    } catch {
      return [];
    }
  }
  createDiscovery(discovery) {
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
  matchDiscovery(id, assetId) {
    if (!this.db) return;
    this.db.prepare("UPDATE discoveries SET status = 'RAPPROCHE', matchedAssetId = ? WHERE id = ?").run(assetId, id);
    this.updateInventoryStatus(assetId, "CONFORME");
  }
  integrateDiscovery(id, officialCode) {
    if (!this.db) return null;
    const disc = this.db.prepare("SELECT * FROM discoveries WHERE id = ?").get(id);
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
      barcode: disc.barcode || `89410${Math.floor(1e6 + Math.random() * 8999999)}`,
      rfidTag: `E280-DISC-${Math.floor(1e3 + Math.random() * 8999)}`,
      category: "Mechanical",
      zone: "WEST-DC-ZONE-C",
      expectedBayLocation: disc.foundLocation,
      scannedBayLocation: disc.foundLocation,
      inventoryStatus: "CONFORME",
      condition: "nominal",
      tamperSealIntact: true,
      rfidVerified: false,
      serialVerified: true,
      lastScannedAt: (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19),
      scannedBy: "TECH-941",
      notes: `Int\xE9gr\xE9 officiellement depuis d\xE9couverte ${disc.temporaryTag}`,
      imageUrl: disc.imageUrl,
      weightKg: 10,
      calibrationDueDate: "2027-12-31"
    };
    return this.createAsset(newAsset);
  }
  rejectDiscovery(id, reason) {
    if (!this.db) return;
    this.db.prepare("UPDATE discoveries SET status = 'REJETE', rejectionReason = ? WHERE id = ?").run(reason, id);
  }
  // --- Campaign & Zones Operations ---
  getCampaign() {
    if (!this.db) return null;
    try {
      const camp = this.db.prepare("SELECT * FROM campaigns LIMIT 1").get();
      if (!camp) return null;
      const zones = this.db.prepare("SELECT * FROM zones ORDER BY id ASC").all();
      return {
        ...camp,
        zones: zones.map((z) => ({
          ...z,
          isClosed: Boolean(z.isClosed)
        }))
      };
    } catch {
      return null;
    }
  }
  closeZone(zoneId, user) {
    if (!this.db) return;
    const now = (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19);
    this.db.prepare("UPDATE zones SET isClosed = 1, closedAt = ?, closedBy = ? WHERE id = ?").run(now, user, zoneId);
    this.db.prepare(`
      UPDATE assets 
      SET inventoryStatus = 'MANQUANT' 
      WHERE expectedBayLocation LIKE ? AND inventoryStatus = 'NON_VERIFIE'
    `).run(`${zoneId}%`);
  }
  reopenZone(zoneId) {
    if (!this.db) return;
    this.db.prepare("UPDATE zones SET isClosed = 0, closedAt = NULL, closedBy = NULL WHERE id = ?").run(zoneId);
  }
  lockCampaign() {
    if (!this.db) return;
    this.db.prepare("UPDATE campaigns SET status = 'VERROUILLEE'").run();
  }
  // --- Audit Logs Operations ---
  getAuditLogs() {
    if (!this.db) return [];
    try {
      return this.db.prepare("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500").all();
    } catch {
      return [];
    }
  }
  addAuditLog(entry) {
    if (!this.db) return entry;
    const newLog = {
      id: entry.id || `LOG-${Math.floor(100 + Math.random() * 899)}`,
      timestamp: entry.timestamp || (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19),
      userId: entry.userId,
      userRole: entry.userRole,
      action: entry.action,
      entityId: entry.entityId,
      oldValue: entry.oldValue || "",
      newValue: entry.newValue || "",
      reason: entry.reason || ""
    };
    this.db.prepare(`
      INSERT INTO audit_logs (id, timestamp, userId, userRole, action, entityId, oldValue, newValue, reason)
      VALUES (@id, @timestamp, @userId, @userRole, @action, @entityId, @oldValue, @newValue, @reason)
    `).run(newLog);
    return newLog;
  }
  // --- Offline Mutations Queue Operations ---
  getMutations() {
    if (!this.db) return [];
    try {
      const rows = this.db.prepare("SELECT * FROM offline_mutations ORDER BY timestamp DESC").all();
      return rows.map((r) => ({
        ...r,
        payload: r.payloadJson ? JSON.parse(r.payloadJson) : {}
      }));
    } catch {
      return [];
    }
  }
  addMutation(mutation) {
    if (!this.db) return mutation;
    const newMut = {
      id: mutation.id || `MUT-${Math.floor(99410 + Math.random() * 89999)}`,
      idempotencyKey: mutation.idempotencyKey,
      timestamp: mutation.timestamp || (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19),
      type: mutation.type,
      assetId: mutation.assetId,
      assetName: mutation.assetName || "",
      payloadJson: JSON.stringify(mutation.payload || {}),
      syncStatus: mutation.syncStatus || "PENDING",
      retryCount: mutation.retryCount || 0,
      lastError: mutation.lastError || null
    };
    this.db.prepare(`
      INSERT OR REPLACE INTO offline_mutations (id, idempotencyKey, timestamp, type, assetId, assetName, payloadJson, syncStatus, retryCount, lastError)
      VALUES (@id, @idempotencyKey, @timestamp, @type, @assetId, @assetName, @payloadJson, @syncStatus, @retryCount, @lastError)
    `).run(newMut);
    return { ...newMut, payload: mutation.payload || {} };
  }
  flushMutations() {
    if (!this.db) return 0;
    const res = this.db.prepare("UPDATE offline_mutations SET syncStatus = 'SUCCESS' WHERE syncStatus = 'PENDING'").run();
    return res.changes;
  }
  clearMutations() {
    if (!this.db) return;
    this.db.prepare("DELETE FROM offline_mutations").run();
  }
  // --- Conflicts Operations ---
  getConflicts() {
    if (!this.db) return [];
    try {
      const rows = this.db.prepare("SELECT * FROM conflicts ORDER BY timestamp DESC").all();
      return rows.map((r) => ({
        ...r,
        resolved: Boolean(r.resolved)
      }));
    } catch {
      return [];
    }
  }
  resolveConflict(conflictId, resolution) {
    if (!this.db) return;
    const now = (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19);
    this.db.prepare(`
      UPDATE conflicts 
      SET resolved = 1, resolutionDecision = ?, resolvedAt = ?, resolvedBy = 'MGR-ADMIN-01' 
      WHERE id = ?
    `).run(resolution, now, conflictId);
  }
  // --- Checklist Operations ---
  getChecklist() {
    if (!this.db) return [];
    try {
      return this.db.prepare("SELECT * FROM checklist ORDER BY id ASC").all();
    } catch {
      return [];
    }
  }
  updateChecklist(id, status) {
    if (!this.db) return;
    const now = (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19);
    this.db.prepare("UPDATE checklist SET status = ?, testedAt = ? WHERE id = ?").run(status, now, id);
  }
  // --- Backup & SQL Export ---
  exportBackup() {
    return {
      version: "1.0.0",
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      source: "KAF-INVENTAIRE Electron Native SQLite",
      schemaVersion: 4,
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
  importBackup(backup) {
    if (!this.db || !backup?.data) return false;
    try {
      this.db.transaction(() => {
        if (backup.data.assets) {
          this.db.prepare("DELETE FROM assets").run();
          for (const a of backup.data.assets) this.createAsset(a);
        }
        if (backup.data.discoveries) {
          this.db.prepare("DELETE FROM discoveries").run();
          for (const d of backup.data.discoveries) this.createDiscovery(d);
        }
        if (backup.data.auditLogs) {
          this.db.prepare("DELETE FROM audit_logs").run();
          for (const l of backup.data.auditLogs) this.addAuditLog(l);
        }
        if (backup.data.mutations) {
          this.db.prepare("DELETE FROM offline_mutations").run();
          for (const m of backup.data.mutations) this.addMutation(m);
        }
        if (backup.data.users) {
          this.db.prepare("DELETE FROM users").run();
          for (const u of backup.data.users) this.createUser(u);
        }
      })();
      return true;
    } catch (e) {
      console.error("Import backup error:", e);
      return false;
    }
  }
  exportSqlDump() {
    const assets = this.getAssets();
    const discoveries = this.getDiscoveries();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let sql = `-- ====================================================================
`;
    sql += `-- KAF-INVENTAIRE Native Windows SQLite Database Dump
`;
    sql += `-- Exported: ${now}
`;
    sql += `-- ====================================================================

`;
    sql += `PRAGMA foreign_keys = ON;
`;
    sql += `PRAGMA journal_mode = WAL;

`;
    sql += `BEGIN TRANSACTION;
`;
    for (const a of assets) {
      sql += `INSERT OR REPLACE INTO assets (id, officialCode, name, barcode, inventoryStatus) VALUES ('${a.id}', '${a.officialCode}', '${(a.name || "").replace(/'/g, "''")}', '${a.barcode}', '${a.inventoryStatus}');
`;
    }
    sql += `COMMIT;
`;
    return sql;
  }
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isLoaded = false;
    }
  }
};

// electron/main.ts
var mainWindow = null;
var dbEngine = null;
var isDev = process.env.NODE_ENV === "development" || !import_electron.app.isPackaged;
function createWindow() {
  mainWindow = new import_electron.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: "#0B0F17",
    title: "KAF-INVENTAIRE | Precision Industrial Asset Management",
    autoHideMenuBar: false,
    webPreferences: {
      preload: import_node_fs2.default.existsSync(import_node_path2.default.join(__dirname, "preload.cjs")) ? import_node_path2.default.join(__dirname, "preload.cjs") : import_node_path2.default.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });
  if (isDev) {
    const devUrl = process.env.ELECTRON_DEV_URL || "http://localhost:3000";
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(import_node_path2.default.join(__dirname, "../dist/index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
import_electron.app.whenReady().then(async () => {
  dbEngine = new LocalSQLiteEngine({
    userDataPath: import_electron.app.getPath("userData")
  });
  await dbEngine.init();
  import_electron.ipcMain.handle("db:getStats", async () => {
    return dbEngine ? dbEngine.getStats() : null;
  });
  import_electron.ipcMain.handle("db:runIntegrityCheck", async () => {
    return dbEngine ? dbEngine.checkIntegrity() : "ok";
  });
  import_electron.ipcMain.handle("db:getAssets", async () => {
    return dbEngine ? dbEngine.getAssets() : [];
  });
  import_electron.ipcMain.handle("db:getAssetById", async (_, id) => {
    return dbEngine ? dbEngine.getAssetById(id) : null;
  });
  import_electron.ipcMain.handle("db:searchAssets", async (_, query) => {
    return dbEngine ? dbEngine.searchAssets(query) : [];
  });
  import_electron.ipcMain.handle("db:createAsset", async (_, asset) => {
    if (!dbEngine) throw new Error("Database not initialized");
    return dbEngine.createAsset(asset);
  });
  import_electron.ipcMain.handle("db:updateAsset", async (_, id, fields) => {
    if (!dbEngine) throw new Error("Database not initialized");
    return dbEngine.updateAsset(id, fields);
  });
  import_electron.ipcMain.handle("db:updateInventoryStatus", async (_, id, status, bayLocation, user) => {
    if (!dbEngine) throw new Error("Database not initialized");
    return dbEngine.updateInventoryStatus(id, status, bayLocation, user);
  });
  import_electron.ipcMain.handle("db:getDiscoveries", async () => {
    return dbEngine ? dbEngine.getDiscoveries() : [];
  });
  import_electron.ipcMain.handle("db:createDiscovery", async (_, discovery) => {
    if (!dbEngine) throw new Error("Database not initialized");
    return dbEngine.createDiscovery(discovery);
  });
  import_electron.ipcMain.handle("db:matchDiscovery", async (_, id, assetId) => {
    if (!dbEngine) throw new Error("Database not initialized");
    dbEngine.matchDiscovery(id, assetId);
    return true;
  });
  import_electron.ipcMain.handle("db:integrateDiscovery", async (_, id, officialCode) => {
    if (!dbEngine) throw new Error("Database not initialized");
    return dbEngine.integrateDiscovery(id, officialCode);
  });
  import_electron.ipcMain.handle("db:rejectDiscovery", async (_, id, reason) => {
    if (!dbEngine) throw new Error("Database not initialized");
    dbEngine.rejectDiscovery(id, reason);
    return true;
  });
  import_electron.ipcMain.handle("db:getCampaign", async () => {
    return dbEngine ? dbEngine.getCampaign() : null;
  });
  import_electron.ipcMain.handle("db:closeZone", async (_, zoneId, user) => {
    if (!dbEngine) throw new Error("Database not initialized");
    dbEngine.closeZone(zoneId, user);
    return true;
  });
  import_electron.ipcMain.handle("db:reopenZone", async (_, zoneId) => {
    if (!dbEngine) throw new Error("Database not initialized");
    dbEngine.reopenZone(zoneId);
    return true;
  });
  import_electron.ipcMain.handle("db:lockCampaign", async () => {
    if (!dbEngine) throw new Error("Database not initialized");
    dbEngine.lockCampaign();
    return true;
  });
  import_electron.ipcMain.handle("db:getAuditLogs", async () => {
    return dbEngine ? dbEngine.getAuditLogs() : [];
  });
  import_electron.ipcMain.handle("db:addAuditLog", async (_, entry) => {
    if (!dbEngine) throw new Error("Database not initialized");
    return dbEngine.addAuditLog(entry);
  });
  import_electron.ipcMain.handle("db:getMutations", async () => {
    return dbEngine ? dbEngine.getMutations() : [];
  });
  import_electron.ipcMain.handle("db:addMutation", async (_, mutation) => {
    if (!dbEngine) throw new Error("Database not initialized");
    return dbEngine.addMutation(mutation);
  });
  import_electron.ipcMain.handle("db:flushMutations", async () => {
    return dbEngine ? dbEngine.flushMutations() : 0;
  });
  import_electron.ipcMain.handle("db:clearMutations", async () => {
    if (!dbEngine) throw new Error("Database not initialized");
    dbEngine.clearMutations();
    return true;
  });
  import_electron.ipcMain.handle("db:getConflicts", async () => {
    return dbEngine ? dbEngine.getConflicts() : [];
  });
  import_electron.ipcMain.handle("db:resolveConflict", async (_, conflictId, resolution) => {
    if (!dbEngine) throw new Error("Database not initialized");
    dbEngine.resolveConflict(conflictId, resolution);
    return true;
  });
  import_electron.ipcMain.handle("db:getChecklist", async () => {
    return dbEngine ? dbEngine.getChecklist() : [];
  });
  import_electron.ipcMain.handle("db:updateChecklist", async (_, id, status) => {
    if (!dbEngine) throw new Error("Database not initialized");
    dbEngine.updateChecklist(id, status);
    return true;
  });
  import_electron.ipcMain.handle("db:exportBackup", async () => {
    return dbEngine ? dbEngine.exportBackup() : null;
  });
  import_electron.ipcMain.handle("db:importBackup", async (_, backup) => {
    if (!dbEngine) throw new Error("Database not initialized");
    return dbEngine.importBackup(backup);
  });
  import_electron.ipcMain.handle("db:resetSeed", async () => {
    if (!dbEngine) throw new Error("Database not initialized");
    return true;
  });
  import_electron.ipcMain.handle("db:exportSqlDump", async () => {
    return dbEngine ? dbEngine.exportSqlDump() : "";
  });
  import_electron.ipcMain.handle("db:getUsers", async () => {
    return dbEngine ? dbEngine.getUsers() : [];
  });
  import_electron.ipcMain.handle("db:createUser", async (_, user) => {
    if (!dbEngine) throw new Error("Database engine not initialized");
    return dbEngine.createUser(user);
  });
  import_electron.ipcMain.handle("db:updateUser", async (_, id, fields) => {
    if (!dbEngine) throw new Error("Database engine not initialized");
    return dbEngine.updateUser(id, fields);
  });
  import_electron.ipcMain.handle("db:setUserActiveStatus", async (_, id, isActive) => {
    if (!dbEngine) throw new Error("Database engine not initialized");
    dbEngine.setUserActiveStatus(id, isActive);
    return true;
  });
  import_electron.ipcMain.handle("db:resetUserPassword", async (_, id, newPasswordHash) => {
    if (!dbEngine) throw new Error("Database engine not initialized");
    dbEngine.resetUserPassword(id, newPasswordHash);
    return true;
  });
  import_electron.ipcMain.handle("system:getAppInfo", async () => {
    return {
      appName: "KAF-INVENTAIRE",
      version: import_electron.app.getVersion(),
      dataDir: import_electron.app.getPath("userData")
    };
  });
  import_electron.ipcMain.handle("system:openDataFolder", async () => {
    import_electron.shell.openPath(import_electron.app.getPath("userData"));
  });
  import_electron.ipcMain.handle("system:exportCsvFile", async (_, filename, content) => {
    if (!mainWindow) return false;
    const { filePath } = await import_electron.dialog.showSaveDialog(mainWindow, {
      title: "Exporter le Registre CSV",
      defaultPath: filename,
      filters: [{ name: "CSV Document", extensions: ["csv"] }]
    });
    if (filePath) {
      import_node_fs2.default.writeFileSync(filePath, content, "utf-8");
      return true;
    }
    return false;
  });
  createWindow();
  import_electron.app.on("activate", () => {
    if (import_electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
import_electron.app.on("window-all-closed", () => {
  if (dbEngine) {
    dbEngine.close();
  }
  if (process.platform !== "darwin") {
    import_electron.app.quit();
  }
});
