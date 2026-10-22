import { PrismaClient, UserRole, WorkflowState, PhysicalState, InventoryStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding KAF INVENTAIRE Central Database ---');

  // ============================================================
  // 1. Seed Roles & Users (الحسابات الثلاثة الأساسية والمحدثة)
  // ============================================================
  const users = [
    {
      username: 'admin.patrimoine',
      fullName: 'Yasser Boubessit (Responsable Patrimoine)',
      email: 'y.boubessit@kaf-inventaire.dz',
      role: UserRole.ADMIN, 
      passwordHash: await bcrypt.hash('admin123', 10), // ✅ كلمة المرور محدثة
    },
    {
      username: 'agent.identification',
      fullName: 'Mohamed Brahimi (Agent Identification)',
      email: 'm.brahimi@kaf-inventaire.dz',
      role: UserRole.TEAM_1, 
      passwordHash: await bcrypt.hash('agent123', 10), // ✅ كلمة المرور محدثة
    },
    {
      username: 'controleur.chargement',
      fullName: 'Amine Khelifi (Contrôleur Vérification & Chargement)',
      email: 'a.khelifi@kaf-inventaire.dz',
      role: UserRole.TEAM_2, 
      passwordHash: await bcrypt.hash('ctrl123', 10), // ✅ كلمة المرور محدثة
    },
    // حسابات إضافية للاختبار (اختيارية)
    {
      username: 'admin',
      fullName: 'Yasser Boubessit (Directeur d\'Exploitation)',
      email: 'admin@kaf-inventaire.dz',
      role: UserRole.ADMIN,
      passwordHash: await bcrypt.hash('Kaf2026!Secure', 10),
    },
    {
      username: 'desktop_tech1',
      fullName: 'Opérateur Saisie Desktop (Équipe 1)',
      email: 'team1@kaf-inventaire.dz',
      role: UserRole.TEAM_1,
      passwordHash: await bcrypt.hash('Kaf2026!Secure', 10),
    },
    {
      username: 'verifier_tech2',
      fullName: 'Inspecteur Vérification Terrain (Équipe 2)',
      email: 'team2@kaf-inventaire.dz',
      role: UserRole.TEAM_2,
      passwordHash: await bcrypt.hash('Kaf2026!Secure', 10),
    },
    {
      username: 'loader_tech3',
      fullName: 'Agent Chargement & Quai (Équipe 3)',
      email: 'team3@kaf-inventaire.dz',
      role: UserRole.TEAM_3,
      passwordHash: await bcrypt.hash('Kaf2026!Secure', 10),
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        passwordHash: u.passwordHash, // تحديث كلمة المرور إذا كان الحساب موجوداً
      },
      create: u,
    });
  }
  console.log(`✓ Seeded ${users.length} users with standard RBAC roles`);

  // ============================================================
  // 2. Seed Initial Central Assets (الأصول الجديدة)
  // ============================================================
  const sampleAssets = [
    {
      id: 'AST-10492',
      officialCode: 'KAF-AST-2024-001',
      name: 'Toyota Hilux Double Cabine',
      nameFr: 'Toyota Hilux Double Cabine',
      nameAr: 'سيارة تويوتا هايلكس غمارتين',
      sku: 'SKU-VEH-092',
      serialNumber: 'SN-940218-GB',
      barcode: '894102938102',
      rfidTag: 'E280-1160-2000-0914',
      category: 'VEHICULES LEGERS DE TOURISME',
      zone: 'PLOT-14-02',
      expectedBayLocation: 'PLOT-14-02-RACK-02-L3',
      scannedBayLocation: 'PLOT-14-02-RACK-02-L3',
      inventoryStatus: InventoryStatus.CONFORME,
      workflowState: WorkflowState.SYNCHRONISE,
      physicalState: PhysicalState.ACTIF,
      condition: 'nominal',
      tamperSealIntact: true,
      rfidVerified: true,
      serialVerified: true,
      notes: 'Véhicule de service vérifié.',
      imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=400',
      weightKg: 24.5,
      version: 1,
    },
    {
      id: 'AST-10493',
      officialCode: 'KAF-AST-2024-002',
      name: 'PC Industriel Siemens SIMATIC IPC547G',
      nameFr: 'PC Industriel Siemens SIMATIC IPC547G',
      nameAr: 'حاسوب صناعي سيمنز SIMATIC IPC547G',
      sku: 'SKU-INF-150',
      serialNumber: 'SN-772910-DE',
      barcode: '894102938103',
      rfidTag: 'E280-1160-2000-0915',
      category: 'MATERIELS INFORMATIQUE',
      zone: 'PLOT-15-11',
      expectedBayLocation: 'PLOT-15-11-RACK-01-L2',
      scannedBayLocation: 'PLOT-15-11-RACK-01-L2',
      inventoryStatus: InventoryStatus.CONFORME,
      workflowState: WorkflowState.SYNCHRONISE,
      physicalState: PhysicalState.ACTIF,
      condition: 'nominal',
      tamperSealIntact: true,
      rfidVerified: true,
      serialVerified: true,
      notes: 'Firmware V2.9 mis à jour.',
      imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=400',
      weightKg: 3.2,
      version: 1,
    },
    {
      id: 'AST-10494',
      officialCode: 'KAF-AST-2024-003',
      name: 'Groupe Froid industriel 15kW',
      nameFr: 'Groupe Froid industriel 15kW',
      nameAr: 'مجموعة تبريد صناعية بقوة 15 كيلوواط',
      sku: 'SKU-CHA-412',
      serialNumber: 'SN-318492-AT',
      barcode: '894102938104',
      rfidTag: 'E280-1160-2000-0916',
      category: 'INSTALLATION CHAUD ET FROID',
      zone: 'PLOT-15-12',
      expectedBayLocation: 'PLOT-15-12-RACK-01-L1',
      scannedBayLocation: 'PLOT-15-09-RACK-04-L1',
      inventoryStatus: InventoryStatus.ECART_LOCALISATION,
      workflowState: WorkflowState.VERIFIE,
      physicalState: PhysicalState.ACTIF,
      condition: 'minor_wear',
      tamperSealIntact: true,
      rfidVerified: true,
      serialVerified: true,
      notes: 'Trouvé en Plot 15-09 au lieu de 15-12.',
      imageUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&q=80&w=400',
      weightKg: 142.0,
      version: 2,
    },
    {
      id: 'AST-10495',
      officialCode: 'KAF-AST-2024-004',
      name: 'Bureau Direction en Bois Massif',
      nameFr: 'Bureau Direction en Bois Massif',
      nameAr: 'مكتب مدير من الخشب الصلب',
      sku: 'SKU-MOB-833',
      serialNumber: 'SN-994821-CH',
      barcode: '894102938105',
      rfidTag: 'E280-1160-2000-0917',
      category: 'MOBILIER DE BUREAU',
      zone: 'PLOT-16-23',
      expectedBayLocation: 'PLOT-16-23-RACK-03-L2',
      scannedBayLocation: null,
      inventoryStatus: InventoryStatus.MANQUANT,
      workflowState: WorkflowState.SYNCHRONISE,
      physicalState: PhysicalState.ACTIF,
      condition: 'uninspected',
      tamperSealIntact: false,
      rfidVerified: false,
      serialVerified: false,
      notes: 'Absent lors de la tournée au Bâtiment Administration.',
      imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&q=80&w=400',
      weightKg: 18.5,
      version: 1,
    },
    {
      id: 'AST-10502',
      officialCode: 'KAF-AST-2024-005',
      name: 'Lot d\'Outillage Électroportatif',
      nameFr: 'Lot d\'Outillage Électroportatif',
      nameAr: 'مجموعة أدوات كهربائية محمولة',
      sku: 'SKU-OUT-C2420',
      serialNumber: 'V5HND516',
      barcode: '1S62A8KAT1EUV5HND516',
      rfidTag: 'E280-1160-2000-0924',
      category: 'OUTILLAGE',
      zone: 'PLOT-14-05',
      expectedBayLocation: 'PLOT-14-05-RACK-02-L1',
      scannedBayLocation: null,
      inventoryStatus: InventoryStatus.NON_VERIFIE,
      workflowState: WorkflowState.SYNCHRONISE,
      physicalState: PhysicalState.ACTIF,
      condition: 'nominal',
      tamperSealIntact: true,
      rfidVerified: true,
      serialVerified: true,
      notes: 'Perceuses, meuleuses et visseuses.',
      imageUrl: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&q=80&w=400',
      weightKg: 3.01,
      version: 1,
    }
  ];

  for (const asset of sampleAssets) {
    await prisma.asset.upsert({
      where: { officialCode: asset.officialCode },
      update: {}, // لا نقوم بتحديث الأصول الموجودة لتجنب مسح التعديلات
      create: asset as any, 
    });
  }
  console.log(`✓ Seeded ${sampleAssets.length} initial industrial assets`);

  console.log('--- Database Seed Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });