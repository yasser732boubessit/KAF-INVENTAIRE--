export type AssetStatus = 'reconciled' | 'discrepancy' | 'missing' | 'unscanned' | 'staging';

export type AssetCondition = 'nominal' | 'minor_wear' | 'needs_repair' | 'damaged' | 'uninspected';

export type AssetCategory = 'Mechanical' | 'Electrical' | 'Automation' | 'Instrumentation' | 'Safety';

export interface Asset {
  id: string; // e.g. AST-10492
  name: string;
  nameAr: string;
  sku: string;
  serialNumber: string;
  barcode: string;
  rfidTag: string;
  category: AssetCategory;
  zone: string; // e.g. ZONE-C
  bayLocation: string; // e.g. BAY-04-RACK-02-L3
  status: AssetStatus;
  condition: AssetCondition;
  tamperSealIntact: boolean;
  rfidVerified: boolean;
  serialVerified: boolean;
  lastScannedAt: string | null;
  scannedBy: string | null;
  notes: string;
  imageUrl: string;
  weightKg: number;
  calibrationDueDate: string;
  // Conflict demo fields
  serverStatus?: AssetStatus;
  serverLocation?: string;
  serverCondition?: AssetCondition;
}

export interface OfflineMutation {
  id: string;
  timestamp: string;
  type: 'STATUS_UPDATE' | 'CONDITION_GRADE' | 'LOCATION_MOVE' | 'AUDIT_SIGN' | 'BARCODE_LINK';
  assetId: string;
  assetName: string;
  payload: Record<string, any>;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'conflict';
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
}

export type ActiveScreen = 'cockpit' | 'scanner' | 'offline_queue' | 'warehouse_map' | 'reports';

export type Language = 'ar' | 'en';
