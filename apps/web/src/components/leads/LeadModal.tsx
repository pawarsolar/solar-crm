import React, { useState } from 'react';
import { X, Loader2, WifiOff, CheckCircle2, User, Phone, MapPin, Tag, IndianRupee, Zap, FileText } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api';
import { enqueueOfflineLead } from '../../lib/offlineQueue';
import { CustomSelect } from '../ui/CustomSelect';
import { MP_CITIES, LEAD_SOURCES } from '../../data/lead-options';
import { toast } from '../../context/ToastContext';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeadModal: React.FC<LeadModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: 'Indore',
    source: 'company_data',
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

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      city: 'Indore',
      source: 'company_data',
      monthly_bill: '',
      system_kw: '3',
      notes: '',
    });
    setErrorMsg(null);
    setOfflineQueued(false);
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
      toast.success('Lead captured successfully and added to pipeline!');
      onClose();
      resetForm();
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
        const msg = err.message || 'Failed to capture lead';
        setErrorMsg(msg);
        toast.error(msg);
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
      toast.info('Device is offline. Lead saved locally and will auto-sync when online.');
      setTimeout(() => {
        setOfflineQueued(false);
        onClose();
        resetForm();
      }, 1500);
    } catch (e: any) {
      const msg = 'Failed to save to local offline queue: ' + e.message;
      setErrorMsg(msg);
      toast.error(msg);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setOfflineQueued(false);

    // Validate phone number
    const cleanDigits = formData.phone.replace(/[^0-9]/g, '');
    if (cleanDigits.length < 10) {
      const msg = 'Please enter a valid 10-digit Indian mobile number';
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    // If completely offline, enqueue directly into IndexedDB
    if (!navigator.onLine) {
      handleSaveOffline();
      return;
    }

    createMutation.mutate(preparePayload());
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl max-h-[92vh] sm:max-h-[88vh] overflow-y-auto flex flex-col">
        {/* Mobile drag handle */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3 sm:hidden" />

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
            <p className="text-xs text-slate-500">Add Madhya Pradesh & Regional prospect to pipeline</p>
          </div>
          <button
            onClick={() => {
              onClose();
              resetForm();
            }}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {offlineQueued && (
          <div className="my-3 p-3 text-xs rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Saved to Offline Queue! Will automatically synchronize to Solar EPC CRM when online.</span>
          </div>
        )}

        {errorMsg && (
          <div className="my-3 p-3 text-xs rounded-xl bg-rose-50 text-rose-700 border border-rose-200 animate-in fade-in">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-3 flex-1">
          {/* Customer Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Customer Full Name</span>
              <span className="text-amber-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Anand Deshpande / Rajesh Sharma"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full text-sm min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
          </div>

          {/* Mobile Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>Mobile Phone Number</span>
              <span className="text-amber-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-xs font-bold text-slate-400 pointer-events-none">
                +91
              </span>
              <input
                type="tel"
                required
                placeholder="9820123456"
                value={formData.phone.replace(/^\+91/, '')}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full text-sm min-h-[44px] pl-12 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">10-digit Indian mobile number for WhatsApp & SMS quotes</p>
          </div>

          {/* City & Lead Source Custom Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <CustomSelect
                id="lead-city-select"
                label="City / District (MP & Region)"
                required
                options={MP_CITIES}
                value={formData.city}
                onChange={(val) => setFormData({ ...formData, city: val })}
                placeholder="Search MP city or district..."
                searchable={true}
              />
            </div>
            <div>
              <CustomSelect
                id="lead-source-select"
                label="Lead Source Channel"
                required
                options={LEAD_SOURCES}
                value={formData.source}
                onChange={(val) => setFormData({ ...formData, source: val })}
                placeholder="Select lead origin..."
                searchable={true}
              />
            </div>
          </div>

          {/* Monthly Bill & Auto Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
                <span>Monthly Bill (₹)</span>
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 3500"
                value={formData.monthly_bill}
                onChange={(e) => handleBillChange(e.target.value)}
                className="w-full text-sm min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Capacity (kW)</span>
                </label>
                <span className="text-[10px] text-amber-600 font-semibold px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200">
                  Auto-Sized
                </span>
              </div>
              <input
                type="number"
                step="0.5"
                min="1"
                placeholder="e.g. 3.0"
                value={formData.system_kw}
                onChange={(e) => setFormData({ ...formData, system_kw: e.target.value })}
                className="w-full text-sm min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold text-amber-700 transition-all"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Notes / Specific Requirement</span>
            </label>
            <textarea
              rows={2}
              placeholder="e.g. MPPKVVCL connection, RCC roof, interested in PM Surya Ghar Muft Bijli Yojana."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full text-sm min-h-[64px] px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none"
            />
          </div>

          <div className="pt-2 pb-1">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full min-h-[48px] py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm hover:bg-amber-400 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Lead to Pipeline...</span>
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
