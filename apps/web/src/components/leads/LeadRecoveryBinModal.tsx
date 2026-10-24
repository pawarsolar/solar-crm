import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  X,
  Loader2,
  Calendar,
  Phone,
  MapPin,
  Zap,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { apiRequest } from '../../lib/api';

interface RecoverableLead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  state?: string;
  stage: string;
  system_kw?: number;
  deleted_at: string;
  recovery_deadline: string;
  days_remaining: number;
  deleted_by_name?: string;
}

interface LeadRecoveryBinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeadRecoveryBinModal: React.FC<LeadRecoveryBinModalProps> = ({
  isOpen,
  onClose,
}) => {
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading, refetch } = useQuery<RecoverableLead[]>({
    queryKey: ['lead-recovery-bin'],
    queryFn: () => apiRequest('/leads/recovery/bin'),
    enabled: isOpen,
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/leads/${id}/restore`, {
        method: 'POST',
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-recovery-bin'] });
      alert(res.message || 'Lead successfully restored to sales pipeline!');
    },
    onError: (err: any) => alert(err.message || 'Failed to restore lead'),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/leads/${id}/permanent`, {
        method: 'DELETE',
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['lead-recovery-bin'] });
      alert(res.message || 'Lead permanently deleted from system');
    },
    onError: (err: any) => alert(err.message || 'Failed to permanently delete lead'),
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  Lead Recovery Bin
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {leads.length} in bin
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                30-day safety recovery window • Only Super Admin can restore or permanently erase leads
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational Banner */}
        <div className="px-5 sm:px-6 py-2.5 bg-amber-50/70 border-b border-amber-200/50 flex items-center gap-2 text-xs text-amber-900">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Leads deleted from pipeline remain recoverable here for <strong>30 days</strong>. If not restored, they are permanently purged automatically upon deadline.
          </span>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin text-amber-500 mb-2" />
              <p className="text-xs">Loading recovery bin records...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-16 px-4 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Recovery Bin is Empty</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                There are no soft-deleted leads pending recovery. Leads removed by Super Admin will appear here for 30 days.
              </p>
            </div>
          ) : (
            leads.map((lead) => {
              const daysLeft = lead.days_remaining ?? 30;
              const isUrgent = daysLeft <= 5;

              return (
                <div
                  key={lead.id}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white transition-all shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-sm">{lead.name}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {lead.stage}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                          isUrgent
                            ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        <span>{daysLeft} days remaining</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{lead.phone}</span>
                      </div>
                      {lead.city && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{lead.city}</span>
                        </div>
                      )}
                      {lead.system_kw && (
                        <div className="flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span>{lead.system_kw} kW</span>
                        </div>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>
                        Deleted on{' '}
                        {new Date(lead.deleted_at).toLocaleDateString()}{' '}
                        {new Date(lead.deleted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => restoreMutation.mutate(lead.id)}
                      disabled={restoreMutation.isPending}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
                      title="Restore lead back to active sales pipeline"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore Lead</span>
                    </button>

                    <button
                      onClick={() => {
                        if (
                          confirm(
                            `Are you sure you want to permanently erase "${lead.name}"? This action CANNOT be undone.`,
                          )
                        ) {
                          permanentDeleteMutation.mutate(lead.id);
                        }
                      }}
                      disabled={permanentDeleteMutation.isPending}
                      className="p-1.5 px-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold text-xs flex items-center gap-1 transition-all"
                      title="Permanently erase record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Purge</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50 rounded-b-3xl">
          <span>Total recoverable leads: {leads.length}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
