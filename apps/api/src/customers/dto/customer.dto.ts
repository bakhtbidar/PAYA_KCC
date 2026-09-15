import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsEmail()
  billingEmail?: string;

  @IsOptional()
  @IsString()
  billingAddress?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCustomerDto extends CreateCustomerDto {}
