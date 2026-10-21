import { 
  Asset, 
  DiscoveredAsset, 
  InventoryCampaign, 
  OfflineMutation, 
  ConflictItem, 
  AuditLogEntry, 
  ValidationChecklistItem 
} from './types';

export const initialAssets: Asset[] = [
  {
    "id": "AST-10492",
    "officialCode": "IMMO-2026-VEH-001",
    "name": "Toyota Hilux Double Cabine",
    "nameAr": "سيارة تويوتا هايلكس غمارتين",
    "nameFr": "Toyota Hilux Double Cabine",
    "sku": "SKU-VEH-092",
    "serialNumber": "SN-940218-GB",
    "barcode": "894102938102",
    "rfidTag": "E280-1160-2000-0914",
    "category": "VEHICULES LEGERS DE TOURISME", // ✅ الفئة الجديدة
    "zone": "PLOT-14-02", // ✅ المنطقة الجديدة
    "expectedBayLocation": "PLOT-14-02-RACK-02-L3",
    "scannedBayLocation": "PLOT-14-02-RACK-02-L3",
    "inventoryStatus": "CONFORME",
    "condition": "nominal",
    "tamperSealIntact": true,
    "rfidVerified": true,
    "serialVerified": true,
    "lastScannedAt": "2026-10-08 07:14:22",
    "scannedBy": "TECH-941",
    "notes": "Vérification physique réussie. Emplacement conforme.",
    "notesFr": "Vérification physique réussie. Emplacement conforme.",
    "imageUrl": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
    "weightKg": 24.5,
    "calibrationDueDate": "2027-04-15"
  },
  {
    "id": "AST-10493",
    "officialCode": "IMMO-2026-INF-002",
    "name": "Programmable Logic Controller (PLC) S7-1500",
    "nameAr": "وحدة التحكم المنطقي المبرمجة S7-1500",
    "nameFr": "Automate Programmable Industriel (API) S7-1500",
    "sku": "SKU-INF-150",
    "serialNumber": "SN-772910-DE",
    "barcode": "894102938103",
    "rfidTag": "E280-1160-2000-0915",
    "category": "MATERIELS INFORMATIQUE", // ✅ الفئة الجديدة
    "zone": "PLOT-15-11", // ✅ المنطقة الجديدة
    "expectedBayLocation": "PLOT-15-11-RACK-01-L2",
    "scannedBayLocation": "PLOT-15-11-RACK-01-L2",
    "inventoryStatus": "CONFORME",
    "condition": "nominal",
    "tamperSealIntact": true,
    "rfidVerified": true,
    "serialVerified": true,
    "lastScannedAt": "2026-10-08 07:22:05",
    "scannedBy": "TECH-941",
    "notes": "Firmware v3.1 validé, batterie de sauvegarde nominale.",
    "notesFr": "Firmware v3.1 validé, batterie de sauvegarde nominale.",
    "imageUrl": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
    "weightKg": 3.2,
    "calibrationDueDate": "2027-01-20"
  },
  {
    "id": "AST-10494",
    "officialCode": "IMMO-2026-CHA-003",
    "name": "Explosion-Proof Induction Motor 15kW ATEX",
    "nameAr": "محرك حثي مضاد للانفجار بقوة 15 كيلوواط",
    "nameFr": "Moteur à induction antidéflagrant 15 kW (ATEX)",
    "sku": "SKU-CHA-412",
    "serialNumber": "SN-318492-AT",
    "barcode": "894102938104",
    "rfidTag": "E280-1160-2000-0916",
    "category": "INSTALLATION CHAUD ET FROID", // ✅ الفئة الجديدة
    "zone": "PLOT-15-12", // ✅ المنطقة الجديدة
    "expectedBayLocation": "PLOT-15-12-RACK-01-L1",
    "scannedBayLocation": "PLOT-15-09-RACK-04-L1",
    "inventoryStatus": "ECART_LOCALISATION",
    "condition": "minor_wear",
    "tamperSealIntact": false,
    "rfidVerified": true,
    "serialVerified": true,
    "lastScannedAt": "2026-10-08 07:31:40",
    "scannedBy": "TECH-941",
    "notes": "Trouvé en Plot 15-09 au lieu de 15-12 théorique. Sceau de boîte rompu.",
    "notesFr": "Trouvé en Plot 15-09 au lieu de 15-12 théorique. Sceau de boîte rompu.",
    "imageUrl": "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=600&q=80",
    "weightKg": 142,
    "calibrationDueDate": "2026-11-30"
  },
  {
    "id": "AST-10495",
    "officialCode": "IMMO-2026-INS-004",
    "name": "Ultrasonic Vortex Flowmeter Flange DN80",
    "nameAr": "مقياس تدفق فوق صوتي دوامي بشفة DN80",
    "nameFr": "Débitmètre vortex à ultrasons à brides DN80",
    "sku": "SKU-INS-833",
    "serialNumber": "SN-994821-CH",
    "barcode": "894102938105",
    "rfidTag": "E280-1160-2000-0917",
    "category": "OUTILLAGE", // ✅ الفئة الجديدة
    "zone": "PLOT-15-13", // ✅ المنطقة الجديدة
    "expectedBayLocation": "PLOT-15-13-RACK-03-L2",
    "scannedBayLocation": null,
    "inventoryStatus": "MANQUANT",
    "condition": "uninspected",
    "tamperSealIntact": false,
    "rfidVerified": false,
    "serialVerified": false,
    "lastScannedAt": null,
    "scannedBy": null,
    "notes": "Introuvable après clôture complète de la zone.",
    "notesFr": "Introuvable après clôture complète de la zone.",
    "imageUrl": "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80",
    "weightKg": 18.5,
    "calibrationDueDate": "2026-12-15"
  },
  {
    "id": "AST-10502",
    "officialCode": "IMMO-2026-MOB-005",
    "name": "Lenovo ThinkVision C24-20 Industrial Workstation Monitor",
    "nameAr": "شاشة محطة التحكم والمراقبة الصناعية Lenovo C24-20",
    "nameFr": "Moniteur de poste de supervision Lenovo C24-20",
    "sku": "SKU-MOB-C2420",
    "serialNumber": "V5HND516",
    "barcode": "1S62A8KAT1EUV5HND516",
    "rfidTag": "E280-1160-2000-0924",
    "category": "MOBILIER DE BUREAU", // ✅ الفئة الجديدة
    "zone": "PLOT-16-23", // ✅ المنطقة الجديدة
    "expectedBayLocation": "PLOT-16-23-RACK-02-L1",
    "scannedBayLocation": null,
    "inventoryStatus": "NON_VERIFIE",
    "condition": "nominal",
    "tamperSealIntact": true,
    "rfidVerified": true,
    "serialVerified": true,
    "lastScannedAt": null,
    "scannedBy": null,
    "notes": "Moniteur LCD 23.8 pouces FHD.",
    "notesFr": "Moniteur LCD 23.8 pouces FHD.",
    "imageUrl": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80",
    "weightKg": 3.01,
    "calibrationDueDate": "2027-12-31"
  }
];

