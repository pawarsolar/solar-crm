import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../db/supabase.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { CreateComponentDto } from './dto/create-component.dto';

@Injectable()
export class ComponentsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Search components across the org using full-text search + ILIKE fallback.
   * Matches against brand, model, category and specs so every requested brand
   * is discoverable even with partial input.
   */
  async search(
    user: AuthUser,
    filters: {
      q?: string;
      category?: string;
      brand?: string;
      wattage_min?: number;
      wattage_max?: number;
      limit?: number;
      include_inactive?: boolean;
    } = {},
  ) {
    const limit = Math.min(filters.limit || 100, 200);

    // Primary: full-text search via the tsvector maintained by the trigger.
    if (filters.q && filters.q.trim()) {
      const query = filters.q.trim();
      // Use plainto_tsquery so spaces behave intuitively for brand names.
      let req = this.supabaseService.client
        .from('components')
        .select('*')
        .eq('org_id', user.org_id)
        .textSearch('search_vector', query, { type: 'plain', config: 'english' })
        .order('brand')
        .limit(limit);

      if (filters.category) req = req.eq('category', filters.category);
      if (filters.brand) req = req.ilike('brand', filters.brand);
      if (filters.wattage_min) req = req.gte('wattage', filters.wattage_min);
      if (filters.wattage_max) req = req.lte('wattage', filters.wattage_max);
      if (!filters.include_inactive) req = req.eq('is_active', true);

      const { data, error } = await req;
      if (!error && data && data.length > 0) {
        return data;
      }
      // Fall through to ILIKE if FTS returns nothing (e.g. rare tokens).
    }

    // Fallback: case-insensitive match across brand/model/category/specs.
    let req = this.supabaseService.client
      .from('components')
      .select('*')
      .eq('org_id', user.org_id)
      .order('category')
      .order('brand')
      .limit(limit);

    if (filters.q && filters.q.trim()) {
      const term = `%${filters.q.trim()}%`;
      req = req.or(`brand.ilike.${term},model.ilike.${term},category.ilike.${term}`);
    }
    if (filters.category) req = req.eq('category', filters.category);
    if (filters.brand) req = req.ilike('brand', filters.brand);
    if (filters.wattage_min) req = req.gte('wattage', filters.wattage_min);
    if (filters.wattage_max) req = req.lte('wattage', filters.wattage_max);
    if (!filters.include_inactive) req = req.eq('is_active', true);

    const { data, error } = await req;
    if (error) throw new BadRequestException(`Component search failed: ${error.message}`);
    return data || [];
  }

  async listByCategory(user: AuthUser, category: string) {
    const { data, error } = await this.supabaseService.client
      .from('components')
      .select('*')
      .eq('org_id', user.org_id)
      .eq('category', category)
      .eq('is_active', true)
      .order('brand');
    if (error) throw new BadRequestException(`Failed to list components: ${error.message}`);
    return data || [];
  }

  async getBrands(user: AuthUser, category?: string) {
    let req = this.supabaseService.client
      .from('components')
      .select('brand, category')
      .eq('org_id', user.org_id)
      .eq('is_active', true);
    if (category) req = req.eq('category', category);

    const { data, error } = await req;
    if (error) throw new BadRequestException(`Failed to load brands: ${error.message}`);

    // Deduplicate brands per category.
    const seen = new Set<string>();
    const out: Array<{ brand: string; category: string }> = [];
    for (const row of data || []) {
      const key = `${row.category}:${row.brand}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(row);
      }
    }
    out.sort((a, b) => (a.category + a.brand).localeCompare(b.category + b.brand));
    return out;
  }

  async create(dto: CreateComponentDto, user: AuthUser) {
    const { data, error } = await this.supabaseService.client
      .from('components')
      .insert({
        org_id: user.org_id,
        category: dto.category,
        brand: dto.brand.trim(),
        model: dto.model.trim(),
        specs: dto.specs || {},
        price: dto.price ?? null,
        unit: dto.unit || 'piece',
        wattage: dto.wattage ?? null,
        is_active: dto.is_active !== false,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to create component: ${error.message}`);
    return data;
  }

  async upsertMany(components: CreateComponentDto[], user: AuthUser) {
    if (!Array.isArray(components) || components.length === 0) {
      throw new BadRequestException('No components supplied');
    }
    const rows = components.map((c) => ({
      org_id: user.org_id,
      category: c.category,
      brand: c.brand.trim(),
      model: c.model.trim(),
      specs: c.specs || {},
      price: c.price ?? null,
      unit: c.unit || 'piece',
      wattage: c.wattage ?? null,
      is_active: c.is_active !== false,
    }));

    const { data, error } = await this.supabaseService.client
      .from('components')
      .upsert(rows, { onConflict: 'org_id, category, brand, model' })
      .select();

    if (error) throw new BadRequestException(`Failed to upsert components: ${error.message}`);
    return { count: data?.length || 0, components: data };
  }

  async remove(id: string, user: AuthUser) {
    const { data: existing } = await this.supabaseService.client
      .from('components')
      .select('id')
      .eq('id', id)
      .eq('org_id', user.org_id)
      .maybeSingle();
    if (!existing) throw new NotFoundException('Component not found');

    const { error } = await this.supabaseService.client
      .from('components')
      .delete()
      .eq('id', id)
      .eq('org_id', user.org_id);
    if (error) throw new BadRequestException(`Failed to remove component: ${error.message}`);
    return { success: true };
  }
}
