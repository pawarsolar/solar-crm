import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

/** Message templates a sales user can send from the lead screen. */
export const WHATSAPP_TEMPLATES = [
  'quotation_followup',
  'site_visit_confirmation',
  'payment_reminder',
  'installation_schedule',
  'custom',
] as const;

export class SendWhatsappDto {
  @IsString()
  @IsNotEmpty({ message: 'lead_id is required' })
  lead_id: string;

  @IsString()
  @IsIn(WHATSAPP_TEMPLATES, {
    message: `template must be one of: ${WHATSAPP_TEMPLATES.join(', ')}`,
  })
  template: string;

  @IsString()
  @IsOptional()
  message?: string;
}
