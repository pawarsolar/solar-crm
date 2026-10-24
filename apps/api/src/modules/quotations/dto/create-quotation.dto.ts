import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  IsArray,
} from 'class-validator';

export class CreateQuotationDto {
  @IsString()
  @IsNotEmpty()
  lead_id: string;

  @IsNumber()
  @Min(0.5, { message: 'System capacity must be at least 0.5 kW' })
  kw: number;

  @IsString()
  @IsOptional()
  panel_brand?: string;

  @IsString()
  @IsOptional()
  inverter_brand?: string;

  @IsNumber()
  @IsOptional()
  tariff_rate?: number; // ₹ per unit (default 8.0)

  @IsNumber()
  @IsOptional()
  monthly_units?: number;

  @IsNumber()
  @IsOptional()
  monthly_bill?: number;

  @IsNumber()
  @IsOptional()
  panel_watt?: number;

  @IsNumber()
  @IsOptional()
  specific_generation?: number;

  @IsNumber()
  @IsOptional()
  target_solar_offset?: number;

  @IsNumber()
  @IsOptional()
  annual_degradation_pct?: number;

  @IsNumber()
  @IsOptional()
  annual_tariff_escalation_pct?: number;

  @IsNumber()
  @IsOptional()
  base_rate_per_kw?: number;

  @IsNumber()
  @IsOptional()
  price_difference?: number; // +/- difference, adjustment or discount

  @IsNumber()
  @IsOptional()
  custom_subsidy?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  revision_of?: string;

  @IsArray()
  @IsOptional()
  custom_items?: Array<{ name: string; qty: number; unit: string; rate: number }>;
}
