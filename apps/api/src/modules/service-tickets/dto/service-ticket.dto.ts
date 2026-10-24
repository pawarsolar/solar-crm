import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const;

export class CreateServiceTicketDto {
  @IsString()
  @IsNotEmpty({ message: 'lead_id is required' })
  lead_id: string;

  @IsString()
  @IsNotEmpty({ message: 'A subject is required' })
  subject: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(TICKET_PRIORITIES, {
    message: `priority must be one of: ${TICKET_PRIORITIES.join(', ')}`,
  })
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  assigned_to?: string;
}

export class UpdateServiceTicketDto {
  @IsString()
  @IsIn(TICKET_STATUSES, {
    message: `status must be one of: ${TICKET_STATUSES.join(', ')}`,
  })
  @IsOptional()
  status?: string;

  @IsString()
  @IsIn(TICKET_PRIORITIES, {
    message: `priority must be one of: ${TICKET_PRIORITIES.join(', ')}`,
  })
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  assigned_to?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
