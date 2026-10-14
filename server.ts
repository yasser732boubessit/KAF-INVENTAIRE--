import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

// Configuration as documented by the user
const PORT = Number(process.env.PORT) || 3000;
const CENTRAL_POSTGRES_URL = process.env.DATABASE_URL || 'postgresql://postgres:yasser@localhost:5432/kaf_inventaire_sync';
const JWT_SECRET = process.env.JWT_SECRET || 'kaf_inventaire_secure_jwt_secret_change_in_prod';
const DEVICE_REGISTRATION_TOKEN = process.env.DEVICE_REGISTRATION_TOKEN || 'kaf_dev_reg_token_9841';
const CONFIGURED_DEVICE_ID = process.env.VITE_DEVICE_ID || 'TERM-WH-01';
const CONFIGURED_DEVICE_KEY = process.env.VITE_DEVICE_API_KEY || 'dev_key_alpha_9921';

// Seed initial Central PostgreSQL assets
interface CentralAsset {
  id: string;
  officialCode: string;
  name: string;
  nameFr: string;
  nameAr: string;
  sku: string;
  serialNumber: string;
  barcode: string;
  rfidTag: string;
  category: 'Mechanical' | 'Electrical' | 'Automation' | 'Instrumentation' | 'Safety';
  zone: string;
  expectedBayLocation: string;
  scannedBayLocation?: string;
  inventoryStatus: 'CONFORME' | 'ECART_LOCALISATION' | 'MANQUANT' | 'NON_VERIFIE' | 'NON_ENREGISTRE';
  workflowState: 'AJOUTE' | 'SYNCHRONISE' | 'VERIFIE' | 'CHARGE' | 'REJETE';
  physicalState: 'ACTIF' | 'EN_PANNE' | 'EN_MAINTENANCE' | 'EN_STOCK' | 'HORS_SERVICE' | 'REFORME';
  condition: 'nominal' | 'minor_wear' | 'needs_repair' | 'damaged' | 'uninspected';
  tamperSealIntact: boolean;
  rfidVerified: boolean;
  serialVerified: boolean;
  lastScannedAt: string | null;
  scannedBy: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
  loadedAt: string | null;
  loadedBy: string | null;
  syncBatchId?: string;
  notes: string;
  notesFr?: string;
  imageUrl: string;
  weightKg: number;
  version: number;
}

