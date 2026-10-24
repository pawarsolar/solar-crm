import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Filter,
  CheckSquare,
  Square,
  MinusSquare,
  UserCheck,
  UserX,
  History,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  GripVertical,
  Check,
  Phone,
  MapPin,
  Calendar,
  Layers,
  Loader2,
  X,
  HelpCircle,
} from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { BulkAllocationModal } from './BulkAllocationModal';
import { AllocationHistoryModal } from './AllocationHistoryModal';

export interface LeadTableRow {
  id: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  state?: string;
  stage: string;
  system_kw?: number;
  monthly_bill?: number;
  value_estimate?: number;
  owner_id?: string;
  owner?: { full_name: string; role: string };
  created_at: string;
}

const PIPELINE_STAGES = [
  'ALL',
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'SURVEY_SCHEDULED',
  'SURVEY_DONE',
  'QUOTATION_SENT',
  'NEGOTIATION',
  'BOOKED',
];

const STAGE_STYLES: Record<string, string> = {
  NEW: 'bg-blue-50 text-blue-700 border-blue-200',
  CONTACTED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  QUALIFIED: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  SURVEY_SCHEDULED: 'bg-amber-50 text-amber-700 border-amber-200',
  SURVEY_DONE: 'bg-amber-100 text-amber-800 border-amber-300',
  QUOTATION_SENT: 'bg-purple-50 text-purple-700 border-purple-200',
  NEGOTIATION: 'bg-orange-50 text-orange-700 border-orange-200',
  BOOKED: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
};

