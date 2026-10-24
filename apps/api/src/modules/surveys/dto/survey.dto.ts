import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

/**
 * Site survey submission. Field names mirror the `surveys` table so the payload
 * maps straight through, and every value is validated/sanitised by the global
 * ValidationPipe (previously the controller accepted an unvalidated `any` body).
 */
export class UpsertSurveyDto {
  @IsString()
  @IsNotEmpty({ message: 'A lead_id is required for a site survey' })
  lead_id: string;

  @IsNumber()
  @Min(0, { message: 'roof_area_sqft cannot be negative' })
  roof_area_sqft: number;

  @IsString()
  @IsOptional()
  roof_type?: string;

  @IsNumber()
  @Min(0)
  @Max(100, { message: 'shadow_pct is a percentage between 0 and 100' })
  @IsOptional()
  shadow_pct?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  sanctioned_load_kw?: number;

  @IsBoolean()
  @IsOptional()
  earthing_ok?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  recommended_kw?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
