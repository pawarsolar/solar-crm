import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  Zap,
  Calendar,
  Clock,
  FileSpreadsheet,
  CreditCard,
  Ruler,
  Trash2,
  CheckCircle,
  FileText,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const STAGES = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'SURVEY_SCHEDULED',
  'SURVEY_DONE',
  'QUOTATION_SENT',
  'NEGOTIATION',
  'BOOKED',
  'DOCS_COLLECTION',
  'SUBSIDY_APPLIED',
  'MATERIAL_PROCUREMENT',
  'INSTALLATION',
  'NET_METERING',
  'COMMISSIONED',
  'FINAL_PAYMENT',
  'HANDOVER',
  'AMC/SERVICE',
  'LOST',
];

export const LeadDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'timeline' | 'survey' | 'quotes' | 'payments'>('timeline');
  const [newStage, setNewStage] = useState('');
  const [stageNote, setStageNote] = useState('');
  const [deletionReason, setDeletionReason] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => apiRequest(`/leads/${id}`),
    enabled: !!id,
  });

  const updateStageMutation = useMutation({
    mutationFn: (stage: string) =>
      apiRequest(`/leads/${id}/stage`, {
        method: 'PATCH',
        body: { stage, note: stageNote || 'Updated from lead detail view' },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setStageNote('');
      alert('Lead stage updated successfully');
    },
    onError: (err: any) => alert(err.message),
  });

  const deleteRequestMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/leads/${id}/request-delete`, {
        method: 'POST',
        body: { reason: deletionReason },
      }),
    onSuccess: (res) => {
      setShowDeleteModal(false);
      alert(res.message);
    },
    onError: (err: any) => alert(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
        <p className="text-sm">Loading lead profile...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600 font-medium">Lead not found</p>
        <button
          onClick={() => navigate('/leads')}
          className="mt-3 text-xs font-bold text-amber-600 hover:underline"
        >
          Return to Pipeline
        </button>
      </div>
    );
  }

  const cleanPhone = (lead.phone || '').replace(/[^0-9]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=Hello%20${encodeURIComponent(lead.name)},%20this%20is%20Kyros%20Solar.`;

  return (
    <div className="space-y-6">
      {/* Back button & Title */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/leads')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Pipeline</span>
        </button>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Request Delete</span>
        </button>
      </div>

      {/* Main Lead Header Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{lead.name}</h1>
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                {lead.stage.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {lead.city || 'City not set'}, {lead.state || 'Maharashtra'} • {lead.source || 'Direct'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`tel:${lead.phone}`}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-100"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call ({lead.phone})</span>
            </a>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-500 shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Sizing & Financial Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <p className="text-[11px] text-slate-500 font-medium">System Size</p>
            <p className="text-base font-bold text-slate-900 mt-0.5">{lead.system_kw || '-'} kW</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <p className="text-[11px] text-slate-500 font-medium">Monthly Bill</p>
            <p className="text-base font-bold text-slate-900 mt-0.5">₹{lead.monthly_bill || '-'}</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <p className="text-[11px] text-slate-500 font-medium">Estimated Value</p>
            <p className="text-base font-bold text-slate-900 mt-0.5">
              ₹{Number(lead.value_estimate || 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <p className="text-[11px] text-slate-500 font-medium">Assigned Lead Owner</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">{lead.owner?.full_name || 'Unassigned'}</p>
          </div>
        </div>

        {/* Quick Phase Progress Bar */}
        <div className="pt-2">
          <label className="text-xs font-semibold text-slate-700 block mb-1">Advance Pipeline Stage</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={newStage || lead.stage}
              onChange={(e) => setNewStage(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Stage transition remark..."
              value={stageNote}
              onChange={(e) => setStageNote(e.target.value)}
              className="flex-1 text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            <button
              onClick={() => updateStageMutation.mutate(newStage || lead.stage)}
              disabled={updateStageMutation.isPending}
              className="px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors shadow-sm"
            >
              Update Stage
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        {[
          { key: 'timeline', label: 'Timeline & Remarks', icon: Clock },
          { key: 'survey', label: 'Technical Site Survey', icon: Ruler },
          { key: 'quotes', label: `Quotations (${lead.quotations?.length || 0})`, icon: FileSpreadsheet },
          { key: 'payments', label: `Payments (${lead.payments?.length || 0})`, icon: CreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
                activeTab === tab.key
                  ? 'border-amber-500 text-amber-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {activeTab === 'timeline' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">Pipeline Stage Audit Trail</h3>
          <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {(lead.stage_history || []).map((h: any, i: number) => (
              <div key={h.id || i} className="flex items-start gap-4 pl-1 relative">
                <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-bold z-10 shrink-0">
                  ✓
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900">
                    Phase shifted to <span className="text-amber-700 font-bold">{h.to_stage}</span>
                  </p>
                  {h.note && <p className="text-xs text-slate-500 mt-0.5">{h.note}</p>}
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(h.at).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'survey' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Site Survey Specifications</h3>
          </div>
          {lead.surveys && lead.surveys.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500">Roof Area</p>
                <p className="text-sm font-bold text-slate-900">{lead.surveys[0].roof_area_sqft} sq ft</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500">Shadow Obstruction</p>
                <p className="text-sm font-bold text-slate-900">{lead.surveys[0].shadow_pct}%</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500">Roof Type</p>
                <p className="text-sm font-bold text-slate-900 uppercase">{lead.surveys[0].roof_type || 'RCC'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500">Sanctioned Load</p>
                <p className="text-sm font-bold text-slate-900">{lead.surveys[0].sanctioned_load_kw} kW</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500">Earthing Status</p>
                <p className="text-sm font-bold text-emerald-600">
                  {lead.surveys[0].earthing_ok ? 'Verified OK' : 'Required upgrade'}
                </p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-xs text-amber-700">Recommended Size</p>
                <p className="text-base font-bold text-amber-900">{lead.surveys[0].recommended_kw} kW</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center">No survey completed yet for this customer site.</p>
          )}
        </div>
      )}

      {activeTab === 'quotes' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Issued Solar Quotations</h3>
            <button
              onClick={() => navigate(`/quotations?lead_id=${lead.id}&kw=${lead.system_kw || 3}`)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400"
            >
              + Generate Quote
            </button>
          </div>
          <div className="space-y-3">
            {(lead.quotations || []).map((q: any) => (
              <div
                key={q.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{q.number} ({q.kw} kW)</h4>
                  <p className="text-xs text-slate-500">
                    Gross: ₹{Number(q.total).toLocaleString('en-IN')} • Govt Subsidy: ₹{Number(q.subsidy).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs font-semibold text-emerald-700 mt-1">
                    Net Client Cost: ₹{Number(q.net_cost).toLocaleString('en-IN')}
                  </p>
                </div>
                <a
                  href={`/api/quotations/${q.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 flex items-center gap-1.5 shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-600" />
                  <span>Download PDF</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Payment Milestones</h3>
            <button
              onClick={() => navigate(`/payments?lead_id=${lead.id}`)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400"
            >
              + Record Payment
            </button>
          </div>
          <div className="space-y-3">
            {(lead.payments || []).map((p: any) => (
              <div
                key={p.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-700">{p.type}</p>
                  <p className="text-base font-bold text-slate-900">₹{Number(p.amount).toLocaleString('en-IN')}</p>
                  <p className="text-[11px] text-slate-400">{p.mode} • Ref: {p.ref_no || 'N/A'}</p>
                </div>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    p.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deletion Request Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="font-bold text-slate-900 text-base">Request Lead Deletion</h3>
            <p className="text-xs text-slate-500">
              Sales staff cannot hard-delete records directly. State a clear justification for admin approval:
            </p>
            <textarea
              rows={3}
              required
              placeholder="e.g. Duplicate phone entry or customer firmly requested data deletion under DPDP Act"
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteRequestMutation.mutate()}
                disabled={!deletionReason || deleteRequestMutation.isPending}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-500"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
