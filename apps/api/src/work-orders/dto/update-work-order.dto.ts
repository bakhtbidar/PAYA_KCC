import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

class WorkOrderTaskCorrectionDto {
  @IsString()
  workOrderTaskId!: string;

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
}

/**
 * Corrects an already-completed visit — "I put something wrong." Deliberately narrower
 * than the original submission: it can fix a task's recorded answer, but not silently
 * retract a finding someone already raised (that goes through the findings resolve flow).
 */
export class UpdateWorkOrderDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WorkOrderTaskCorrectionDto)
  tasks!: WorkOrderTaskCorrectionDto[];
}
