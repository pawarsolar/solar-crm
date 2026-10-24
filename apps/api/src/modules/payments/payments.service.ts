import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../db/supabase.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class PaymentsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async recordPayment(dto: RecordPaymentDto, user: AuthUser) {
    const { data: lead } = await this.supabaseService.client
      .from('leads')
      .select('id, name')
      .eq('id', dto.lead_id)
      .eq('org_id', user.org_id)
      .single();

    if (!lead) throw new NotFoundException('Lead not found');

    const { data: payment, error } = await this.supabaseService.client
      .from('payments')
      .insert({
        org_id: user.org_id,
        lead_id: dto.lead_id,
        quotation_id: dto.quotation_id || null,
        type: dto.type,
        amount: dto.amount,
        due_date: dto.due_date || new Date().toISOString().split('T')[0],
        paid_on: dto.status === 'paid' ? dto.paid_on || new Date().toISOString().split('T')[0] : null,
        mode: dto.mode || 'UPI',
        ref_no: dto.ref_no || null,
        status: dto.status || 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to record payment: ${error.message}`);
    }

    // If booking payment is paid, update lead stage to BOOKED
    if (dto.type === 'booking' && dto.status === 'paid') {
      await this.supabaseService.client
        .from('leads')
        .update({ stage: 'BOOKED', updated_at: new Date().toISOString() })
        .eq('id', dto.lead_id);
    }

    return payment;
  }

  async getPaymentsByLead(leadId: string, user: AuthUser) {
    const { data: payments } = await this.supabaseService.client
      .from('payments')
      .select('*')
      .eq('lead_id', leadId)
      .eq('org_id', user.org_id)
      .order('created_at', { ascending: true });

    // Calculate totals
    const { data: quote } = await this.supabaseService.client
      .from('quotations')
      .select('net_cost, total')
      .eq('lead_id', leadId)
      .eq('org_id', user.org_id)
      .order('created_at', { ascending: false })
      .maybeSingle();

    const targetTotal = quote?.net_cost || quote?.total || 0;
    const paidAmount = (payments || [])
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const outstanding = Math.max(0, targetTotal - paidAmount);

    return {
      payments: payments || [],
      summary: {
        totalPayable: targetTotal,
        totalPaid: paidAmount,
        outstanding,
      },
    };
  }
}