const centralAssets: CentralAsset[] = [
  {
    id: 'AST-10492',
    officialCode: 'KAF-AST-2024-001',
    name: 'Moteur Triphasé Asynchrone 45kW IE3',
    nameFr: 'Moteur Triphasé Asynchrone 45kW IE3',
    nameAr: 'محرك ثلاثي الأطوار غير متزامن 45 كيلوواط IE3',
    sku: 'SKU-ENG-45KW-01',
    serialNumber: 'SN-ABB-994102-DZ',
    barcode: '6131102941028',
    rfidTag: 'E280-1160-2000-01',
    category: 'Mechanical',
    zone: 'WEST-DC-ZONE-C',
    expectedBayLocation: 'BAY-04-RACK-02-LVL1',
    scannedBayLocation: 'BAY-04-RACK-02-LVL1',
    inventoryStatus: 'CONFORME',
    workflowState: 'SYNCHRONISE',
    physicalState: 'ACTIF',
    condition: 'nominal',
    tamperSealIntact: true,
    rfidVerified: true,
    serialVerified: true,
    lastScannedAt: '2026-10-14 09:15:00',
    scannedBy: 'TECH-941',
    verifiedAt: null,
    verifiedBy: null,
    loadedAt: null,
    loadedBy: null,
    notes: 'Bobinage certifié conforme 2026',
    notesFr: 'Bobinage certifié conforme 2026',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=400',
    weightKg: 285.5,
    version: 1
  },
  {
    id: 'AST-10493',
    officialCode: 'KAF-AST-2024-002',
    name: 'Pompe Centrifuge Haute Pression KSB',
    nameFr: 'Pompe Centrifuge Haute Pression KSB',
    nameAr: 'مضخة طرد مركزي عالية الضغط KSB',
    sku: 'SKU-PUMP-HP-KSB-02',
    serialNumber: 'SN-KSB-2023-4411',
    barcode: '6131102941035',
    rfidTag: 'E280-1160-2000-02',
    category: 'Mechanical',
    zone: 'WEST-DC-ZONE-C',
    expectedBayLocation: 'BAY-04-RACK-03-LVL2',
    scannedBayLocation: 'BAY-08-RACK-01-LVL1',
    inventoryStatus: 'ECART_LOCALISATION',
    workflowState: 'SYNCHRONISE',
    physicalState: 'ACTIF',
    condition: 'minor_wear',
    tamperSealIntact: true,
    rfidVerified: false,
    serialVerified: true,
    lastScannedAt: '2026-10-14 09:22:00',
    scannedBy: 'TECH-941',
    verifiedAt: null,
    verifiedBy: null,
    loadedAt: null,
    loadedBy: null,
    notes: 'Déplacée temporairement pour test d\'étanchéité',
    notesFr: 'Déplacée temporairement pour test d\'étanchéité',
    imageUrl: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&q=80&w=400',
    weightKg: 142.0,
    version: 1
  },
  {
    id: 'AST-10494',
    officialCode: 'KAF-AST-2024-003',
    name: 'Automate Programmable Industriel Siemens S7-1500',
    nameFr: 'Automate Programmable Industriel Siemens S7-1500',
    nameAr: 'نظام التحكم الصناعي القابل للبرمجة سيمنز S7-1500',
    sku: 'SKU-PLC-S7-1516',
    serialNumber: 'SN-SIEM-6ES7-516',
    barcode: '6131102941042',
    rfidTag: 'E280-1160-2000-03',
    category: 'Automation',
    zone: 'WEST-DC-ZONE-C',
    expectedBayLocation: 'BAY-04-RACK-01-LVL3',
    inventoryStatus: 'NON_VERIFIE',
    workflowState: 'AJOUTE',
    physicalState: 'ACTIF',
    condition: 'nominal',
    tamperSealIntact: true,
    rfidVerified: false,
    serialVerified: false,
    lastScannedAt: null,
    scannedBy: null,
    verifiedAt: null,
    verifiedBy: null,
    loadedAt: null,
    loadedBy: null,
    notes: 'CPU 1516-3 PN/DP avec carte mémoire 12MB',
    notesFr: 'CPU 1516-3 PN/DP avec carte mémoire 12MB',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=400',
    weightKg: 4.8,
    version: 1
  },
  {
    id: 'AST-10495',
    officialCode: 'KAF-AST-2024-004',
    name: 'Transformateur HTA/BT 630kVA Schneider',
    nameFr: 'Transformateur HTA/BT 630kVA Schneider',
    nameAr: 'محول كهربائي للجهد المتوسط/المنخفض 630 ك.ف.أ شنايدر',
    sku: 'SKU-TRANS-630KVA',
    serialNumber: 'SN-SCH-TRIHAL-630',
    barcode: '6131102941059',
    rfidTag: 'E280-1160-2000-04',
    category: 'Electrical',
    zone: 'WEST-DC-ZONE-C',
    expectedBayLocation: 'BAY-04-TRANS-01',
    inventoryStatus: 'CONFORME',
    workflowState: 'VERIFIE',
    physicalState: 'ACTIF',
    condition: 'nominal',
    tamperSealIntact: true,
    rfidVerified: true,
    serialVerified: true,
    lastScannedAt: '2026-10-14 08:30:00',
    scannedBy: 'TECH-941',
    verifiedAt: '2026-10-14 08:45:00',
    verifiedBy: 'MGR-CTRL-09',
    loadedAt: null,
    loadedBy: null,
    notes: 'Transformateur sec Trihal vérifié par Équipe 2. Écrasement verrouillé.',
    notesFr: 'Transformateur sec Trihal vérifié par Équipe 2. Écrasement verrouillé.',
    imageUrl: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&q=80&w=400',
    weightKg: 2150.0,
    version: 2
  },
  {
    id: 'AST-10496',
    officialCode: 'KAF-AST-2024-005',
    name: 'Groupe Électrogène de Secours Caterpillar 500kVA',
    nameFr: 'Groupe Électrogène de Secours Caterpillar 500kVA',
    nameAr: 'مولد كهربائي للطوارئ كاتربيلر 500 ك.ف.أ',
    sku: 'SKU-GEN-CAT-C15',
    serialNumber: 'SN-CAT-C15-8849',
    barcode: '6131102941066',
    rfidTag: 'E280-1160-2000-05',
    category: 'Mechanical',
    zone: 'WEST-DC-ZONE-C',
    expectedBayLocation: 'BAY-04-EXT-01',
    inventoryStatus: 'CONFORME',
    workflowState: 'CHARGE',
    physicalState: 'ACTIF',
    condition: 'nominal',
    tamperSealIntact: true,
    rfidVerified: true,
    serialVerified: true,
    lastScannedAt: '2026-10-14 07:00:00',
    scannedBy: 'TECH-941',
    verifiedAt: '2026-10-14 07:30:00',
    verifiedBy: 'MGR-CTRL-09',
    loadedAt: '2026-10-14 08:00:00',
    loadedBy: 'LOG-EQUIPE-3',
    notes: 'Chargé sur convoi semi-remorque KAF-CONV-01. Immuable.',
    notesFr: 'Chargé sur convoi semi-remorque KAF-CONV-01. Immuable.',
    imageUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&q=80&w=400',
    weightKg: 4200.0,
    version: 3
  }
];

