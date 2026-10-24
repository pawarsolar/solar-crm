import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../db/supabase.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { SendWhatsappDto } from './dto/send-whatsapp.dto';

@Injectable()
export class WhatsappService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private render(template: string, ctx: { name: string; kw?: number | null; org: string }) {
    const firstName = (ctx.name || 'there').split(' ')[0];
    switch (template) {
      case 'quotation_followup':
        return `Hi ${firstName}, this is ${ctx.org}. Just checking in on the solar proposal we shared${ctx.kw ? ` for your ${ctx.kw} kW system` : ''}. Happy to walk you through the savings — shall I call you today?`;
      case 'site_visit_confirmation':
        return `Hi ${firstName}, confirming your solar site survey with ${ctx.org}. Our engineer will visit as scheduled. Please keep your latest electricity bill handy.`;
      case 'payment_reminder':
        return `Hi ${firstName}, a gentle reminder from ${ctx.org} about the pending payment on your solar project. Let us know if you need the invoice re-sent.`;
      case 'installation_schedule':
        return `Hi ${firstName}, ${ctx.org} here. Your installation crew has been scheduled. We will confirm the exact slot shortly.`;
      default:
        return '';
    }
  }

  /**
   * Builds a click-to-chat deep link. The API never sends the message itself —
   * it only composes the link and records the touchpoint in `lead_activities`,
   * so the salesman's own WhatsApp identity is preserved.
   */
  async buildLink(dto: SendWhatsappDto, user: AuthUser) {
    const { data: lead } = await this.supabaseService.client
      .from('leads')
      .select('id, name, phone, system_kw, org_id, deleted_at, org:orgs(name)')
      .eq('id', dto.lead_id)
      .eq('org_id', user.org_id)
      .maybeSingle();

    if (!lead) throw new NotFoundException(`Lead with ID ${dto.lead_id} not found`);
    if (lead.deleted_at) throw new BadRequestException('Cannot message a deleted lead');
    if (!lead.phone) throw new BadRequestException('This lead has no phone number on record');

    const orgName = (lead as any).org?.name || 'our team';
    const message =
      dto.template === 'custom'
        ? (dto.message || '').trim()
        : this.render(dto.template, { name: lead.name, kw: lead.system_kw, org: orgName });

    if (!message) {
      throw new BadRequestException('A custom template requires a non-empty message');
    }

    const digits = String(lead.phone).replace(/[^0-9]/g, '');
    const withCountry = digits.length === 10 ? `91${digits}` : digits;

    // Record the touchpoint so the activity trail reflects the outreach.
    await this.supabaseService.client.from('lead_activities').insert({
      org_id: user.org_id,
      lead_id: lead.id,
      type: 'whatsapp',
      note: `WhatsApp (${dto.template})`,
      by_user: user.id,
      at: new Date().toISOString(),
    });

    return {
      leadId: lead.id,
      phone: withCountry,
      template: dto.template,
      message,
      whatsappUrl: `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`,
    };
  }
}