export const BulkAllocationTable: React.FC = () => {
  const queryClient = useQueryClient();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('ALL'); // 'ALL' | 'UNASSIGNED' | userId
  const [cityFilter, setCityFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Selection States
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAllMatchingQuery, setIsAllMatchingQuery] = useState(false);
  const lastClickedIndexRef = useRef<number | null>(null);

  // Drag-and-Select State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
  const [dragCurrentIndex, setDragCurrentIndex] = useState<number | null>(null);
  const [dragMode, setDragMode] = useState<'select' | 'deselect'>('select');

  // Modals
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [showDragTip, setShowDragTip] = useState(true);

  // Fetch staff for filter dropdown
  const { data: staffList = [] } = useQuery<any[]>({
    queryKey: ['staff-workload'],
    queryFn: () => apiRequest('/leads/staff-workload'),
  });

  // Query Leads
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['leads-bulk', stageFilter, assigneeFilter, cityFilter, dateFilter, searchTerm, page, pageSize],
    queryFn: () => {
      const params = new URLSearchParams();
      if (stageFilter !== 'ALL') params.append('stage', stageFilter);
      if (assigneeFilter !== 'ALL') params.append('owner_id', assigneeFilter);
      if (cityFilter !== 'ALL') params.append('city', cityFilter);
      if (dateFilter !== 'ALL') params.append('date_preset', dateFilter);
      if (searchTerm) params.append('q', searchTerm);
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));
      return apiRequest(`/leads?${params.toString()}`);
    },
  });

  const leads: LeadTableRow[] = data?.items || [];
  const totalLeads = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  // Sync selection state if filters change
  useEffect(() => {
    setIsAllMatchingQuery(false);
  }, [stageFilter, assigneeFilter, cityFilter, dateFilter, searchTerm]);

  // Window mouseup listener for drag-selection completion
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging && dragStartIndex !== null && dragCurrentIndex !== null) {
        const start = Math.min(dragStartIndex, dragCurrentIndex);
        const end = Math.max(dragStartIndex, dragCurrentIndex);

        setSelectedIds((prev) => {
          const next = new Set(prev);
          for (let i = start; i <= end; i++) {
            const lead = leads[i];
            if (lead) {
              if (dragMode === 'select') {
                next.add(lead.id);
              } else {
                next.delete(lead.id);
              }
            }
          }
          return next;
        });
      }
      setIsDragging(false);
      setDragStartIndex(null);
      setDragCurrentIndex(null);
    };

    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [isDragging, dragStartIndex, dragCurrentIndex, dragMode, leads]);

  // Drag interaction handlers
  const handleRowMouseDown = (index: number, leadId: string, e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only primary mouse button

    // Shift + Click Range Selection
    if (e.shiftKey && lastClickedIndexRef.current !== null) {
      e.preventDefault();
      const start = Math.min(lastClickedIndexRef.current, index);
      const end = Math.max(lastClickedIndexRef.current, index);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (let i = start; i <= end; i++) {
          if (leads[i]) next.add(leads[i].id);
        }
        return next;
      });
      lastClickedIndexRef.current = index;
      return;
    }

    // Ctrl / Cmd + Click Single Toggle
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(leadId)) next.delete(leadId);
        else next.add(leadId);
        return next;
      });
      lastClickedIndexRef.current = index;
      return;
    }

    // Drag start
    setIsDragging(true);
    setDragStartIndex(index);
    setDragCurrentIndex(index);
    const mode = selectedIds.has(leadId) ? 'deselect' : 'select';
    setDragMode(mode);
    lastClickedIndexRef.current = index;
  };

  const handleRowMouseEnter = (index: number) => {
    if (isDragging) {
      setDragCurrentIndex(index);
    }
  };

  // Check if a row is within the active drag marquee
  const isRowInDragRange = useCallback(
    (index: number) => {
      if (!isDragging || dragStartIndex === null || dragCurrentIndex === null) return false;
      const start = Math.min(dragStartIndex, dragCurrentIndex);
      const end = Math.max(dragStartIndex, dragCurrentIndex);
      return index >= start && index <= end;
    },
    [isDragging, dragStartIndex, dragCurrentIndex],
  );

  // Check if all leads on current page are selected
  const allCurrentPageSelected =
    leads.length > 0 && leads.every((l) => selectedIds.has(l.id));

  const someCurrentPageSelected =
    leads.some((l) => selectedIds.has(l.id)) && !allCurrentPageSelected;

  // Toggle Page Select
  const handleToggleCurrentPage = () => {
    if (allCurrentPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        leads.forEach((l) => next.delete(l.id));
        return next;
      });
      setIsAllMatchingQuery(false);
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        leads.forEach((l) => next.add(l.id));
        return next;
      });
    }
  };

  // Select all leads matching filter
  const handleSelectAllMatchingQuery = () => {
    setIsAllMatchingQuery(true);
    // Also include current page IDs
    setSelectedIds(new Set(leads.map((l) => l.id)));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setIsAllMatchingQuery(false);
  };

  const handleInvertSelection = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      leads.forEach((l) => {
        if (next.has(l.id)) next.delete(l.id);
        else next.add(l.id);
      });
      return next;
    });
    setIsAllMatchingQuery(false);
  };

  const effectiveSelectedCount = isAllMatchingQuery ? totalLeads : selectedIds.size;

  return (
    <div className="space-y-4 select-none pb-12">
      {/* Drag & Select Tip Banner */}
      {showDragTip && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex items-center justify-between text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-amber-500 text-slate-950 font-bold">
              <UserCheck className="w-3.5 h-3.5" />
            </span>
            <span>
              <strong className="font-bold text-slate-900">Spreadsheet Drag-and-Select:</strong> Click and drag your cursor across rows or checkboxes to rapidly select contiguous batches of leads. Supports <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 font-mono text-[10px]">Shift+Click</kbd> for range selection.
            </span>
          </div>
          <button
            onClick={() => setShowDragTip(false)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Control & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search leads by name, phone (+91...), city, or email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs sm:text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
            />
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <History className="w-3.5 h-3.5 text-slate-500" />
              <span>Audit History</span>
            </button>

            <button
              disabled={effectiveSelectedCount === 0}
              onClick={() => setIsAllocationModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-40"
            >
              <UserCheck className="w-4 h-4 font-bold" />
              <span>
                Assign {effectiveSelectedCount > 0 ? `${effectiveSelectedCount.toLocaleString()} Leads` : 'Leads'}
              </span>
            </button>
          </div>
        </div>

        {/* Filter Selectors Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
          {/* Stage Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Stage:</span>
            <select
              value={stageFilter}
              onChange={(e) => {
                setStageFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-semibold py-1 px-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-amber-500"
            >
              {PIPELINE_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Assignee:</span>
            <select
              value={assigneeFilter}
              onChange={(e) => {
                setAssigneeFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-semibold py-1 px-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Leads</option>
              <option value="UNASSIGNED">Unassigned Only (Open Pool)</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.current_leads} leads)
                </option>
              ))}
            </select>
          </div>

          {/* City Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">City:</span>
            <select
              value={cityFilter}
              onChange={(e) => {
                setCityFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-semibold py-1 px-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Cities</option>
              {['Pune', 'Mumbai', 'Nagpur', 'Nashik', 'Aurangabad', 'Thane', 'Kolhapur'].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Import Date Filter */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-slate-400 font-medium">Imported:</span>
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-semibold py-1 px-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Import Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="this_month">This Month</option>
            </select>
          </div>

          {/* Page Size Selector */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-slate-400 font-medium">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="text-xs font-semibold py-1 px-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>
        </div>
      </div>

      {/* Select All Matching Filter Banner */}
      {allCurrentPageSelected && !isAllMatchingQuery && totalLeads > leads.length && (
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300/80 flex items-center justify-between text-xs text-amber-950 animate-fadeIn">
          <span>
            All <strong>{leads.length}</strong> leads on this page are selected.{' '}
            <button
              onClick={handleSelectAllMatchingQuery}
              className="font-bold underline text-amber-900 hover:text-black ml-1"
            >
              Select all {totalLeads.toLocaleString()} leads matching current filters
            </button>
          </span>
          <button
            onClick={handleClearSelection}
            className="text-amber-800 hover:underline font-semibold"
          >
            Clear selection
          </button>
        </div>
      )}

      {isAllMatchingQuery && (
        <div className="p-3 rounded-2xl bg-amber-500 text-slate-950 border border-amber-600 flex items-center justify-between text-xs font-bold animate-fadeIn shadow-xs">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 stroke-[3]" />
            <span>
              All {totalLeads.toLocaleString()} leads matching filters are targeted for bulk allocation.
            </span>
          </div>
          <button
            onClick={handleClearSelection}
            className="text-slate-950 underline hover:opacity-80"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Leads Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Table Header Bar */}
        <div className="p-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
              <input
                type="checkbox"
                checked={allCurrentPageSelected}
                ref={(input) => {
                  if (input) input.indeterminate = someCurrentPageSelected;
                }}
                onChange={handleToggleCurrentPage}
                className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
              />
              <span>Select Page</span>
            </label>

            {effectiveSelectedCount > 0 && (
              <span className="font-bold text-amber-700 bg-amber-100/80 border border-amber-200 px-2.5 py-0.5 rounded-full">
                {effectiveSelectedCount.toLocaleString()} Selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-slate-500">
            {selectedIds.size > 0 && (
              <>
                <button
                  onClick={handleInvertSelection}
                  className="text-slate-600 hover:text-slate-900 font-semibold"
                >
                  Invert
                </button>
                <span className="text-slate-300">•</span>
                <button
                  onClick={handleClearSelection}
                  className="text-slate-600 hover:text-rose-600 font-semibold"
                >
                  Clear
                </button>
              </>
            )}
            <span className="text-slate-400 font-mono text-[11px]">
              Page {page} of {totalPages} ({totalLeads.toLocaleString()} total leads)
            </span>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3.5 w-10 text-center">#</th>
                <th className="py-3 px-4">Customer & Contact</th>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4">System (kW)</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Current Assignee</th>
                <th className="py-3 px-4">Imported Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-500 mx-auto mb-2" />
                    <span>Loading pipeline leads...</span>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <p className="text-sm font-semibold text-slate-700">No leads found matching current filters</p>
                    <button
                      onClick={() => {
                        setStageFilter('ALL');
                        setAssigneeFilter('ALL');
                        setCityFilter('ALL');
                        setSearchTerm('');
                      }}
                      className="mt-2 text-xs font-bold text-amber-600 hover:underline"
                    >
                      Reset all filters
                    </button>
                  </td>
                </tr>
              ) : (
                leads.map((lead, index) => {
                  const isSelected = selectedIds.has(lead.id) || isAllMatchingQuery;
                  const inDrag = isRowInDragRange(index);
                  const isEffectiveSelected = inDrag
                    ? dragMode === 'select'
                    : isSelected;

                  const stageStyle = STAGE_STYLES[lead.stage] || 'bg-slate-100 text-slate-700';

                  return (
                    <tr
                      key={lead.id}
                      onMouseDown={(e) => handleRowMouseDown(index, lead.id, e)}
                      onMouseEnter={() => handleRowMouseEnter(index)}
                      className={`transition-colors cursor-pointer ${
                        inDrag
                          ? 'bg-amber-100/60 ring-1 ring-inset ring-amber-400'
                          : isEffectiveSelected
                            ? 'bg-amber-50/60 font-medium'
                            : index % 2 === 0
                              ? 'bg-white hover:bg-slate-50/80'
                              : 'bg-slate-50/30 hover:bg-slate-50'
                      }`}
                    >
                      {/* Checkbox / Drag Handle */}
                      <td className="py-3 px-3.5 text-center shrink-0">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="checkbox"
                            checked={isEffectiveSelected}
                            onChange={() => {}} // handled by row mouse events
                            className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer pointer-events-none"
                          />
                        </div>
                      </td>

                      {/* Customer Details */}
                      <td className="py-3 px-4">
                        <div className="truncate max-w-xs">
                          <p className="font-bold text-slate-900 truncate">{lead.name}</p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span className="font-mono">{lead.phone}</span>
                            {lead.email && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="truncate">{lead.email}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Stage Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] border font-semibold ${stageStyle}`}>
                          {lead.stage.replace('_', ' ')}
                        </span>
                      </td>

                      {/* System kW & Value */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <p className="font-bold text-slate-800">{lead.system_kw ? `${lead.system_kw} kW` : '—'}</p>
                        {lead.value_estimate ? (
                          <p className="text-[10px] text-slate-400 font-mono">
                            ₹{lead.value_estimate.toLocaleString()}
                          </p>
                        ) : null}
                      </td>

                      {/* Location */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{lead.city || 'Maharashtra'}</span>
                        </div>
                      </td>

                      {/* Assignee */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {lead.owner ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-800 font-bold flex items-center justify-center text-[10px]">
                              {lead.owner.full_name[0]}
                            </div>
                            <span className="font-medium text-slate-800">{lead.owner.full_name}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-500 border border-slate-200">
                            <UserX className="w-3 h-3" />
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Imported Date & Time */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-700">
                            {new Date(lead.created_at).toLocaleDateString()}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(lead.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500">
            Showing <span className="font-bold text-slate-800">{leads.length}</span> of{' '}
            <span className="font-bold text-slate-800">{totalLeads.toLocaleString()}</span> leads
          </div>

          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => setPage(1)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              title="First page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Prev</span>
            </button>

            <span className="px-3 py-1 font-bold text-slate-800 bg-white border border-slate-200 rounded-lg">
              {page} / {totalPages}
            </span>

            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              title="Last page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Action Bar when Leads are selected */}
      {effectiveSelectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-4 animate-slideUp">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-bold text-xs sm:text-sm">
              {effectiveSelectedCount.toLocaleString()} leads selected
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearSelection}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => setIsAllocationModalOpen(true)}
              className="px-4 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all"
            >
              <UserCheck className="w-4 h-4 font-bold" />
              <span>Allocate Now</span>
            </button>
          </div>
        </div>
      )}

      {/* Allocation Drawer / Modal */}
      <BulkAllocationModal
        isOpen={isAllocationModalOpen}
        onClose={() => setIsAllocationModalOpen(false)}
        selectedLeadIds={Array.from(selectedIds)}
        isAllMatchingQuery={isAllMatchingQuery}
        totalMatchingQueryCount={totalLeads}
        currentFilter={{
          stage: stageFilter !== 'ALL' ? stageFilter : undefined,
          owner_id: assigneeFilter !== 'ALL' ? assigneeFilter : undefined,
          city: cityFilter !== 'ALL' ? cityFilter : undefined,
          q: searchTerm || undefined,
        }}
        onSuccess={() => {
          setSelectedIds(new Set());
          setIsAllMatchingQuery(false);
          refetch();
        }}
      />

      {/* Audit History Modal */}
      <AllocationHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />
    </div>
  );
};
