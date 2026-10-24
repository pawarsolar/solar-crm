import { IsString, IsNotEmpty, IsOptional, IsIn, IsDateString } from 'class-validator';

/** Installation milestones, matching the `installations.milestone` check constraint. */
export const INSTALLATION_MILESTONES = [
  'material_dispatch',
  'structure_mounting',
  'module_wiring',
  'inverter_commission',
  'net_metering',
] as const;

export const INSTALLATION_STATUSES = ['pending', 'in_progress', 'completed'] as const;

export class UpsertInstallationDto {
  @IsString()
  @IsNotEmpty({ message: 'lead_id is required' })
  lead_id: string;

  @IsString()
  @IsIn(INSTALLATION_MILESTONES, {
    message: `milestone must be one of: ${INSTALLATION_MILESTONES.join(', ')}`,
  })
  milestone: string;

  @IsString()
  @IsIn(INSTALLATION_STATUSES, {
    message: `status must be one of: ${INSTALLATION_STATUSES.join(', ')}`,
  })
  @IsOptional()
  status?: string;

  @IsDateString({}, { message: 'planned_on must be an ISO date' })
  @IsOptional()
  planned_on?: string;

  @IsDateString({}, { message: 'done_on must be an ISO date' })
  @IsOptional()
  done_on?: string;

  @IsString()
  @IsOptional()
  note?: string;
}

export class UpdateInstallationStatusDto {
  @IsString()
  @IsIn(INSTALLATION_STATUSES, {
    message: `status must be one of: ${INSTALLATION_STATUSES.join(', ')}`,
  })
  status: string;

  @IsDateString({}, { message: 'done_on must be an ISO date' })
  @IsOptional()
  done_on?: string;
}
