import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../../db/supabase.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { UpsertSurveyDto } from './dto/survey.dto';

@Injectable()
export class SurveysService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /** A survey may only be filed against a lead the caller can actually reach. */
  private async assertLeadInOrg(leadId: string, user: AuthUser) {
    const { data: lead } = await this.supabaseService.client
      .from('leads')
      .select('id, org_id, deleted_at')
      .eq('id', leadId)
      .eq('org_id', user.org_id)
      .maybeSingle();

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${leadId} not found`);
    }
    if (lead.deleted_at) {
      throw new ForbiddenException('Cannot survey a lead that has been deleted');
    }
    return lead;
  }

  async createOrUpdateSurvey(user: AuthUser, body: UpsertSurveyDto) {
    const { lead_id, roof_area_sqft, roof_type, shadow_pct, sanctioned_load_kw, earthing_ok } = body;

    await this.assertLeadInOrg(lead_id, user);

    // Sizing rule: ~100 sq ft per 1 kW solar PV module, shadow discount
    const usableArea = Math.max(0, roof_area_sqft * (1 - (shadow_pct || 0) / 100));
    const calculatedKw = Math.min(
      Math.floor((usableArea / 100) * 10) / 10,
      sanctioned_load_kw || 10,
    );
    const recommended_kw = body.recommended_kw || calculatedKw || 3.0;

    const { data: survey, error } = await this.supabaseService.client
      .from('surveys')
      .insert({
        org_id: user.org_id,
        lead_id,
        surveyor_id: user.id,
        scheduled_at: new Date().toISOString(),
        done_at: new Date().toISOString(),
        roof_area_sqft,
        roof_type,
        shadow_pct,
        sanctioned_load_kw,
        earthing_ok,
        recommended_kw,
        data: { notes: body.notes || null },
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save survey: ${error.message}`);
    }

    // Update lead with surveyed kw and advance stage to SURVEY_DONE
    await this.supabaseService.client
      .from('leads')
      .update({
        system_kw: recommended_kw,
        stage: 'SURVEY_DONE',
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead_id);

    return survey;
  }

  async getSurveyByLead(leadId: string, user: AuthUser) {
    const { data } = await this.supabaseService.client
      .from('surveys')
      .select('*, surveyor:profiles!surveyor_id(full_name, phone)')
      .eq('lead_id', leadId)
      .eq('org_id', user.org_id)
      .order('created_at', { ascending: false })
      .maybeSingle();

    return data;
  }
}
