import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { DOC_TYPES, DocType } from '../../common/enums';

export class CreateDocumentDto {
  @IsString()
  restaurantId!: string;

  @IsOptional()
  @IsString()
  equipmentId?: string;

  @IsIn(DOC_TYPES)
  docType!: DocType;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  issuingBody?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