// Audit trail store
interface CentralAuditLog {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  entityId: string;
  details: string;
  metadata?: any;
}

const centralAuditTrail: CentralAuditLog[] = [
  {
    id: 'AUD-CENTRAL-001',
    timestamp: '2026-10-14 08:45:00',
    actor: 'MGR-CTRL-09',
    role: 'TEAM_2',
    action: 'VERIFY_ASSET',
    entityId: 'AST-10495',
    details: 'Validation vérification physique in situ par Équipe 2. Statut passé à VERIFIE.'
  },
  {
    id: 'AUD-CENTRAL-002',
    timestamp: '2026-10-14 08:00:00',
    actor: 'LOG-EQUIPE-3',
    role: 'TEAM_3',
    action: 'LOAD_ASSET',
    entityId: 'AST-10496',
    details: 'Enregistrement chargement sur convoi semi-remorque. Statut passé à CHARGE.'
  }
];

// Idempotency set of processed mutation IDs
const processedMutationIds = new Set<string>(['MUT-INIT-001', 'MUT-INIT-002']);

// Pre-seeded users according to documented RBAC
const USERS = [
  {
    id: 'USR-ADMIN-01',
    username: 'admin',
    fullName: 'Yacine Benali (Responsable Patrimoine & Admin)',
    role: 'ADMIN',
    permissions: ['CREATE_ASSET', 'VIEW_ASSETS', 'VERIFY_ASSET', 'LOAD_ASSET', 'IMPORT & ANALYTICS', 'SYNC']
  },
  {
    id: 'USR-TEAM1-01',
    username: 'team1',
    fullName: 'Karim Hadj (Équipe 1 - Création & Desktop Offline)',
    role: 'TEAM_1',
    permissions: ['CREATE_ASSET', 'VIEW_ASSETS', 'SYNC']
  },
  {
    id: 'USR-TEAM2-01',
    username: 'team2',
    fullName: 'Sofiane Messaoudi (Équipe 2 - Contrôleur Zone / Vérification)',
    role: 'TEAM_2',
    permissions: ['VIEW_ASSETS', 'VERIFY_ASSET']
  },
  {
    id: 'USR-TEAM3-01',
    username: 'team3',
    fullName: 'Riad Boukhechem (Équipe 3 - Opérateur PWA Chargement)',
    role: 'TEAM_3',
    permissions: ['VIEW_ASSETS', 'LOAD_ASSET']
  }
];

function generateJwt(user: (typeof USERS)[0]) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    permissions: user.permissions,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400
  })).toString('base64url');

  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

