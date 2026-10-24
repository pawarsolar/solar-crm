import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Users,
  UserCheck,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Split,
  Layers,
  Sliders,
  RotateCw,
  ShieldAlert,
} from 'lucide-react';
import { apiRequest } from '../../lib/api';

interface StaffWorkload {
  id: string;
  full_name: string;
  email: string;
  role: string;
  phone?: string;
  team?: { id: string; name: string };
  current_leads: number;
}

interface AllocationPreviewResult {
  total_target_leads: number;
  candidate_leads_count: number;
  already_assigned_count: number;
  unassigned_count: number;
  current_owners_breakdown: Record<string, number>;
  proposed_allocations: {
    user_id: string;
    full_name: string;
    role: string;
    current_leads: number;
    leads_to_assign: number;
    projected_leads: number;
  }[];
  total_planned: number;
  unallocated_count: number;
  conflicts: string[];
  can_execute: boolean;
}

interface BulkAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLeadIds: string[];
  isAllMatchingQuery: boolean;
  totalMatchingQueryCount: number;
  currentFilter: {
    stage?: string;
    owner_id?: string;
    city?: string;
    source?: string;
    q?: string;
    unassigned_only?: boolean;
  };
  onSuccess: (result: { allocated_count: number; batch_id: string }) => void;
}

