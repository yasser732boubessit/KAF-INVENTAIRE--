import { PrismaClient, UserRole, WorkflowState, PhysicalState, InventoryStatus, AssetCategory } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding KAF INVENTAIRE Central Database ---');

  // 1. Seed Roles & Users
  const passwordHash = await bcrypt.hash('Kaf2026!Secure', 10);

  const users = [
    {
      username: 'admin',
      fullName: 'Yasser Boubessit (Directeur d\'Exploitation)',
      email: 'admin@kaf-inventaire.dz',
      role: UserRole.ADMIN,
      passwordHash,
    },
    {
      username: 'desktop_tech1',
      fullName: 'Opérateur Saisie Desktop (Équipe 1)',
      email: 'team1@kaf-inventaire.dz',
      role: UserRole.TEAM_1,
      passwordHash,
    },
    {
      username: 'verifier_tech2',
      fullName: 'Inspecteur Vérification Terrain (Équipe 2)',
      email: 'team2@kaf-inventaire.dz',
      role: UserRole.TEAM_2,
      passwordHash,
    },
    {
      username: 'loader_tech3',
      fullName: 'Agent Chargement & Quai (Équipe 3)',
      email: 'team3@kaf-inventaire.dz',
      role: UserRole.TEAM_3,
      passwordHash,
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: u,
    });
  }
  console.log(`✓ Seeded ${users.length} users with standard RBAC roles`);

  // 2. Seed Initial Central Assets
  const sampleAssets = [
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
      category: AssetCategory.Mechanical,
      zone: 'WEST-DC-ZONE-C',
      expectedBayLocation: 'BAY-04-RACK-02-LVL1',
      scannedBayLocation: 'BAY-04-RACK-02-LVL1',
      inventoryStatus: InventoryStatus.CONFORME,
      workflowState: WorkflowState.SYNCHRONISE,
      physicalState: PhysicalState.ACTIF,
      condition: 'nominal',
      tamperSealIntact: true,
      rfidVerified: true,
      serialVerified: true,
      notes: 'Bobinage certifié conforme 2026',
      imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=400',
      weightKg: 285.5,
      version: 1,
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
      category: AssetCategory.Mechanical,
      zone: 'WEST-DC-ZONE-C',
      expectedBayLocation: 'BAY-04-RACK-03-LVL2',
      scannedBayLocation: 'BAY-08-RACK-01-LVL1',
      inventoryStatus: InventoryStatus.ECART_LOCALISATION,
      workflowState: WorkflowState.SYNCHRONISE,
      physicalState: PhysicalState.ACTIF,
      condition: 'minor_wear',
      tamperSealIntact: true,
      rfidVerified: true,
      serialVerified: true,
      notes: 'Écart de travée détecté lors du premier audit',
      imageUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&q=80&w=400',
      weightKg: 142.0,
      version: 1,
    },
    {
      id: 'AST-10494',
      officialCode: 'KAF-AST-2024-003',
      name: 'Automate Programmable Industriel S7-1500',
      nameFr: 'Automate Programmable Industriel S7-1500',
      nameAr: 'متحكم منطقي قابل للبرمجة صناعي S7-1500',
      sku: 'SKU-PLC-SIEMENS-1500',
      serialNumber: 'SN-SIE-1500-8842',
      barcode: '6131102941042',
      rfidTag: 'E280-1160-2000-03',
      category: AssetCategory.Automation,
      zone: 'CENTRAL-CTRL-ROOM',
      expectedBayLocation: 'RACK-PLC-CABINET-01',
      scannedBayLocation: 'RACK-PLC-CABINET-01',
      inventoryStatus: InventoryStatus.CONFORME,
      workflowState: WorkflowState.VERIFIE,
      physicalState: PhysicalState.ACTIF,
      condition: 'nominal',
      tamperSealIntact: true,
      rfidVerified: true,
      serialVerified: true,
      notes: 'Vérifié par Équipe 2. Firmware V2.9 mis à jour.',
      imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=400',
      weightKg: 8.4,
      version: 2,
    },
    {
      id: 'AST-10495',
      officialCode: 'KAF-AST-2024-004',
      name: 'Variateur de Fréquence Altivar ATV930 75kW',
      nameFr: 'Variateur de Fréquence Altivar ATV930 75kW',
      nameAr: 'مغير تردد ألتيفار ATV930 بقوة 75 كيلوواط',
      sku: 'SKU-VFD-SCH-ATV930',
      serialNumber: 'SN-SCH-ATV930-1092',
      barcode: '6131102941059',
      rfidTag: 'E280-1160-2000-04',
      category: AssetCategory.Electrical,
      zone: 'WEST-DC-ZONE-C',
      expectedBayLocation: 'BAY-02-CABINET-04',
      scannedBayLocation: 'BAY-02-CABINET-04',
      inventoryStatus: InventoryStatus.CONFORME,
      workflowState: WorkflowState.CHARGE,
      physicalState: PhysicalState.ACTIF,
      condition: 'nominal',
      tamperSealIntact: true,
      rfidVerified: true,
      serialVerified: true,
      notes: 'Chargé sur camion de déploiement vers le Site Sud.',
      imageUrl: 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?auto=format&fit=crop&q=80&w=400',
      weightKg: 46.2,
      version: 3,
    }
  ];

  for (const asset of sampleAssets) {
    await prisma.asset.upsert({
      where: { officialCode: asset.officialCode },
      update: {},
      create: asset,
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
