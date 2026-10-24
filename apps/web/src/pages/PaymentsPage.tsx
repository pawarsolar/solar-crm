import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  CheckCircle,
  Clock,
  Plus,
  Loader2,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { apiRequest } from '../lib/api';

export const PaymentsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [selectedLeadId, setSelectedLeadId] = useState(searchParams.get('lead_id') || '');
  const [showAddModal, setShowAddModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'booking' | 'advance' | 'milestone' | 'final'>('booking');
  const [mode, setMode] = useState('UPI');
  const [refNo, setRefNo] = useState('');
  const [status, setStatus] = useState<'pending' | 'paid'>('paid');

  const { data: leadsData } = useQuery({
    queryKey: ['leads', 'payments'],
    queryFn: () => apiRequest('/leads?limit=50'),
  });
  const leads = leadsData?.items || [];

  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ['payments', selectedLeadId],
    queryFn: () => apiRequest(`/payments/lead/${selectedLeadId}`),
    enabled: !!selectedLeadId,
  });

  const recordMutation = useMutation({
    mutationFn: () =>
      apiRequest('/payments', {
        method: 'POST',
        body: {
          lead_id: selectedLeadId,
          type,
          amount: Number(amount),
          mode,
          ref_no: refNo,
          status,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', selectedLeadId] });
      setShowAddModal(false);
      setAmount('');
      setRefNo('');
      alert('Payment milestone saved!');
    },
    onError: (err: any) => alert(err.message),
  });

  const summary = paymentsData?.summary || { totalPayable: 0, totalPaid: 0, outstanding: 0 };
  const payments = paymentsData?.payments || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Payments & Milestones</h1>
          <p className="text-xs sm:text-sm text-slate-500">Track booking tokens, advances, and outstanding balances</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          disabled={!selectedLeadId}
          className="p-2 sm:px-4 sm:py-2.5 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold text-xs disabled:opacity-50 flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Record Receipt</span>
        </button>
      </div>

      {/* Lead Selector Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">Select Customer Project:</label>
        <select
          value={selectedLeadId}
          onChange={(e) => setSelectedLeadId(e.target.value)}
          className="w-full sm:flex-1 text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
        >
          <option value="">Choose a customer lead...</option>
          {leads.map((l: any) => (
            <option key={l.id} value={l.id}>
              {l.name} ({l.phone}) - {l.city} - Stage: {l.stage}
            </option>
          ))}
        </select>
      </div>

      {selectedLeadId ? (
        <div className="space-y-6">
          {/* Summary Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <p className="text-xs text-slate-500 font-medium">Total Net Contract</p>
              <h4 className="text-xl font-bold text-slate-900 mt-1">₹{summary.totalPayable.toLocaleString('en-IN')}</h4>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <p className="text-xs text-slate-500 font-medium">Total Collected</p>
              <h4 className="text-xl font-bold text-emerald-600 mt-1">₹{summary.totalPaid.toLocaleString('en-IN')}</h4>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <p className="text-xs text-slate-500 font-medium">Current Outstanding</p>
              <h4 className="text-xl font-bold text-rose-600 mt-1">₹{summary.outstanding.toLocaleString('en-IN')}</h4>
            </div>
          </div>

          {/* Payments Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Milestone Receipts & Invoices</h3>
            </div>
            {isLoading ? (
              <div className="py-12 flex justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              </div>
            ) : payments.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No payment transactions recorded for this customer yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Milestone</th>
                      <th className="py-3 px-4 font-semibold">Amount</th>
                      <th className="py-3 px-4 font-semibold">Mode</th>
                      <th className="py-3 px-4 font-semibold">Ref Number</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-bold text-slate-900 uppercase">{p.type}</td>
                        <td className="py-3 px-4 font-bold text-slate-800">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-slate-600">{p.mode}</td>
                        <td className="py-3 px-4 text-slate-500">{p.ref_no || '-'}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              p.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{p.paid_on || p.due_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
          <DollarSign className="w-10 h-10 text-amber-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Select a lead to inspect payment milestones</p>
        </div>
      )}

      {/* Record Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-slate-900">Record Payment Milestone</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Milestone Stage</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="booking">Booking Token Advance</option>
                  <option value="advance">Procurement Advance (40%)</option>
                  <option value="milestone">Mounting Milestone (40%)</option>
                  <option value="final">Final Net-metering Handover</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Amount (₹) *</label>
                <input
                  type="number"
                  placeholder="e.g. 25000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="UPI">UPI</option>
                    <option value="NEFT">NEFT / RTGS</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="paid">Paid & Cleared</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">UTR / Ref Number</label>
                <input
                  type="text"
                  placeholder="e.g. UPI-TXN-90210"
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => recordMutation.mutate()}
                disabled={!amount || recordMutation.isPending}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400"
              >
                Save Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
