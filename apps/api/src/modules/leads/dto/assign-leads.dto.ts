import { IsArray, IsString, IsOptional, IsObject } from 'class-validator';

export class AssignLeadsDto {
  @IsArray()
  @IsString({ each: true })
  lead_ids: string[];

  @IsString()
  @IsOptional()
  owner_id?: string;

  @IsObject()
  @IsOptional()
  rule?: {
    type: 'round_robin' | 'percent_split';
    target_ids: string[];
    percentages?: number[];
  };
}
