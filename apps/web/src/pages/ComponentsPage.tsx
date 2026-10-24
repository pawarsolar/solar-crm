import React, { useEffect, useState } from 'react';
import { componentsApi, Component, COMPONENT_CATEGORY_LABELS } from '../api/components';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Search, Package, SlidersHorizontal, X } from 'lucide-react';

export const ComponentsPage: React.FC = () => {
  const { user, hasFeature } = useAuth();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string>('');
  const [items, setItems] = useState<Component[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = user && ['super_admin', 'sales_admin'].includes(user.role);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await componentsApi.search({ q: q || undefined, category: category || undefined, limit: 200 });
      setItems(Array.isArray(res) ? res : (res as any)?.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load components');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetch();
  };

  const clearFilters = () => {
    setQ('');
    setCategory('');
    setTimeout(fetch, 0);
  };

  if (user && !['super_admin', 'sales_admin', 'sales_exec', 'telecaller', 'installer', 'accounts', 'surveyor'].includes(user.role)) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-3">
          <ShieldAlert className="w-7 h-7 text-rose-500" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Access restricted</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm">Components are only visible to authorised staff.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-500" /> Components Catalogue
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Searchable list of solar panels, inverters, mounting structures, cables and accessories (Adani, Waaree, Vikram, Tata, Kosol, APS, Premier, Renew, Rays, Goldi, Jakson, Microtek, XWatt, Livguard, Havells, Solis, Growatt, Sungrow, JSW, Kamdhenu, Tata Structura, Jindal, Everest, EAPL, RR Kabel, KEI, Polycab, Finolex, Earthing Kit).
          </p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by brand, model, specs (e.g. Waaree, Growatt, 540W)"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
        >
          <option value="">All Categories</option>
          {Object.entries(COMPONENT_CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button type="submit" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-amber-500 text-white hover:bg-amber-600">
          <SlidersHorizontal className="w-4 h-4" /> Search
        </button>
        {(q || category) && (
          <button type="button" onClick={clearFilters} className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border border-slate-200 hover:bg-slate-50">
            <X className="w-4 h-4" /> Clear
          </button>
        )}
      </form>

      {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Category</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Brand</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Model</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Specs</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Price</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Unit</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Wattage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">No components found. Adjust filters or seed data.</td></tr>
              ) : items.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2.5 text-slate-700">{COMPONENT_CATEGORY_LABELS[c.category]}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">{c.brand}</td>
                  <td className="px-4 py-2.5 text-slate-700">{c.model}</td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">{c.specs && Object.keys(c.specs).length ? JSON.stringify(c.specs) : '-'}</td>
                  <td className="px-4 py-2.5 text-slate-700">{c.price != null ? `₹${Number(c.price).toLocaleString('en-IN')}` : '-'}</td>
                  <td className="px-4 py-2.5 text-slate-700">{c.unit || '-'}</td>
                  <td className="px-4 py-2.5 text-slate-700">{c.wattage != null ? `${c.wattage} W` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
