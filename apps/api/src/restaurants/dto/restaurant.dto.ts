import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRestaurantDto {
  @IsString()
  customerId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  addressLine?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;
}

export class UpdateRestaurantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  addressLine?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateSectionDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