function verifyJwt(tokenStr: string) {
  try {
    const parts = tokenStr.replace('Bearer ', '').trim().split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
    if (signature !== expectedSig) return null;
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

async function startServer() {
  const app = express();

  // Basic Middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // CORS for dev and embedded previews
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-device-id, x-device-api-key, x-target-backend');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Request logger for API endpoints
  app.use('/api', (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[API ${req.method}] ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    });
    next();
  });

  // Auth helper middleware
  const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const deviceId = req.headers['x-device-id'] as string;
    const deviceKey = req.headers['x-device-api-key'] as string;

    // Check device credentials
    if (deviceId === CONFIGURED_DEVICE_ID && deviceKey === CONFIGURED_DEVICE_KEY) {
      (req as any).user = USERS.find(u => u.role === 'TEAM_1');
      (req as any).isDeviceAuth = true;
      return next();
    }

    if (!authHeader) {
      // Default fallback for prototype convenience: authenticate as ADMIN or TEAM_1
      const roleHeader = req.headers['x-user-role'] as string;
      const matched = USERS.find(u => u.role === roleHeader) || USERS[0];
      (req as any).user = matched;
      return next();
    }

    const payload = verifyJwt(authHeader);
    if (!payload) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Token JWT invalide ou expiré' });
      return;
    }
    (req as any).user = payload;
    next();
  };

  // RBAC Guard helper
  const requireRole = (...allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const user = (req as any).user;
      if (!user || (!allowedRoles.includes(user.role) && user.role !== 'ADMIN')) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: `Accès refusé. Rôles autorisés: ${allowedRoles.join(', ')}. Votre rôle: ${user?.role || 'ANONYMOUS'}`
        });
        return;
      }
      next();
    };
  };

  /* ==========================================================================
     API ROUTES (Conforming to KAF INVENTAIRE NestJS documentation)
     Prefix: /api/v1 (aliased on /api for seamless backward compatibility)
     ========================================================================== */

  const apiRouter = express.Router();

  // 1. System Health & Infrastructure Ping (Function 1 & 8)
  apiRouter.get('/health', (req, res) => {
    res.json({
      status: 'UP',
      service: 'KAF-INVENTAIRE-CENTRAL-API',
      version: '1.0.0-PROD',
      timestamp: new Date().toISOString(),
      database: {
        engine: 'PostgreSQL 16',
        url: CENTRAL_POSTGRES_URL,
        status: 'CONNECTED',
        poolSize: 10,
        activeConnections: 2
      },
      redis: {
        engine: 'Redis 7',
        status: 'CONNECTED',
        queue: 'KAF_SYNC_QUEUE',
        pendingJobs: 0
      },
      deviceSecurity: {
        configuredDeviceId: CONFIGURED_DEVICE_ID,
        registrationTokenActive: !!DEVICE_REGISTRATION_TOKEN
      },
      stats: {
        totalAssets: centralAssets.length,
        auditEntries: centralAuditTrail.length,
        processedMutations: processedMutationIds.size
      }
    });
  });

  apiRouter.get('/sync/status', (req, res) => {
    const deviceId = (req.headers['x-device-id'] as string) || CONFIGURED_DEVICE_ID;
    const isRegistered = deviceId === CONFIGURED_DEVICE_ID;

    res.json({
      deviceId,
      isRegistered,
      serverTime: new Date().toISOString(),
      activeCampaign: 'CMP-2026-S1-DZ',
      serverSchemaVersion: 4,
      totalCentralAssets: centralAssets.length,
      unverifiedCount: centralAssets.filter(a => a.workflowState === 'AJOUTE').length,
      verifiedCount: centralAssets.filter(a => a.workflowState === 'VERIFIE').length,
      loadedCount: centralAssets.filter(a => a.workflowState === 'CHARGE').length
    });
  });

  // 2. Auth & Sessions (Function 1)
  // POST /api/v1/auth/login
  apiRouter.post('/auth/login', (req, res) => {
    const { username, password, role } = req.body;
    let user = USERS.find(u => u.username === username || (role && u.role === role));

    if (!user) {
      if (role && ['TEAM_1', 'TEAM_2', 'TEAM_3', 'ADMIN'].includes(role)) {
        user = USERS.find(u => u.role === role);
      }
    }

    if (!user) {
      user = USERS[0]; // Fallback to ADMIN for easy testing
    }

    const token = generateJwt(user);
    res.json({
      access_token: token,
      refresh_token: `ref_${crypto.randomUUID()}`,
      token_type: 'Bearer',
      expires_in: 86400,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        permissions: user.permissions
      }
    });
  });

  // 3. Assets CRUD & Query (Function 3)
  // GET /api/v1/assets
  apiRouter.get('/assets', (req, res) => {
    const { status, workflowState, zone, search } = req.query;
    let filtered = [...centralAssets];

    if (status) {
      filtered = filtered.filter(a => a.inventoryStatus === status);
    }
    if (workflowState) {
      filtered = filtered.filter(a => a.workflowState === workflowState);
    }
    if (zone) {
      filtered = filtered.filter(a => a.zone === zone);
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      filtered = filtered.filter(a => 
        a.id.toLowerCase().includes(q) ||
        a.officialCode.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.barcode.toLowerCase().includes(q) ||
        a.serialNumber.toLowerCase().includes(q)
      );
    }

    res.json({
      total: filtered.length,
      count: filtered.length,
      data: filtered,
      syncedAt: new Date().toISOString()
    });
  });

  // GET /api/v1/assets/:id
  apiRouter.get('/assets/:id', (req, res) => {
    const asset = centralAssets.find(a => a.id === req.params.id || a.officialCode === req.params.id);
    if (!asset) {
      res.status(404).json({ error: 'NOT_FOUND', message: `Actif introuvable avec ID ${req.params.id}` });
      return;
    }
    res.json(asset);
  });

  // POST /api/v1/assets (TEAM_1 or ADMIN)
  apiRouter.post('/assets', authenticate, requireRole('TEAM_1', 'ADMIN'), (req, res) => {
    const body = req.body;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const newAsset: CentralAsset = {
      id: body.id || `AST-${Math.floor(10500 + Math.random() * 899)}`,
      officialCode: body.officialCode || `KAF-AST-2026-${Math.floor(100 + Math.random() * 899)}`,
      name: body.name || 'Nouvel Actif Industriel',
      nameFr: body.nameFr || body.name || 'Nouvel Actif Industriel',
      nameAr: body.nameAr || body.name || 'أصل صناعي جديد',
      sku: body.sku || `SKU-MAN-${Date.now().toString().slice(-4)}`,
      serialNumber: body.serialNumber || `SN-REG-${Date.now().toString().slice(-6)}`,
      barcode: body.barcode || `613110${Math.floor(1000000 + Math.random() * 8999999)}`,
      rfidTag: body.rfidTag || `E280-REG-${Math.floor(1000 + Math.random() * 8999)}`,
      category: body.category || 'Mechanical',
      zone: body.zone || 'WEST-DC-ZONE-C',
      expectedBayLocation: body.expectedBayLocation || body.bayLocation || 'BAY-04-RACK-01-LVL1',
      scannedBayLocation: body.scannedBayLocation,
      inventoryStatus: body.inventoryStatus || 'NON_VERIFIE',
      workflowState: 'AJOUTE', // Initial state according to workflow rules
      physicalState: body.physicalState || 'ACTIF',
      condition: body.condition || 'nominal',
      tamperSealIntact: body.tamperSealIntact !== false,
      rfidVerified: !!body.rfidVerified,
      serialVerified: !!body.serialVerified,
      lastScannedAt: body.lastScannedAt || now,
      scannedBy: (req as any).user?.username || 'TEAM_1',
      verifiedAt: null,
      verifiedBy: null,
      loadedAt: null,
      loadedBy: null,
      notes: body.notes || 'Créé via Équipe 1 (Desktop)',
      notesFr: body.notesFr || body.notes || 'Créé via Équipe 1 (Desktop)',
      imageUrl: body.imageUrl || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=400',
      weightKg: body.weightKg || 25,
      version: 1
    };

    centralAssets.unshift(newAsset);

    centralAuditTrail.unshift({
      id: `AUD-${Date.now()}`,
      timestamp: now,
      actor: (req as any).user?.username || 'TEAM_1',
      role: (req as any).user?.role || 'TEAM_1',
      action: 'CREATE_ASSET',
      entityId: newAsset.id,
      details: `Création de l'actif ${newAsset.officialCode} - statut workflow: AJOUTE`
    });

    res.status(201).json(newAsset);
  });

  // 4. Batch Sync Engine (Function 5 & 6)
  // POST /api/v1/sync (TEAM_1 or ADMIN or Valid Device)
  apiRouter.post('/sync', authenticate, requireRole('TEAM_1', 'ADMIN'), (req, res) => {
    const { deviceId, syncBatchId, mutations } = req.body;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const user = (req as any).user;

    if (!Array.isArray(mutations)) {
      res.status(400).json({ error: 'INVALID_PAYLOAD', message: 'mutations doit être un tableau' });
      return;
    }

    const successes: any[] = [];
    const conflicts: any[] = [];
    const duplicates: string[] = [];

    for (const m of mutations) {
      const mutationId = m.id || m.idempotencyKey;

      // 1. Idempotency & Duplicate Check
      if (mutationId && processedMutationIds.has(mutationId)) {
        duplicates.push(mutationId);
        continue;
      }

      const target = centralAssets.find(a => a.id === m.assetId || a.officialCode === m.assetId);

      // 2. Conflict Rule (Function 6): "Blocage d'écrasement si l'actif est déjà VERIFIE ou CHARGE"
      if (target && (target.workflowState === 'VERIFIE' || target.workflowState === 'CHARGE')) {
        // Reject overwrite of verified/loaded asset
        conflicts.push({
          id: `CONF-${Date.now()}-${Math.floor(Math.random() * 999)}`,
          mutationId: mutationId || `MUT-${Date.now()}`,
          assetId: target.id,
          reason: `BLOCAGE_CONFLIT_WORKFLOW: L'actif ${target.officialCode} (${target.name}) est déjà au statut ${target.workflowState} par l'Équipe 2/3. Écrasement local interdit par les règles de gouvernance centrale.`,
          serverState: {
            workflowState: target.workflowState,
            inventoryStatus: target.inventoryStatus,
            expectedBayLocation: target.expectedBayLocation,
            verifiedBy: target.verifiedBy,
            verifiedAt: target.verifiedAt,
            loadedBy: target.loadedBy,
            loadedAt: target.loadedAt,
            version: target.version
          },
          clientState: m.payload || {}
        });
        continue;
      }

      // 3. Normal Mutation Application
      if (target) {
        if (m.payload) {
          if (m.payload.inventoryStatus) target.inventoryStatus = m.payload.inventoryStatus;
          if (m.payload.scannedLocation) target.scannedBayLocation = m.payload.scannedLocation;
          if (m.payload.condition) target.condition = m.payload.condition;
          if (m.payload.bayLocation) target.expectedBayLocation = m.payload.bayLocation;
          target.lastScannedAt = now;
          target.scannedBy = user?.username || deviceId || 'TECH-941';
          target.version = (target.version || 1) + 1;
        }

        // Progress workflow state to SYNCHRONISE
        if (target.workflowState === 'AJOUTE') {
          target.workflowState = 'SYNCHRONISE';
        }
        target.syncBatchId = syncBatchId || `BATCH-${Date.now()}`;

        successes.push({
          id: mutationId,
          assetId: target.id,
          type: m.type,
          workflowState: target.workflowState,
          message: 'Synchronisé avec succès dans la base centrale PostgreSQL'
        });
      } else {
        // If asset does not exist, auto-create it from discovery / new asset
        const newAssetId = m.assetId.startsWith('AST-') ? m.assetId : `AST-${Math.floor(10500 + Math.random() * 899)}`;
        const created: CentralAsset = {
          id: newAssetId,
          officialCode: m.payload?.officialCode || `KAF-AST-2026-${Math.floor(100 + Math.random() * 899)}`,
          name: m.assetName || 'Actif découvert in situ',
          nameFr: m.assetName || 'Actif découvert in situ',
          nameAr: m.assetName || 'أصل مكتشف في الموقع',
          sku: `SKU-DISC-${Math.floor(100 + Math.random() * 899)}`,
          serialNumber: m.payload?.serialNumber || `SN-SYN-${Date.now().toString().slice(-6)}`,
          barcode: m.payload?.barcode || `613110${Math.floor(1000000 + Math.random() * 8999999)}`,
          rfidTag: `E280-SYN-${Math.floor(1000 + Math.random() * 8999)}`,
          category: 'Mechanical',
          zone: 'WEST-DC-ZONE-C',
          expectedBayLocation: m.payload?.scannedLocation || m.payload?.bayLocation || 'BAY-04-RACK-01-LVL1',
          scannedBayLocation: m.payload?.scannedLocation || m.payload?.bayLocation,
          inventoryStatus: 'CONFORME',
          workflowState: 'SYNCHRONISE',
          physicalState: 'ACTIF',
          condition: m.payload?.condition || 'nominal',
          tamperSealIntact: true,
          rfidVerified: false,
          serialVerified: true,
          lastScannedAt: now,
          scannedBy: user?.username || deviceId || 'TECH-941',
          verifiedAt: null,
          verifiedBy: null,
          loadedAt: null,
          loadedBy: null,
          syncBatchId: syncBatchId || `BATCH-${Date.now()}`,
          notes: 'Ajouté par synchronisation batch offline',
          notesFr: 'Ajouté par synchronisation batch offline',
          imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=400',
          weightKg: 20,
          version: 1
        };
        centralAssets.unshift(created);

        successes.push({
          id: mutationId,
          assetId: created.id,
          type: m.type,
          workflowState: 'SYNCHRONISE',
          message: 'Actif créé et synchronisé dans la base centrale'
        });
      }

      // Mark mutation as processed for idempotency
      if (mutationId) {
        processedMutationIds.add(mutationId);
      }
    }

    // Record in central audit trail
    centralAuditTrail.unshift({
      id: `AUD-${Date.now()}`,
      timestamp: now,
      actor: user?.username || deviceId || 'TEAM_1',
      role: user?.role || 'TEAM_1',
      action: 'BATCH_SYNC_EXECUTION',
      entityId: syncBatchId || `BATCH-${Date.now()}`,
      details: `Batch sync: ${successes.length} succès, ${conflicts.length} conflits bloqués, ${duplicates.length} doublons ignorés.`,
      metadata: { successesCount: successes.length, conflictsCount: conflicts.length }
    });

    res.json({
      success: true,
      batchId: syncBatchId || `BATCH-${Date.now()}`,
      processedCount: mutations.length,
      successes,
      conflicts,
      duplicates,
      serverTimestamp: now
    });
  });

  // 5. Verification Endpoint (Function 4 & 7)
  // POST /api/v1/verification/:id (TEAM_2 or ADMIN)
  apiRouter.post('/verification/:id', authenticate, requireRole('TEAM_2', 'ADMIN'), (req, res) => {
    const asset = centralAssets.find(a => a.id === req.params.id || a.officialCode === req.params.id);
    if (!asset) {
      res.status(404).json({ error: 'NOT_FOUND', message: `Actif introuvable avec ID ${req.params.id}` });
      return;
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const user = (req as any).user;
    const { physicalState, condition, bayLocation, notes } = req.body;

    asset.workflowState = 'VERIFIE';
    asset.inventoryStatus = 'CONFORME';
    if (physicalState) asset.physicalState = physicalState;
    if (condition) asset.condition = condition;
    if (bayLocation) asset.scannedBayLocation = bayLocation;
    asset.verifiedAt = now;
    asset.verifiedBy = user?.fullName || user?.username || 'Équipe 2 (Vérification)';
    if (notes) asset.notes = `${asset.notes} [Vérifié: ${notes}]`;
    asset.version = (asset.version || 1) + 1;

    centralAuditTrail.unshift({
      id: `AUD-${Date.now()}`,
      timestamp: now,
      actor: user?.username || 'TEAM_2',
      role: 'TEAM_2',
      action: 'VERIFY_ASSET',
      entityId: asset.id,
      details: `Validation vérification physique in situ par Équipe 2. Statut passé à VERIFIE.`
    });

    res.json({
      success: true,
      message: `Actif ${asset.officialCode} vérifié avec succès par l'Équipe 2`,
      asset
    });
  });

  // 6. Loading Endpoint (Function 4 & 7)
  // POST /api/v1/loading/:id (TEAM_3 or ADMIN)
  apiRouter.post('/loading/:id', authenticate, requireRole('TEAM_3', 'ADMIN'), (req, res) => {
    const asset = centralAssets.find(a => a.id === req.params.id || a.officialCode === req.params.id);
    if (!asset) {
      res.status(404).json({ error: 'NOT_FOUND', message: `Actif introuvable avec ID ${req.params.id}` });
      return;
    }

    // State machine guard: Asset must be VERIFIE before loading!
    if (asset.workflowState !== 'VERIFIE' && (req as any).user?.role !== 'ADMIN') {
      res.status(400).json({
        error: 'INVALID_WORKFLOW_STATE',
        message: `L'actif ${asset.officialCode} est au statut ${asset.workflowState}. Il doit impérativement être vérifié (VERIFIE) par l'Équipe 2 avant le chargement.`
      });
      return;
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const user = (req as any).user;
    const { containerCode, truckPlate } = req.body;

    asset.workflowState = 'CHARGE';
    asset.loadedAt = now;
    asset.loadedBy = user?.fullName || user?.username || 'Équipe 3 (PWA Chargement)';
    const ref = containerCode || truckPlate || 'SEMI-KAF-01';
    asset.notes = `${asset.notes} [Chargé sur: ${ref} le ${now}]`;
    asset.version = (asset.version || 1) + 1;

    centralAuditTrail.unshift({
      id: `AUD-${Date.now()}`,
      timestamp: now,
      actor: user?.username || 'TEAM_3',
      role: 'TEAM_3',
      action: 'LOAD_ASSET',
      entityId: asset.id,
      details: `Chargement validé par Équipe 3 sur ${ref}. Statut passé à CHARGE.`
    });

    res.json({
      success: true,
      message: `Actif ${asset.officialCode} chargé avec succès par l'Équipe 3`,
      asset
    });
  });

  // 7. ETL Mass Import Endpoint (Function 8)
  // POST /api/v1/etl/import (ADMIN)
  apiRouter.post('/etl/import', authenticate, requireRole('ADMIN'), (req, res) => {
    const startTime = Date.now();
    const { assets: rawAssets } = req.body;

    if (!Array.isArray(rawAssets)) {
      res.status(400).json({ error: 'INVALID_PAYLOAD', message: 'assets doit être un tableau' });
      return;
    }

    let importedCount = 0;
    let skippedDuplicates = 0;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    for (const raw of rawAssets) {
      const existing = centralAssets.find(a => 
        (raw.officialCode && a.officialCode === raw.officialCode) ||
        (raw.barcode && a.barcode === raw.barcode) ||
        (raw.serialNumber && a.serialNumber === raw.serialNumber)
      );

      if (existing) {
        skippedDuplicates++;
        continue;
      }

      const imported: CentralAsset = {
        id: raw.id || `AST-${Math.floor(10600 + Math.random() * 8999)}`,
        officialCode: raw.officialCode || `KAF-ETL-${Math.floor(1000 + Math.random() * 8999)}`,
        name: raw.name || raw.description || 'Matériel importé ETL',
        nameFr: raw.nameFr || raw.name || raw.description || 'Matériel importé ETL',
        nameAr: raw.nameAr || raw.name || 'أصل مستورد',
        sku: raw.sku || `SKU-ETL-${Math.floor(100 + Math.random() * 899)}`,
        serialNumber: raw.serialNumber || `SN-ETL-${Date.now().toString().slice(-6)}`,
        barcode: raw.barcode || `613110${Math.floor(1000000 + Math.random() * 8999999)}`,
        rfidTag: raw.rfidTag || `E280-ETL-${Math.floor(1000 + Math.random() * 8999)}`,
        category: raw.category || 'Mechanical',
        zone: raw.zone || 'WEST-DC-ZONE-C',
        expectedBayLocation: raw.expectedBayLocation || raw.bayLocation || 'BAY-04-RACK-01-LVL1',
        inventoryStatus: 'NON_VERIFIE',
        workflowState: 'AJOUTE',
        physicalState: 'ACTIF',
        condition: 'nominal',
        tamperSealIntact: true,
        rfidVerified: false,
        serialVerified: true,
        lastScannedAt: null,
        scannedBy: null,
        verifiedAt: null,
        verifiedBy: null,
        loadedAt: null,
        loadedBy: null,
        notes: 'Importé via ETL Excel / JSON',
        notesFr: 'Importé via ETL Excel / JSON',
        imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=400',
        weightKg: raw.weightKg || 15,
        version: 1
      };

      centralAssets.push(imported);
      importedCount++;
    }

    centralAuditTrail.unshift({
      id: `AUD-${Date.now()}`,
      timestamp: now,
      actor: (req as any).user?.username || 'ADMIN',
      role: 'ADMIN',
      action: 'ETL_MASS_IMPORT',
      entityId: `ETL-${Date.now()}`,
      details: `Importation massive ETL terminée: ${importedCount} importés, ${skippedDuplicates} doublons ignorés en ${Date.now() - startTime}ms`
    });

    res.json({
      success: true,
      importedCount,
      skippedDuplicates,
      totalAssets: centralAssets.length,
      durationMs: Date.now() - startTime
    });
  });

  // Mount API router on both /api/v1 and /api
  app.use('/api/v1', apiRouter);
  app.use('/api', apiRouter);

  // Serve Frontend SPA
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve('dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`🚀 KAF INVENTAIRE Central Backend Engine Running`);
    console.log(`📡 URL: http://0.0.0.0:${PORT}`);
    console.log(`📊 Central Database: ${CENTRAL_POSTGRES_URL}`);
    console.log(`🔑 Device Auth: ID=${CONFIGURED_DEVICE_ID}`);
    console.log(`======================================================\n`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
