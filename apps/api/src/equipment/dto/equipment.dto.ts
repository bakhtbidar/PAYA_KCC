import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { RISK_LEVELS, RiskLevel } from '../../common/enums';

export class CreateEquipmentDto {
  @IsString()
  restaurantId!: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsString()
  categoryId!: string;

  @IsOptional()
  @IsString()
  modelId?: string;

  @IsOptional()
  @IsString()
  typeId?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsString()
  locationNote?: string;

  @IsOptional()
  @IsDateString()
  installDate?: string;

  @IsOptional()
  @IsDateString()
  warrantyExpiry?: string;

  @IsOptional()
  @IsIn(RISK_LEVELS)
  riskLevel?: RiskLevel;
}

export class UpdateEquipmentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  typeId?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsString()
  locationNote?: string;

  @IsOptional()
  @IsIn(RISK_LEVELS)
  riskLevel?: RiskLevel;

  @IsOptional()
  @IsIn(['IN_SERVICE', 'OUT_OF_SERVICE', 'RETIRED'])
  status?: string;
}
