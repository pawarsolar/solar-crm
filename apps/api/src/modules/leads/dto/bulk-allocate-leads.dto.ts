import {
  IsArray,
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsObject,
  IsIn,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CustomAllocationItemDto {
  @IsString()
  user_id: string;

  @IsNumber()
  @Min(0)
  count: number;
}

export class BulkFilterCriteriaDto {
  @IsString()
  @IsOptional()
  stage?: string;

  @IsString()
  @IsOptional()
  owner_id?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  q?: string;

  @IsBoolean()
  @IsOptional()
  unassigned_only?: boolean;

  @IsString()
  @IsOptional()
  date_from?: string;

  @IsString()
  @IsOptional()
  date_to?: string;
}

export class BulkAllocateDto {
  /** If explicit lead IDs are selected (via drag-and-select or multi-select). */
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  lead_ids?: string[];

  /** Filter criteria when allocating across all filtered query results (e.g. 10,000+ leads). */
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => BulkFilterCriteriaDto)
  filter?: BulkFilterCriteriaDto;

  /** Total quantity limit when allocating from a large filtered pool (e.g. top 5,000 leads). */
  @IsNumber()
  @IsOptional()
  @Min(1)
  total_quantity?: number;

  /** Allocation distribution strategy. */
  @IsString()
  @IsIn(['single', 'equal_split', 'custom_quantities', 'round_robin'])
  strategy: 'single' | 'equal_split' | 'custom_quantities' | 'round_robin';

  /** Target user ID if strategy is 'single'. */
  @IsString()
  @IsOptional()
  target_user_id?: string;

  /** Target user IDs if strategy is 'equal_split' or 'round_robin'. */
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  target_user_ids?: string[];

  /** Per-user custom allocation counts if strategy is 'custom_quantities'. */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomAllocationItemDto)
  @IsOptional()
  allocations?: CustomAllocationItemDto[];

  /** If false, only assigns leads where owner_id is currently null. If true, reassigns existing leads. */
  @IsBoolean()
  @IsOptional()
  reassign_existing?: boolean;

  /** Audit note or operational reason for allocation. */
  @IsString()
  @IsOptional()
  note?: string;
}
