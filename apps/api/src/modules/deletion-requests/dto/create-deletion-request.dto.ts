import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

/** Entities that a non-admin staff member may ask an administrator to delete. */
export const DELETABLE_ENTITIES = ['lead', 'survey', 'quotation', 'payment'] as const;

export class CreateDeletionRequestDto {
  @IsString()
  @IsIn(DELETABLE_ENTITIES, {
    message: `entity must be one of: ${DELETABLE_ENTITIES.join(', ')}`,
  })
  entity: string;

  @IsString()
  @IsNotEmpty({ message: 'entity_id is required' })
  entity_id: string;

  @IsString()
  @IsNotEmpty({ message: 'A reason is required so an administrator can review the request' })
  reason: string;
}

export class DecideDeletionRequestDto {
  @IsString()
  @IsIn(['approve', 'reject'], { message: 'decision must be either approve or reject' })
  @IsOptional()
  decision?: string;

  @IsString()
  @IsOptional()
  note?: string;
}
