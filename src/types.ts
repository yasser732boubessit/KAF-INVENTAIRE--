export type InventoryResultStatus = 
  | 'CONFORME'           // Présent dans le système + trouvé in situ au bon emplacement
  | 'ECART_LOCALISATION' // Présent dans le système + trouvé in situ mais dans un autre emplacement
  | 'MANQUANT'           // Présent dans le système + non trouvé après clôture de zone
  | 'NON_VERIFIE'        // Présent dans le système + en attente de passage
  | 'NON_ENREGISTRE';    // Non présent dans le système + découvert in situ

export type AssetCondition = 'nominal' | 'minor_wear' | 'needs_repair' | 'damaged' | 'uninspected';

export type AssetCategory = 'Mechanical' | 'Electrical' | 'Automation' | 'Instrumentation' | 'Safety';

export type UserRole = 'AGENT_INVENTAIRE' | 'CONTROLEUR_ZONE' | 'RESPONSABLE_PATRIMOINE';

export interface Asset {
  id: string; // ex. AST-10492
  officialCode: string;
  name: string;
  nameAr: string;
  nameFr: string;
  sku: string;
  serialNumber: string;
  barcode: string;
  rfidTag: string;
  category: AssetCategory;
  zone: string; // ex. WEST-DC-ZONE-C
  expectedBayLocation: string; // Emplacement théorique dans le système
  scannedBayLocation?: string; // Emplacement physique constaté
  inventoryStatus: InventoryResultStatus;
  condition: AssetCondition;
  tamperSealIntact: boolean;
  rfidVerified: boolean;
  serialVerified: boolean;
  lastScannedAt: string | null;
  scannedBy: string | null;
  notes: string;
  notesFr?: string;
  imageUrl: string;
  weightKg: number;
  calibrationDueDate: string;
  // Conflict demo fields
  serverStatus?: InventoryResultStatus;
  serverLocation?: string;
  serverCondition?: AssetCondition;
}

export type DiscoveryStatus = 'EN_ATTENTE_REVUE' | 'RAPPROCHE' | 'INTEGRE' | 'REJETE';

export interface DiscoveredAsset {
  id: string;
  temporaryTag: string;
  description: string;
  serialNumber: string;
  barcode: string;
  foundLocation: string;
  foundBy: string;
  foundAt: string;
  imageUrl: string;
  status: DiscoveryStatus;
  rejectionReason?: string;
  matchedAssetId?: string;
}

export interface InventoryZone {
  id: string;
  name: string;
  aisle: string;
  isClosed: boolean;
  closedAt?: string;
  closedBy?: string;
}

export interface InventoryCampaign {
  id: string;
  title: string;
  status: 'PLANIFIEE' | 'EN_COURS' | 'CLOTUREE' | 'VERROUILLEE';
  startDate: string;
  endDate: string;
  leadAuditor: string;
  zones: InventoryZone[];
  progressPercent?: number;
}

export interface OfflineMutation {
  id: string;
  idempotencyKey: string;
  timestamp: string;
  type: 'INVENTORY_SCAN' | 'LOCATION_DIFF' | 'DISCOVERY_LOG' | 'ZONE_CLOSE' | 'CAMPAIGN_LOCK' | 'ARBITRATION';
  assetId: string;
  assetName: string;
  payload: Record<string, any>;
  syncStatus: 'PENDING' | 'SYNCING' | 'SUCCESS' | 'FAILED';
  retryCount: number;
  lastError?: string;
}

export interface ConflictItem {
  id: string;
  assetId: string;
  assetName: string;
  timestamp: string;
  fieldName: string;
  localValue: string;
  serverValue: string;
  resolved: boolean;
  resolutionDecision?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userRole: UserRole;
  action: string;
  entityId: string;
  oldValue: string;
  newValue: string;
  reason: string;
}

export interface ValidationChecklistItem {
  id: number;
  title: string;
  titleAr: string;
  description: string;
  status: 'PASSED' | 'PENDING' | 'FAILED';
  testedAt?: string;
}

export type ActiveScreen = 
  | 'cockpit' 
  | 'scanner' 
  | 'decouvertes' 
  | 'campagnes' 
  | 'offline_queue' 
  | 'warehouse_map' 
  | 'audit_logs' 
  | 'reports' 
  | 'checklist';

export type Language = 'fr' | 'ar' | 'en';
