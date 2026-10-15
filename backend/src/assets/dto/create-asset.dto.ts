import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsBoolean } from 'class-validator';
import { WorkflowState, PhysicalState, InventoryStatus } from '../../common/enums';

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  officialCode: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  nameFr?: string;

  @IsString()
  @IsOptional()
  nameAr?: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsNotEmpty()
  serialNumber: string;

  @IsString()
  @IsNotEmpty()
  barcode: string;

  @IsString()
  @IsOptional()
  rfidTag?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  zone?: string;

  @IsString()
  @IsNotEmpty()
  expectedBayLocation: string;

  @IsString()
  @IsOptional()
  scannedBayLocation?: string;

  @IsEnum(WorkflowState)
  @IsOptional()
  workflowState?: WorkflowState;

  @IsEnum(PhysicalState)
  @IsOptional()
  physicalState?: PhysicalState;

  @IsEnum(InventoryStatus)
  @IsOptional()
  inventoryStatus?: InventoryStatus;

  @IsString()
  @IsOptional()
  condition?: string;

  @IsBoolean()
  @IsOptional()
  tamperSealIntact?: boolean;

  @IsNumber()
  @IsOptional()
  weightKg?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}