const ROLE_BADGES: Record<string, { label: string; color: string }> = {
  super_admin: { label: 'Super Admin', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  sales_admin: { label: 'Sales Admin', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  sales_exec: { label: 'Sales Exec', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  telecaller: { label: 'Telecaller', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  surveyor: { label: 'Surveyor', color: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export const BulkAllocationModal: React.FC<BulkAllocationModalProps> = ({
  isOpen,
  onClose,
  selectedLeadIds,
  isAllMatchingQuery,
  totalMatchingQueryCount,
  currentFilter,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  // Strategy: 'single' | 'equal_split' | 'custom_quantities' | 'round_robin'
  const [strategy, setStrategy] = useState<'single' | 'equal_split' | 'custom_quantities' | 'round_robin'>(
    'equal_split',
  );

  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [singleTargetUserId, setSingleTargetUserId] = useState<string>('');
  const [customQuantities, setCustomQuantities] = useState<Record<string, number>>({});
  const [reassignExisting, setReassignExisting] = useState<boolean>(true);
  const [auditNote, setAuditNote] = useState<string>('');
  const [executionResult, setExecutionResult] = useState<any | null>(null);

  // Fetch staff workload
  const { data: staffList = [], isLoading: isLoadingStaff } = useQuery<StaffWorkload[]>({
    queryKey: ['staff-workload'],
    queryFn: () => apiRequest('/leads/staff-workload'),
    enabled: isOpen,
  });

  // Default selection: select all sales_execs and telecallers
  useEffect(() => {
    if (staffList.length > 0 && selectedStaffIds.length === 0) {
      const eligible = staffList.filter((s) => ['sales_exec', 'telecaller'].includes(s.role));
      const ids = (eligible.length > 0 ? eligible : staffList).map((s) => s.id);
      setSelectedStaffIds(ids);
      if (staffList[0]) setSingleTargetUserId(staffList[0].id);
    }
  }, [staffList]);

  // Total pool count
  const effectiveTotalLeads = isAllMatchingQuery
    ? totalMatchingQueryCount
    : selectedLeadIds.length;

  // Toggle staff selection
  const toggleStaffSelection = (id: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  // Build preview payload
  const previewPayload = useMemo(() => {
    const base: any = {
      strategy,
      reassign_existing: reassignExisting,
      note: auditNote || undefined,
    };

    if (isAllMatchingQuery) {
      base.filter = currentFilter;
      base.total_quantity = totalMatchingQueryCount;
    } else {
      base.lead_ids = selectedLeadIds;
    }

    if (strategy === 'single') {
      base.target_user_id = singleTargetUserId;
    } else if (strategy === 'equal_split' || strategy === 'round_robin') {
      base.target_user_ids = selectedStaffIds;
    } else if (strategy === 'custom_quantities') {
      base.allocations = Object.entries(customQuantities)
        .filter(([_, count]) => count > 0)
        .map(([user_id, count]) => ({ user_id, count }));
    }

    return base;
  }, [
    strategy,
    reassignExisting,
    auditNote,
    isAllMatchingQuery,
    currentFilter,
    totalMatchingQueryCount,
    selectedLeadIds,
    singleTargetUserId,
    selectedStaffIds,
    customQuantities,
  ]);

  // Preview Query
  const { data: previewData, isLoading: isPreviewLoading } = useQuery<AllocationPreviewResult>({
    queryKey: ['allocation-preview', previewPayload],
    queryFn: () => apiRequest('/leads/allocate/preview', { method: 'POST', body: previewPayload }),
    enabled:
      isOpen &&
      ((strategy === 'single' && !!singleTargetUserId) ||
        ((strategy === 'equal_split' || strategy === 'round_robin') && selectedStaffIds.length > 0) ||
        (strategy === 'custom_quantities' && Object.values(customQuantities).some((c) => c > 0))),
    staleTime: 500,
  });

  // Helper: Distribute remainder among custom quantities
  const handleAutoDistributeRemainder = () => {
    if (selectedStaffIds.length === 0) return;
    const currentAllocated = Object.entries(customQuantities)
      .filter(([id]) => selectedStaffIds.includes(id))
      .reduce((sum, [_, count]) => sum + (count || 0), 0);

    const remainder = Math.max(0, effectiveTotalLeads - currentAllocated);
    if (remainder <= 0) return;

    const basePerUser = Math.floor(remainder / selectedStaffIds.length);
    const extra = remainder % selectedStaffIds.length;

    const updated = { ...customQuantities };
    selectedStaffIds.forEach((id, index) => {
      const added = basePerUser + (index < extra ? 1 : 0);
      updated[id] = (updated[id] || 0) + added;
    });
    setCustomQuantities(updated);
  };

  // Helper: Equalize all selected in custom quantities
  const handleEqualizeCustom = () => {
    if (selectedStaffIds.length === 0 || effectiveTotalLeads <= 0) return;
    const basePerUser = Math.floor(effectiveTotalLeads / selectedStaffIds.length);
    const extra = effectiveTotalLeads % selectedStaffIds.length;

    const updated: Record<string, number> = {};
    selectedStaffIds.forEach((id, index) => {
      updated[id] = basePerUser + (index < extra ? 1 : 0);
    });
    setCustomQuantities(updated);
  };

  // Mutation: Commit Bulk Allocation
  const allocateMutation = useMutation({
    mutationFn: () => apiRequest('/leads/allocate', { method: 'POST', body: previewPayload }),
    onSuccess: (data) => {
      setExecutionResult(data);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['staff-workload'] });
      queryClient.invalidateQueries({ queryKey: ['allocation-history'] });
      onSuccess(data);
    },
    onError: (err: any) => {
      alert(`Allocation failed: ${err.message}`);
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50/60 to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20">
              <Users className="w-5 h-5 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Bulk Lead Allocation Engine
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-slate-950 shadow-xs">
                  {effectiveTotalLeads.toLocaleString()} Leads Targeted
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAllMatchingQuery
                  ? `Allocating all ${effectiveTotalLeads.toLocaleString()} leads matching current filters`
                  : `Distribute selected ${selectedLeadIds.length.toLocaleString()} leads among eligible staff`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {executionResult ? (
          /* Success Screen */
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-2">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Allocation Completed Successfully!</h3>
            <p className="text-sm text-slate-600 max-w-md">
              Successfully distributed{' '}
              <span className="font-bold text-slate-900">
                {executionResult.allocated_count.toLocaleString()} leads
              </span>{' '}
              in <span className="font-mono text-emerald-600 font-bold">{executionResult.duration_ms}ms</span>.
            </p>

            <div className="w-full max-w-lg p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 mt-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Batch Breakdown ({executionResult.batch_id})
              </span>
              <div className="divide-y divide-slate-100">
                {executionResult.summary?.map((item: any, i: number) => (
                  <div key={i} className="py-2 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{item.full_name}</span>
                    <span className="font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg font-mono">
                      +{item.count.toLocaleString()} leads
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 shadow-md transition-all"
            >
              Done & View Updated Table
            </button>
          </div>
        ) : (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
            {/* Step 1: Strategy Chooser */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                1. Select Allocation Strategy
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  {
                    id: 'equal_split',
                    label: 'Equal Split',
                    desc: 'Divide evenly among staff',
                    icon: Split,
                  },
                  {
                    id: 'custom_quantities',
                    label: 'Custom Quantities',
                    desc: 'Set exact count per staff',
                    icon: Sliders,
                  },
                  {
                    id: 'round_robin',
                    label: 'Round-Robin',
                    desc: 'Sequential 1-by-1 cycling',
                    icon: RotateCw,
                  },
                  {
                    id: 'single',
                    label: 'Single Staff',
                    desc: 'All leads to one assignee',
                    icon: UserCheck,
                  },
                ].map((s) => {
                  const Icon = s.icon;
                  const isSelected = strategy === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStrategy(s.id as any)}
                      className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                            isSelected ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{s.label}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{s.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Eligible Staff Selection & Load */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  2. Target Staff & Current Capacity
                </label>
                {strategy !== 'single' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedStaffIds(staffList.map((s) => s.id))}
                      className="text-[11px] text-amber-600 font-bold hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedStaffIds([])}
                      className="text-[11px] text-slate-500 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {isLoadingStaff ? (
                <div className="py-8 flex items-center justify-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span className="text-xs">Loading staff capacity...</span>
                </div>
              ) : strategy === 'single' ? (
                /* Single Staff Dropdown */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {staffList.map((staff) => {
                    const isSelected = singleTargetUserId === staff.id;
                    const badge = ROLE_BADGES[staff.role] || { label: staff.role, color: 'bg-slate-100' };
                    return (
                      <div
                        key={staff.id}
                        onClick={() => setSingleTargetUserId(staff.id)}
                        className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate mr-2">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs">
                            {staff.full_name[0]}
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-bold text-slate-900 truncate">{staff.full_name}</p>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold ${badge.color}`}>
                              {badge.label}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-slate-400">Current Load</p>
                          <p className="text-xs font-bold text-slate-800">{staff.current_leads.toLocaleString()} leads</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Multi Staff Grid */
                <div className="space-y-2">
                  {strategy === 'custom_quantities' && (
                    <div className="flex items-center justify-between bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/60 text-xs">
                      <span className="text-amber-900 font-medium">
                        Specify exact lead quotas per employee below:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleEqualizeCustom}
                          className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-amber-800 font-bold hover:bg-amber-100 shadow-2xs"
                        >
                          Equalize
                        </button>
                        <button
                          type="button"
                          onClick={handleAutoDistributeRemainder}
                          className="px-2.5 py-1 bg-amber-500 text-slate-950 rounded-lg font-bold hover:bg-amber-400 shadow-2xs"
                        >
                          Fill Remainder
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {staffList.map((staff) => {
                      const isSelected = selectedStaffIds.includes(staff.id);
                      const badge = ROLE_BADGES[staff.role] || { label: staff.role, color: 'bg-slate-100' };
                      return (
                        <div
                          key={staff.id}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'border-amber-500/80 bg-amber-50/30'
                              : 'border-slate-200 bg-white opacity-60'
                          }`}
                        >
                          <label className="flex items-center gap-2.5 cursor-pointer truncate flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleStaffSelection(staff.id)}
                              className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                            />
                            <div className="truncate">
                              <p className="text-xs font-bold text-slate-900 truncate">{staff.full_name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold ${badge.color}`}>
                                  {badge.label}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  Load: {staff.current_leads}
                                </span>
                              </div>
                            </div>
                          </label>

                          {strategy === 'custom_quantities' && isSelected && (
                            <div className="w-24 shrink-0">
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={customQuantities[staff.id] || ''}
                                onChange={(e) =>
                                  setCustomQuantities({
                                    ...customQuantities,
                                    [staff.id]: parseInt(e.target.value) || 0,
                                  })
                                }
                                className="w-full text-xs font-bold text-right py-1.5 px-2 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Reassignment Safeguard & Note */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reassignExisting}
                  onChange={(e) => setReassignExisting(e.target.checked)}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 w-4 h-4 mt-0.5 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Reassign leads that already have an owner
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    If checked, existing ownership will be transferred to target staff. If unchecked, already-assigned leads are skipped and kept with their current owners.
                  </span>
                </div>
              </label>

              <div>
                <input
                  type="text"
                  placeholder="Optional audit reason (e.g. October regional pipeline reallocation)..."
                  value={auditNote}
                  onChange={(e) => setAuditNote(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>

            {/* Step 4: Real-time Live Allocation Summary Card */}
            <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-50/40 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-600" />
                  Live Allocation Summary
                </span>

                {isPreviewLoading && (
                  <span className="flex items-center gap-1 text-[11px] text-amber-700">
                    <Loader2 className="w-3 h-3 animate-spin" /> Calculating...
                  </span>
                )}
              </div>

              {previewData && (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                      <p className="text-[10px] text-slate-400 font-medium">Pool Candidates</p>
                      <p className="text-sm font-bold text-slate-900">
                        {previewData.candidate_leads_count.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                      <p className="text-[10px] text-slate-400 font-medium">To Allocate</p>
                      <p className="text-sm font-bold text-amber-600">
                        {previewData.total_planned.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                      <p className="text-[10px] text-slate-400 font-medium">Remaining Left</p>
                      <p
                        className={`text-sm font-bold ${
                          previewData.unallocated_count === 0 ? 'text-emerald-600' : 'text-slate-700'
                        }`}
                      >
                        {previewData.unallocated_count.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                      <p className="text-[10px] text-slate-400 font-medium">Already Assigned</p>
                      <p className="text-sm font-bold text-slate-700">
                        {previewData.already_assigned_count.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Conflict warnings */}
                  {previewData.conflicts.map((conf, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-amber-100/70 border border-amber-300/80 text-amber-900 text-xs flex items-center gap-2"
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" />
                      <span>{conf}</span>
                    </div>
                  ))}

                  {/* Proposed per-user final loads */}
                  {previewData.proposed_allocations.length > 0 && (
                    <div className="pt-2 border-t border-amber-200/60">
                      <p className="text-[11px] font-bold text-slate-700 mb-1.5">Projected Workloads:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {previewData.proposed_allocations.map((p) => (
                          <div
                            key={p.user_id}
                            className="p-2 rounded-xl bg-white/80 border border-slate-200/80 flex items-center justify-between text-xs"
                          >
                            <span className="font-semibold text-slate-800 truncate mr-2">{p.full_name}</span>
                            <div className="flex items-center gap-1.5 shrink-0 text-[11px]">
                              <span className="text-slate-400">{p.current_leads}</span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span className="text-amber-600 font-bold font-mono">+{p.leads_to_assign}</span>
                              <span className="text-slate-300">=</span>
                              <span className="font-bold text-slate-900 font-mono">{p.projected_leads}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        {!executionResult && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={
                allocateMutation.isPending ||
                !previewData?.can_execute ||
                (previewData?.total_planned || 0) === 0
              }
              onClick={() => allocateMutation.mutate()}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {allocateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Allocating {previewData?.total_planned?.toLocaleString()} Leads...</span>
                </>
              ) : (
                <>
                  <span>
                    Confirm & Allocate {previewData?.total_planned ? `${previewData.total_planned.toLocaleString()} Leads` : ''}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
