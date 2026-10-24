import { IsString, IsNotEmpty, IsOptional, IsIn, IsNumber } from 'class-validator';

export const COMPONENT_CATEGORIES = ['solar_panel', 'solar_inverter', 'mounting_structure', 'solar_cable', 'accessories'] as const;

export class CreateComponentDto {
  @IsString()
  @IsIn(COMPONENT_CATEGORIES)
  category: string;

  @IsString()
  @IsNotEmpty()
  brand: string;

  @IsString()
  @IsNotEmpty()
  model: string;

  @IsOptional()
  specs?: any;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @IsOptional()
  wattage?: number;

  @IsOptional()
  is_active?: boolean;
}
