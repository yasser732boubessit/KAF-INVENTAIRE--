import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { WorkflowState, PhysicalState, InventoryStatus } from '../common/enums';

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { workflowState?: string; category?: string; search?: string }) {
    try {
      const where: any = {};
      if (query?.workflowState) where.workflowState = query.workflowState;
      if (query?.category) where.category = query.category;
      if (query?.search) {
        where.OR = [
          { officialCode: { contains: query.search, mode: 'insensitive' } },
          { name: { contains: query.search, mode: 'insensitive' } },
          { serialNumber: { contains: query.search, mode: 'insensitive' } },
          { barcode: { contains: query.search, mode: 'insensitive' } },
        ];
      }
      const assets = await this.prisma.asset.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
      });
      return { success: true, count: assets.length, assets };
    } catch {
      // Fallback
      return { success: true, count: 0, assets: [] };
    }
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findFirst({
      where: {
        OR: [{ id }, { officialCode: id }, { barcode: id }, { serialNumber: id }],
      },
    });

    if (!asset) {
      throw new NotFoundException(`Immobilisation avec l'identifiant '${id}' introuvable.`);
    }

    return { success: true, asset };
  }

  async create(dto: CreateAssetDto, user: any) {
    // Check uniqueness
    const existing = await this.prisma.asset.findFirst({
      where: {
        OR: [
          { officialCode: dto.officialCode },
          { barcode: dto.barcode },
          { serialNumber: dto.serialNumber },
        ],
      },
    });

    if (existing) {
      throw new ConflictException(
        `Une immobilisation avec ce code officiel, code-barres ou numéro de série existe déjà (${existing.officialCode})`,
      );
    }

    const created = await this.prisma.asset.create({
      data: {
        id: `AST-${Date.now().toString().slice(-5)}`,
        officialCode: dto.officialCode,
        name: dto.name,
        nameFr: dto.nameFr || dto.name,
        nameAr: dto.nameAr,
        sku: dto.sku,
        serialNumber: dto.serialNumber,
        barcode: dto.barcode,
        rfidTag: dto.rfidTag,
        category: (dto.category as any) || 'Mechanical',
        zone: dto.zone || 'ZONE-A',
        expectedBayLocation: dto.expectedBayLocation,
        scannedBayLocation: dto.scannedBayLocation,
        workflowState: dto.workflowState || WorkflowState.AJOUTE,
        physicalState: dto.physicalState || PhysicalState.ACTIF,
        inventoryStatus: dto.inventoryStatus || InventoryStatus.NON_VERIFIE,
        condition: dto.condition || 'nominal',
        tamperSealIntact: dto.tamperSealIntact ?? true,
        weightKg: dto.weightKg || 0,
        notes: dto.notes,
        imageUrl: dto.imageUrl,
        createdById: user?.sub,
      },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        action: 'ASSET_CREATED',
        assetId: created.id,
        userId: user?.sub,
        role: user?.role || 'TEAM_1',
        previousState: null,
        newState: created.workflowState,
        details: `Création de l'actif ${created.officialCode} (${created.name})`,
      },
    }).catch(() => null);

    return { success: true, message: 'Immobilisation créée avec succès', asset: created };
  }

  async update(id: string, updateData: Partial<CreateAssetDto>, user: any) {
    const existing = await this.prisma.asset.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Actif ${id} non trouvé`);
    }

    // Protect against conflict if verified or loaded
    if (existing.workflowState === WorkflowState.VERIFIE && updateData.workflowState === WorkflowState.AJOUTE) {
      throw new ConflictException('Conflit: Impossible de rétrograder un actif déjà VERIFIE vers AJOUTE');
    }
    if (existing.workflowState === WorkflowState.CHARGE) {
      throw new ConflictException('Conflit: Cet actif est CHARGE en registre. Modification bloquée.');
    }

    const updated = await this.prisma.asset.update({
      where: { id },
      data: {
        ...updateData as any,
        version: existing.version + 1,
      },
    });

    return { success: true, message: 'Immobilisation mise à jour', asset: updated };
  }
}
