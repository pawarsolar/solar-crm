import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  AlertCircle,
  Phone,
  MessageSquare,
  CheckCircle,
  Clock,
  Loader2,
  CalendarCheck,
  User,
  PlusCircle,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Lead } from '../components/leads/LeadCard';

export const FollowupsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [filter, setFilter] = useState<'today' | 'overdue' | 'all'>('today');
  const [scope, setScope] = useState<'my' | 'all'>('my');

  // Followup Logging Modal state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [outcome, setOutcome] = useState('Connected - Interested');
  const [note, setNote] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [stage, setStage] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['leads', 'followups'],
    queryFn: () => apiRequest('/leads?limit=100'),
  });

  const allLeads: Lead[] = data?.items || [];

  // Scoping: Sales Executives usually focus on their assigned leads
  const scopedLeads =
    scope === 'my' && user
      ? allLeads.filter((l) => l.owner?.full_name?.toLowerCase().includes(user.full_name?.toLowerCase() || '') || l.id)
      : allLeads;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const todayLeads = scopedLeads.filter((l) => {
    if (!l.next_followup_at) return false;
    return l.next_followup_at.split('T')[0] === todayStr;
  });

  const overdueLeads = scopedLeads.filter((l) => {
    if (!l.next_followup_at) return false;
    return new Date(l.next_followup_at) < now && l.next_followup_at.split('T')[0] !== todayStr;
  });

  const displayedLeads =
    filter === 'today' ? todayLeads : filter === 'overdue' ? overdueLeads : scopedLeads;

  const logFollowupMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/leads/${selectedLead?.id}/followup`, {
        method: 'POST',
        body: {
          outcome,
          note,
          next_followup_at: nextDate ? new Date(nextDate).toISOString() : undefined,
          stage: stage || undefined,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setSelectedLead(null);
      setNote('');
      setNextDate('');
      setStage('');
      alert('Follow-up activity recorded and pipeline updated!');
    },
    onError: (err: any) => alert(err.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Customer Follow-up Queue</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            For Telecallers and Sales Executives to take follow-ups and advance pipeline
          </p>
        </div>

        {/* View Scope Toggle (My Leads vs Team) */}
        <div className="bg-slate-200/80 p-1 rounded-xl flex items-center text-xs font-semibold">
          <button
            onClick={() => setScope('my')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              scope === 'my' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600'
            }`}
          >
            My Assigned Queue
          </button>
          <button
            onClick={() => setScope('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              scope === 'all' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600'
            }`}
          >
            All Team Leads
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('today')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            filter === 'today'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Today ({todayLeads.length})</span>
        </button>

        <button
          onClick={() => setFilter('overdue')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            filter === 'overdue'
              ? 'bg-rose-500 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          <span>Overdue ({overdueLeads.length})</span>
        </button>

        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          All Scheduled ({scopedLeads.length})
        </button>
      </div>

      {/* Leads List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
          <p className="text-sm">Fetching call queue...</p>
        </div>
      ) : displayedLeads.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
          <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800">Queue is Clear!</p>
          <p className="text-xs text-slate-400 mt-1">No leads pending follow-up in this category.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedLeads.map((lead) => (
            <div
              key={lead.id}
              className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-sm">{lead.name}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {lead.stage}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {lead.city || 'City N/A'} • Capacity: {lead.system_kw || '-'} kW • Owner: {lead.owner?.full_name || 'Sales Staff'}
                </p>
                {lead.next_followup_at && (
                  <p className="text-[11px] font-medium text-amber-700 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Follow-up: {new Date(lead.next_followup_at).toLocaleDateString('en-IN')}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <a
                  href={`tel:${lead.phone}`}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Call</span>
                </a>
                <a
                  href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-500"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
                <button
                  onClick={() => {
                    setSelectedLead(lead);
                    setStage(lead.stage);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-400 shadow-sm"
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>Take Follow-up</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LOG FOLLOW-UP MODAL */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">Record Follow-up Result</h3>
                <p className="text-xs text-slate-500">{selectedLead.name} ({selectedLead.phone})</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Call / Discussion Outcome *</label>
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                >
                  <option value="Connected - Interested">Connected - Highly Interested</option>
                  <option value="Site Survey Scheduled">Site Survey Scheduled</option>
                  <option value="Quotation Under Review">Quotation Under Review</option>
                  <option value="Call Back Requested">Call Back Requested</option>
                  <option value="Negotiation / Price Discussion">Negotiation / Price Discussion</option>
                  <option value="Busy / No Answer">Busy / No Answer</option>
                  <option value="Not Interested">Not Interested</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Update Pipeline Phase</label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-amber-800"
                >
                  <option value="CONTACTED">CONTACTED</option>
                  <option value="QUALIFIED">QUALIFIED</option>
                  <option value="SURVEY_SCHEDULED">SURVEY_SCHEDULED</option>
                  <option value="QUOTATION_SENT">QUOTATION_SENT</option>
                  <option value="NEGOTIATION">NEGOTIATION</option>
                  <option value="BOOKED">BOOKED</option>
                  <option value="LOST">LOST</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Next Follow-up Date</label>
                <input
                  type="date"
                  value={nextDate}
                  onChange={(e) => setNextDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Discussion Remarks / Notes</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Discussed 5kW system with Waaree bifacial modules. Wants to review quote with family."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSelectedLead(null)}
                className="flex-1 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => logFollowupMutation.mutate()}
                disabled={logFollowupMutation.isPending}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400"
              >
                {logFollowupMutation.isPending ? 'Saving...' : 'Save Follow-up'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
