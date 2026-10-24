import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../db/supabase.service';

export interface SubsidySlab {
  max_kw: number;
  subsidy_per_kw: number;
}

export interface SubsidyConfig {
  slabs: SubsidySlab[];
  max_subsidy_cap: number;
  disclaimer?: string;
}

@Injectable()
export class SubsidyService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Reads the PM Surya Ghar slabs from `tax_subsidy_config` (never hardcoded, so
   * an MNRE revision only needs a data update) and returns the same values the
   * quotation calculator uses.
   */
  async getConfig() {
    const { data, error } = await this.supabaseService.client
      .from('tax_subsidy_config')
      .select('key, value, source_url, verified_on')
      .eq('key', 'pm_surya_ghar_residential')
      .maybeSingle();

    if (error) throw new Error(`Failed to load subsidy configuration: ${error.message}`);
    if (!data) throw new NotFoundException('Subsidy configuration is not seeded');

    return {
      key: data.key,
      ...(data.value as SubsidyConfig),
      source_url: data.source_url,
      verified_on: data.verified_on,
    };
  }

  /**
   * Applies the slab table: 1-2 kW pays 30k/kW on the first 2 kW; the 3rd kW
   * pays 18k/kW; anything beyond is capped by `max_subsidy_cap` (78k).
   */
  async calculate(capacityKw: number) {
    const config = await this.getConfig();
    const capacity = Math.max(0, Number(capacityKw) || 0);
    const slabs = [...config.slabs].sort((a, b) => a.max_kw - b.max_kw);

    let remaining = capacity;
    let previousMax = 0;
    let subsidy = 0;
    const breakdown: Array<{ from_kw: number; to_kw: number; per_kw: number; amount: number }> = [];

    for (const slab of slabs) {
      if (remaining <= 0) break;
      const bandWidth = Math.max(0, slab.max_kw - previousMax);
      const kwInBand = Math.min(remaining, bandWidth);
      const amount = kwInBand * slab.subsidy_per_kw;
      if (kwInBand > 0) {
        breakdown.push({
          from_kw: previousMax,
          to_kw: previousMax + kwInBand,
          per_kw: slab.subsidy_per_kw,
          amount,
        });
      }
      subsidy += amount;
      remaining -= kwInBand;
      previousMax = slab.max_kw;
    }

    const capped = Math.min(subsidy, config.max_subsidy_cap);

    return {
      capacityKw: capacity,
      eligibleSubsidy: Math.round(capped),
      uncappedSubsidy: Math.round(subsidy),
      cap: config.max_subsidy_cap,
      capped: subsidy > config.max_subsidy_cap,
      breakdown,
      disclaimer: config.disclaimer,
      source_url: config.source_url,
      verified_on: config.verified_on,
    };
  }
}
