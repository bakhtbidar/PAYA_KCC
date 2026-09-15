import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { NON_CONFORMITY_SEVERITIES, NonConformitySeverity } from '../../common/enums';

export class WorkOrderTaskResultDto {
  @IsString()
  planTaskId!: string;

  @IsOptional()
  @IsBoolean()
  resultBoolean?: boolean;

  @IsOptional()
  @IsNumber()
  resultNumeric?: number;

  @IsOptional()
  @IsString()
  resultText?: string;

  @IsOptional()
  @IsString()
  evidenceNote?: string;

  @IsOptional()
  @IsBoolean()
  isNonConformity?: boolean;

  @IsOptional()
  @IsString()
  nonConformityDescription?: string;

  @IsOptional()
  @IsIn(NON_CONFORMITY_SEVERITIES)
  nonConformitySeverity?: NonConformitySeverity;
}

/** Body for POST /work-orders/:id/complete — submitting a filled-out assigned checklist. */
export class CompleteWorkOrderDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WorkOrderTaskResultDto)
  tasks!: WorkOrderTaskResultDto[];
}
