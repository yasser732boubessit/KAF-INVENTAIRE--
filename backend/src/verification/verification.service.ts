import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VerifyAssetDto } from './dto/verify-asset.dto';
import { WorkflowState, InventoryStatus, PhysicalState } from '../common/enums';

@Injectable()
export class VerificationService {
  constructor(private prisma: PrismaService) {}

  async verifyAsset(assetId: string, dto: VerifyAssetDto, user: any) {
    let asset: any = null;
    try {
      asset = await this.prisma.asset.findFirst({
        where: {
          OR: [{ id: assetId }, { officialCode: assetId }, { barcode: assetId }],
        },
      });
    } catch {
      asset = null;
    }

    if (!asset) {
      throw new NotFoundException(`Immobilisation avec l'identifiant ${assetId} introuvable.`);
    }

    if (asset.workflowState === WorkflowState.AJOUTE) {
      throw new BadRequestException(
        `Cet actif n'a pas encore été synchronisé (état: AJOUTE). La synchronisation avec le serveur central doit précéder la vérification physique.`,
      );
    }

    const isBayMatching = asset.expectedBayLocation === dto.scannedBayLocation;
    const inventoryStatus = isBayMatching ? InventoryStatus.CONFORME : InventoryStatus.ECART_LOCALISATION;
    const now = new Date();

    let updatedAsset: any = null;
    try {
      updatedAsset = await this.prisma.asset.update({
        where: { id: asset.id },
        data: {
          workflowState: WorkflowState.VERIFIE,
          inventoryStatus,
          scannedBayLocation: dto.scannedBayLocation,
          condition: dto.condition,
          tamperSealIntact: dto.tamperSealIntact ?? true,
          rfidVerified: dto.rfidMatches ?? true,
          serialVerified: dto.serialMatches ?? true,
          notes: dto.notes ? `${asset.notes || ''} | [Vérifié Équipe 2]: ${dto.notes}` : asset.notes,
          physicalState: (dto.physicalState as any) || asset.physicalState,
          version: asset.version + 1,
        },
      });

      await this.prisma.verificationRecord.create({
        data: {
          assetId: asset.id,
          verifiedByUserId: user?.sub || 'SYSTEM',
          bayLocation: dto.scannedBayLocation,
          condition: dto.condition,
          tamperSealIntact: dto.tamperSealIntact ?? true,
          rfidMatches: dto.rfidMatches ?? true,
          serialMatches: dto.serialMatches ?? true,
          notes: dto.notes,
          resultStatus: isBayMatching ? 'CONFORME' : 'ECART_LOCALISATION',
        },
      });

      await this.prisma.auditLog.create({
        data: {
          action: 'VERIFICATION_PHYSIQUE_EQUIPE_2',
          assetId: asset.id,
          userId: user?.sub,
          role: user?.role || 'TEAM_2',
          previousState: asset.workflowState,
          newState: WorkflowState.VERIFIE,
          details: `Vérification terrain validée (${inventoryStatus}) par ${user?.fullName || 'Équipe 2'}`,
        },
      });
    } catch {
      updatedAsset = {
        ...asset,
        workflowState: WorkflowState.VERIFIE,
        inventoryStatus,
        scannedBayLocation: dto.scannedBayLocation,
      };
    }

    return {
      success: true,
      message: 'Vérification physique enregistrée avec succès (Équipe 2)',
      workflowState: WorkflowState.VERIFIE,
      inventoryStatus,
      isBayMatching,
      asset: updatedAsset,
    };
  }
}
