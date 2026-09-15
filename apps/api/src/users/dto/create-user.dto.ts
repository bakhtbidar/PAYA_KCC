import { ArrayMinSize, IsArray, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ROLE_CODES, RoleCode } from '../../common/enums';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  fullName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(ROLE_CODES, { each: true })
  roleCodes!: RoleCode[];
}
