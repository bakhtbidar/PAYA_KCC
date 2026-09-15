import { IsIn } from 'class-validator';
import { NON_CONFORMITY_STATUSES, NonConformityStatus } from '../../common/enums';

export class UpdateNonConformityDto {
  @IsIn(NON_CONFORMITY_STATUSES)
  status!: NonConformityStatus;
}
