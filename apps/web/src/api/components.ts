import { apiRequest } from '../lib/api';

export interface Component {
  id: string;
  org_id: string;
  category: 'solar_panel' | 'solar_inverter' | 'mounting_structure' | 'solar_cable' | 'accessories';
  brand: string;
  model: string;
  specs: Record<string, any>;
  price: number | null;
  unit: string;
  wattage: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ComponentBrandGroup {
  brand: string;
  category: string;
}

export const componentsApi = {
  search: (params: {
    q?: string;
    category?: string;
    brand?: string;
    wattage_min?: number;
    wattage_max?: number;
    limit?: number;
    include_inactive?: boolean;
  } = {}) => {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.category) query.set('category', params.category);
    if (params.brand) query.set('brand', params.brand);
    if (params.wattage_min !== undefined) query.set('wattage_min', String(params.wattage_min));
    if (params.wattage_max !== undefined) query.set('wattage_max', String(params.wattage_max));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.include_inactive) query.set('include_inactive', 'true');
    const qs = query.toString();
    return apiRequest<Component[]>(`/components/search${qs ? `?${qs}` : ''}`);
  },
  brands: (category?: string) => {
    const qs = category ? `?category=${category}` : '';
    return apiRequest<ComponentBrandGroup[]>(`/components/brands${qs}`);
  },
  listByCategory: (category: string) => apiRequest<Component[]>(`/components/category/${category}`),
  create: (body: Partial<Component>) => apiRequest<Component>('/components', { method: 'POST', body }),
  bulk: (components: Partial<Component>[]) =>
    apiRequest<{ count: number; components: Component[] }>('/components/bulk', { method: 'POST', body: { components } }),
  remove: (id: string) => apiRequest<{ success: boolean }>(`/components/${id}`, { method: 'DELETE' }),
};

export const COMPONENT_CATEGORY_LABELS: Record<string, string> = {
  solar_panel: 'Solar Panels (Modules)',
  solar_inverter: 'Solar Inverters',
  mounting_structure: 'Mounting Structures',
  solar_cable: 'Solar Cables',
  accessories: 'Accessories',
};