export const initialDiscoveries: DiscoveredAsset[] = [
  {
    id: "DEC-001",
    temporaryTag: "DISCOV-2026-001",
    description: "Compresseur d'air mobile à vis 7.5kW (Non répertorié)",
    serialNumber: "SN-UNKNOWN-8842",
    barcode: "990184918201",
    foundLocation: "PLOT-15-10-RACK-04-L1",
    foundBy: "TECH-941",
    foundAt: "2026-10-08 08:15:30",
    imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
    status: "EN_ATTENTE_REVUE"
  }
];

export const initialCampaign: InventoryCampaign = {
  id: "CAMP-2026-Q1",
  title: "Campagne Générale d'Inventaire Industriel Q1-2026",
  status: "EN_COURS",
  startDate: "2026-10-01",
  endDate: "2026-10-15",
  leadAuditor: "Yasser B. (Auditeur Principal)",
  // ✅ تحديث المناطق الـ 24 الجديدة
  zones: [
    { id: "PLOT-14-01", name: "Silos de Stockage", aisle: "PLOT 14", isClosed: false },
    { id: "PLOT-14-02", name: "Chargement Camion", aisle: "PLOT 14", isClosed: false },
    { id: "PLOT-14-03", name: "Jetty Convoyeur", aisle: "PLOT 14", isClosed: false },
    { id: "PLOT-14-04", name: "Courbe Convoyeur", aisle: "PLOT 14", isClosed: false },
    { id: "PLOT-14-05", name: "Bâtiment Technique", aisle: "PLOT 14", isClosed: false },
    { id: "PLOT-15-06", name: "Prénettoyage de Graines", aisle: "PLOT 15", isClosed: false },
    { id: "PLOT-15-07", name: "Silos Tampons", aisle: "PLOT 15", isClosed: false },
    { id: "PLOT-15-08", name: "Réservoirs Journaliers d'Huiles Brute", aisle: "PLOT 15", isClosed: false },
    { id: "PLOT-15-09", name: "Préparation Building", aisle: "PLOT 15", isClosed: false },
    { id: "PLOT-15-10", name: "Extraction Building", aisle: "PLOT 15", isClosed: false },
    { id: "PLOT-15-11", name: "Bâtiment de Processus", aisle: "PLOT 15", isClosed: false },
    { id: "PLOT-15-12", name: "Production de Vapeur", aisle: "PLOT 15", isClosed: true, closedAt: "2026-10-08 07:50:00", closedBy: "MGR-CTRL-09" }, // مغلقة كتجربة
    { id: "PLOT-15-13", name: "Traitement d'Eau Brut", aisle: "PLOT 15", isClosed: false },
    { id: "PLOT-15-14", name: "Traitement des Eaux Usées", aisle: "PLOT 15", isClosed: false },
    { id: "PLOT-15-15", name: "Réservoir Quotidien d'Huile Raffinée", aisle: "PLOT 15", isClosed: false },
    { id: "PLOT-16-16", name: "Stockage de Farine et Coques", aisle: "PLOT 16", isClosed: false },
    { id: "PLOT-16-17", name: "Station de Chargement Wagon", aisle: "PLOT 16", isClosed: false },
    { id: "PLOT-16-18", name: "Réservoirs de Stockage Huile Brute", aisle: "PLOT 16", isClosed: false },
    { id: "PLOT-16-19", name: "Réservoirs de Stockage Huile Raffinée", aisle: "PLOT 16", isClosed: false },
    { id: "PLOT-16-20", name: "Bâtiment de Conditionnement", aisle: "PLOT 16", isClosed: false },
    { id: "PLOT-16-21", name: "Chargement Camion - Farine et Coque", aisle: "PLOT 16", isClosed: false },
    { id: "PLOT-16-22", name: "Chargement Camion - Huile", aisle: "PLOT 16", isClosed: false },
    { id: "PLOT-16-23", name: "Administration", aisle: "PLOT 16", isClosed: false },
    { id: "PLOT-16-24", name: "Bâtiment Technique", aisle: "PLOT 16", isClosed: false },
  ]
};

