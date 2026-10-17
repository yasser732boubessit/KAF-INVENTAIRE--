-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('TEAM_1', 'TEAM_2', 'TEAM_3', 'ADMIN');

-- CreateEnum
CREATE TYPE "WorkflowState" AS ENUM ('AJOUTE', 'SYNCHRONISE', 'VERIFIE', 'CHARGE', 'REJETE');

-- CreateEnum
CREATE TYPE "PhysicalState" AS ENUM ('ACTIF', 'EN_PANNE', 'EN_MAINTENANCE', 'EN_STOCK', 'HORS_SERVICE', 'REFORME');

-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('CONFORME', 'ECART_LOCALISATION', 'MANQUANT', 'NON_VERIFIE', 'NON_ENREGISTRE');

-- CreateEnum
CREATE TYPE "AssetCategory" AS ENUM ('Mechanical', 'Electrical', 'Automation', 'Instrumentation', 'Safety');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'TEAM_1',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "officialCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameFr" TEXT,
    "nameAr" TEXT,
    "sku" TEXT,
    "serialNumber" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "rfidTag" TEXT,
    "category" "AssetCategory" NOT NULL DEFAULT 'Mechanical',
    "zone" TEXT NOT NULL DEFAULT 'ZONE-A',
    "expectedBayLocation" TEXT NOT NULL,
    "scannedBayLocation" TEXT,
    "inventoryStatus" "InventoryStatus" NOT NULL DEFAULT 'NON_VERIFIE',
    "workflowState" "WorkflowState" NOT NULL DEFAULT 'AJOUTE',
    "physicalState" "PhysicalState" NOT NULL DEFAULT 'ACTIF',
    "condition" TEXT NOT NULL DEFAULT 'nominal',
    "tamperSealIntact" BOOLEAN NOT NULL DEFAULT true,
    "rfidVerified" BOOLEAN NOT NULL DEFAULT false,
    "serialVerified" BOOLEAN NOT NULL DEFAULT false,
    "weightKg" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "notes" TEXT,
    "notesFr" TEXT,
    "imageUrl" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "lastScannedAt" TIMESTAMP(3),
    "scannedBy" TEXT,
    "syncBatchId" TEXT,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_batches" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientTimestamp" TIMESTAMP(3),
    "batchSize" INTEGER NOT NULL DEFAULT 0,
    "insertedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "conflictCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',

    CONSTRAINT "sync_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_records" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "verifiedByUserId" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bayLocation" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "tamperSealIntact" BOOLEAN NOT NULL,
    "rfidMatches" BOOLEAN NOT NULL,
    "serialMatches" BOOLEAN NOT NULL,
    "notes" TEXT,
    "resultStatus" TEXT NOT NULL DEFAULT 'CONFORME',

    CONSTRAINT "verification_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loading_records" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "loadedByUserId" TEXT NOT NULL,
    "loadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "destinationBay" TEXT NOT NULL,
    "vehiclePlate" TEXT,
    "containerCode" TEXT,
    "notes" TEXT,

    CONSTRAINT "loading_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL DEFAULT 'ASSET',
    "assetId" TEXT,
    "userId" TEXT,
    "role" TEXT NOT NULL,
    "previousState" TEXT,
    "newState" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "syncBatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "assets_officialCode_key" ON "assets"("officialCode");

-- CreateIndex
CREATE UNIQUE INDEX "assets_serialNumber_key" ON "assets"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "assets_barcode_key" ON "assets"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "assets_rfidTag_key" ON "assets"("rfidTag");

-- CreateIndex
CREATE INDEX "assets_workflowState_idx" ON "assets"("workflowState");

-- CreateIndex
CREATE INDEX "assets_barcode_idx" ON "assets"("barcode");

-- CreateIndex
CREATE INDEX "assets_serialNumber_idx" ON "assets"("serialNumber");

-- CreateIndex
CREATE INDEX "assets_officialCode_idx" ON "assets"("officialCode");

-- CreateIndex
CREATE INDEX "verification_records_assetId_idx" ON "verification_records"("assetId");

-- CreateIndex
CREATE INDEX "loading_records_assetId_idx" ON "loading_records"("assetId");

-- CreateIndex
CREATE INDEX "audit_logs_assetId_idx" ON "audit_logs"("assetId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_syncBatchId_fkey" FOREIGN KEY ("syncBatchId") REFERENCES "sync_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_records" ADD CONSTRAINT "verification_records_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_records" ADD CONSTRAINT "verification_records_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loading_records" ADD CONSTRAINT "loading_records_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loading_records" ADD CONSTRAINT "loading_records_loadedByUserId_fkey" FOREIGN KEY ("loadedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_syncBatchId_fkey" FOREIGN KEY ("syncBatchId") REFERENCES "sync_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
