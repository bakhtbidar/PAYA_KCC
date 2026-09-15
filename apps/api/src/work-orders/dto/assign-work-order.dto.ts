import { IsString } from 'class-validator';

/** ADMIN/PROJECT_ENGINEER assigning a checklist to a specific technician. */
export class AssignWorkOrderDto {
  @IsString()
  equipmentId!: string;

  @IsString()
  templateId!: string;

  @IsString()
  assignedToUserId!: string;
}

/** ADMIN/PROJECT_ENGINEER starting a visit themselves, right now — creates an assignment
 * to self, which is then filled out and completed the same way any assignment is. */
export class QuickStartWorkOrderDto {
  @IsString()
  equipmentId!: string;

  @IsString()
  templateId!: string;
}