// (باقي الملف يبقى كما هو: initialOfflineMutations, initialConflicts, إلخ)
export const initialOfflineMutations: OfflineMutation[] = [
  {
    id: "MUT-99410",
    idempotencyKey: "IDEMP-AST-10494-SCAN",
    timestamp: "2026-10-08 07:31:40",
    type: "LOCATION_DIFF",
    assetId: "AST-10494",
    assetName: "Moteur à induction antidéflagrant 15 kW (ATEX)",
    payload: { expectedLocation: "PLOT-15-12-RACK-01-L1", foundLocation: "PLOT-15-09-RACK-04-L1", status: "ECART_LOCALISATION" },
    syncStatus: "SUCCESS",
    retryCount: 0
  }
];

export const initialConflicts: ConflictItem[] = [
  {
    id: "CONF-01",
    assetId: "AST-10494",
    assetName: "Moteur à induction antidéflagrant 15 kW (ATEX)",
    timestamp: "2026-10-08 07:31:40",
    fieldName: "Emplacement Site",
    localValue: "PLOT-15-09-RACK-04-L1 (Constaté in situ)",
    serverValue: "PLOT-15-12-RACK-01-L1 (Fiche d'imputation ERP)",
    resolved: false
  }
];

export const initialAuditLogs: AuditLogEntry[] = [
  {
    id: "LOG-001",
    timestamp: "2026-10-08 07:14:22",
    userId: "TECH-941",
    userRole: "AGENT_INVENTAIRE",
    action: "SCAN_CONFORME",
    entityId: "AST-10492",
    oldValue: "NON_VERIFIE",
    newValue: "CONFORME",
    reason: "Correspondance physique et code-barres validés"
  }
];

export const initialChecklist: ValidationChecklistItem[] = [
  {
    id: 1,
    title: "1. إيجاد أصل مسجل في موقعه الصحيح",
    titleAr: "إيجاد أصل مسجل في موقعه الصحيح",
    description: "Doit produire CONFORME avec enregistrement horodaté de la vérification.",
    status: "PASSED",
    testedAt: "2026-10-08 07:14:22"
  }
];