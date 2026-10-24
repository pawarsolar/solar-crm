import React, { useState } from 'react';
import { X, Loader2, WifiOff, CheckCircle2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api';
import { enqueueOfflineLead } from '../../lib/offlineQueue';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeadModal: React.FC<LeadModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: 'Pune',
    source: 'FB Ads',
    monthly_bill: '',
    system_kw: '3',
    notes: '',
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [offlineQueued, setOfflineQueued] = useState(false);

  // Auto calculate recommended kW from monthly electricity bill
  const handleBillChange = (billStr: string) => {
    const bill = Number(billStr);
    let calculatedKw = formData.system_kw;
    if (bill > 0) {
      // Benchmark: ₹8/unit tariff, 120 units/kW/month
      const unitsPerMonth = bill / 8;
      calculatedKw = String(Math.max(1, Math.round(unitsPerMonth / 120)));
    }
    setFormData((prev) => ({
      ...prev,
      monthly_bill: billStr,
      system_kw: calculatedKw,
    }));
  };

  const createMutation = useMutation({
    mutationFn: (body: any) =>
      apiRequest('/leads', {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
      setFormData({
        name: '',
        phone: '',
        city: 'Pune',
        source: 'FB Ads',
        monthly_bill: '',
        system_kw: '3',
        notes: '',
      });
      setErrorMsg(null);
    },
    onError: async (err: any) => {
      const isNetworkIssue =
        !navigator.onLine ||
        err?.message?.includes('fetch') ||
        err?.message?.includes('NetworkError') ||
        err?.message?.includes('Failed to fetch');

      if (isNetworkIssue) {
        await handleSaveOffline();
      } else {
        setErrorMsg(err.message || 'Failed to capture lead');
      }
    },
  });

  if (!isOpen) return null;

  const preparePayload = () => {
    let phone = formData.phone.trim();
    if (!phone.startsWith('+91')) {
      phone = `+91${phone.replace(/[^0-9]/g, '')}`;
    }
    return {
      ...formData,
      phone,
      monthly_bill: formData.monthly_bill ? Number(formData.monthly_bill) : undefined,
      system_kw: formData.system_kw ? Number(formData.system_kw) : undefined,
    };
  };

  const handleSaveOffline = async () => {
    try {
      const payload = preparePayload();
      await enqueueOfflineLead(payload);
      setOfflineQueued(true);
      setTimeout(() => {
        setOfflineQueued(false);
        onClose();
        setFormData({
          name: '',
          phone: '',
          city: 'Pune',
          source: 'FB Ads',
          monthly_bill: '',
          system_kw: '3',
          notes: '',
        });
      }, 1800);
    } catch (e: any) {
      setErrorMsg('Failed to save to local offline queue: ' + e.message);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setOfflineQueued(false);

    // If completely offline, enqueue directly into IndexedDB
    if (!navigator.onLine) {
      handleSaveOffline();
      return;
    }

    createMutation.mutate(preparePayload());
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Capture New Lead</h2>
              {!navigator.onLine && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  <WifiOff className="w-2.5 h-2.5" />
                  Offline
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Add prospect to solar pipeline</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {offlineQueued && (
          <div className="my-3 p-3 text-xs rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Saved to Offline Queue! Will automatically synchronize to Kyros CRM when online.</span>
          </div>
        )}

        {errorMsg && (
          <div className="my-3 p-3 text-xs rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Anand Deshpande"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Phone Number *</label>
            <input
              type="tel"
              required
              placeholder="e.g. 9820123456"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <select
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
              >
                <option value="Pune">Pune</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Nashik">Nashik</option>
                <option value="Nagpur">Nagpur</option>
                <option value="Aurangabad">Aurangabad</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lead Source</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
              >
                <option value="FB Ads">FB Ads</option>
                <option value="Google Ads">Google Ads</option>
                <option value="WhatsApp Direct">WhatsApp Direct</option>
                <option value="Referral">Referral</option>
                <option value="Walk-in">Walk-in</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Bill (₹)</label>
              <input
                type="number"
                placeholder="e.g. 3500"
                value={formData.monthly_bill}
                onChange={(e) => handleBillChange(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Capacity (kW)</label>
                <span className="text-[10px] text-amber-600 font-medium flex items-center gap-0.5">
                  <span className="text-[10px] font-semibold">Auto</span>
                </span>
              </div>
              <input
                type="number"
                step="0.5"
                placeholder="e.g. 3.0"
                value={formData.system_kw}
                onChange={(e) => setFormData({ ...formData, system_kw: e.target.value })}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold text-amber-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Requirement</label>
            <textarea
              rows={2}
              placeholder="e.g. 3-phase connection, interested in PM Surya Ghar subsidy."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm hover:bg-amber-400 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-500/20"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Lead...</span>
                </>
              ) : (
                <span>Save Lead to Pipeline</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
