import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { SITE_ROLES, SiteRole } from '../../common/enums';

export class GrantAccessDto {
  @IsString()
  restaurantId!: string;

  @IsIn(SITE_ROLES)
  roleAtSite!: SiteRole;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
