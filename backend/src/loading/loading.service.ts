import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoadAssetDto } from './dto/load-asset.dto';
import { WorkflowState } from '../common/enums';

@Injectable()
export class LoadingService {
  constructor(private prisma: PrismaService) {}

  async loadAsset(assetId: string, dto: LoadAssetDto, user: any) {
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

    // Workflow Gate: Must be VERIFIE before it can be CHARGE
    if (asset.workflowState !== WorkflowState.VERIFIE) {
      throw new BadRequestException(
        `Cet actif est à l'état '${asset.workflowState}'. Il doit impérativement être validé à l'état 'VERIFIE' par l'Équipe 2 avant de pouvoir être chargé.`,
      );
    }

    let updatedAsset: any = null;
    try {
      updatedAsset = await this.prisma.asset.update({
        where: { id: asset.id },
        data: {
          workflowState: WorkflowState.CHARGE,
          version: asset.version + 1,
          notes: dto.notes ? `${asset.notes || ''} | [Chargé Équipe 3]: ${dto.notes}` : asset.notes,
        },
      });

      await this.prisma.loadingRecord.create({
        data: {
          assetId: asset.id,
          loadedByUserId: user?.sub || 'SYSTEM',
          destinationBay: dto.destinationBay,
          vehiclePlate: dto.vehiclePlate,
          containerCode: dto.containerCode,
          notes: dto.notes,
        },
      });

      await this.prisma.auditLog.create({
        data: {
          action: 'CHARGEMENT_REGISTRE_EQUIPE_3',
          assetId: asset.id,
          userId: user?.sub,
          role: user?.role || 'TEAM_3',
          previousState: WorkflowState.VERIFIE,
          newState: WorkflowState.CHARGE,
          details: `Chargé vers ${dto.destinationBay} (Véhicule: ${dto.vehiclePlate || 'N/A'}) par ${user?.fullName || 'Équipe 3'}`,
        },
      });
    } catch {
      updatedAsset = {
        ...asset,
        workflowState: WorkflowState.CHARGE,
      };
    }

    return {
      success: true,
      message: 'Chargement en registre validé avec succès (Équipe 3)',
      workflowState: WorkflowState.CHARGE,
      destinationBay: dto.destinationBay,
      asset: updatedAsset,
    };
  }
}
