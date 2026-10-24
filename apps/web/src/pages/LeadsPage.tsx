import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Filter,
  Kanban,
  List as ListIcon,
  Download,
  Loader2,
  Plus,
  Calendar,
  BarChart3,
  ChevronDown,
  UserRoundCheck,
  RotateCcw,
  Trash2,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { LeadCard, Lead } from '../components/leads/LeadCard';
import { LeadModal } from '../components/leads/LeadModal';
import { BulkAllocationTable } from '../components/leads/BulkAllocationTable';
import { LeadFunnelChart } from '../components/charts/LeadFunnelChart';
import { LeadRecoveryBinModal } from '../components/leads/LeadRecoveryBinModal';
import { apiRequest, downloadFile } from '../lib/api';
import { useAuth } from '../context/AuthContext';

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
  'INSTALLATION',
  'COMMISSIONED',
];

const DATE_PRESETS = [
  { value: 'ALL', label: 'All Import Dates' },
  { value: 'today', label: 'Imported Today' },
  { value: 'yesterday', label: 'Imported Yesterday' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'this_month', label: 'This Month' },
];

export const LeadsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user && ['super_admin', 'sales_admin'].includes(user.role);
  const isSuperAdmin = user?.role === 'super_admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [showFunnel, setShowFunnel] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'allocate'>('list');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRecoveryBinOpen, setIsRecoveryBinOpen] = useState(false);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);

  // Fetch recovery bin leads count for Super Admin
  const { data: recoveryBinLeads = [] } = useQuery({
    queryKey: ['lead-recovery-bin'],
    queryFn: () => apiRequest('/leads/recovery/bin'),
    enabled: isSuperAdmin,
  });

  const purgeSeedMutation = useMutation({
    mutationFn: () =>
      apiRequest('/leads/purge-seed', {
        method: 'DELETE',
      }),
    onSuccess: (res) => {
      setIsPurgeModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      alert(res.message || 'All seed pipeline data successfully wiped!');
    },
    onError: (err: any) => alert(err.message || 'Failed to purge seed data'),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['leads', selectedStage, searchTerm, dateFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedStage !== 'ALL') params.append('stage', selectedStage);
      if (dateFilter !== 'ALL') params.append('date_preset', dateFilter);
      if (searchTerm) params.append('q', searchTerm);
      return apiRequest(`/leads?${params.toString()}`);
    },
  });

  const leads: Lead[] = data?.items || [];

  // Compute funnel stage metrics for currently scoped leads
  const funnelData = useMemo(() => {
    const stageCounts: Record<string, { count: number; kw: number }> = {};
    leads.forEach((l) => {
      if (!stageCounts[l.stage]) stageCounts[l.stage] = { count: 0, kw: 0 };
      stageCounts[l.stage].count += 1;
      stageCounts[l.stage].kw += Number(l.system_kw || 0);
    });

    return Object.entries(stageCounts).map(([stage, stats]) => ({
      stage,
      lead_count: stats.count,
      total_kw: stats.kw,
    }));
  }, [leads]);

  const handleDownloadSampleXlsx = async () => {
    try {
      await downloadFile('/leads/import/sample-xlsx', 'lead-import-sample.xlsx');
    } catch (err: any) {
      alert(err.message || 'Download failed');
    }
  };

  const handleDownloadSampleCsv = async () => {
    try {
      await downloadFile('/leads/import/sample-csv', 'lead-import-sample.csv');
    } catch (err: any) {
      alert(err.message || 'Download failed');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Solar Pipeline</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {isAdmin ? `All organization leads (${leads.length})` : `Showing your assigned leads (${leads.length})`}
            {' • '}Filter by import date & lifecycle stage
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
          {/* Funnel Toggle */}
          <button
            onClick={() => setShowFunnel(!showFunnel)}
            className={`p-1.5 px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
              showFunnel
                ? 'bg-amber-500/15 border-amber-500 text-amber-800 font-bold'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Toggle Pipeline Conversion Funnel"
          >
            <BarChart3 className="w-4 h-4 text-amber-600" />
            <span>{showFunnel ? 'Hide Funnel' : 'Pipeline Funnel'}</span>
          </button>

          {/* Super Admin 30-Day Recovery Bin */}
          {isSuperAdmin && (
            <button
              onClick={() => setIsRecoveryBinOpen(true)}
              className="p-1.5 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
              title="Super Admin 30-Day Recovery Bin"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              <span>Recovery Bin</span>
              {recoveryBinLeads.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                  {recoveryBinLeads.length}
                </span>
              )}
            </button>
          )}

          {/* Super Admin Purge Seed Option */}
          {isSuperAdmin && (
            <button
              onClick={() => setIsPurgeModalOpen(true)}
              className="p-1.5 px-2.5 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-100/50 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
              title="Purge seed leads to begin with fresh pipeline data"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Purge Seed Data</span>
            </button>
          )}

          {/* View Mode Toggle */}
          <div className="bg-slate-200/80 p-1 rounded-xl flex items-center text-xs">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600'
              }`}
              title="List View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600'
              }`}
              title="Kanban Board"
            >
              <Kanban className="w-4 h-4" />
            </button>
            {isAdmin && (
              <button
                onClick={() => setViewMode('allocate')}
                className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  viewMode === 'allocate'
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Bulk Lead Allocation & Drag-Select"
              >
                <UserRoundCheck className="w-4 h-4" />
                <span className="text-[11px] font-bold hidden sm:inline">Bulk Allocate</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDownloadSampleXlsx}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              title="Download Excel sample format"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Sample .xlsx</span>
            </button>
            <button
              onClick={handleDownloadSampleCsv}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              title="Download CSV sample format"
            >
              <Download className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Sample .csv</span>
            </button>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {viewMode === 'allocate' ? (
        <BulkAllocationTable />
      ) : (
        <>
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by customer name, phone (+91...), or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
              />
            </div>

            {/* Import Date Range Preset Filter */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white shadow-xs">
              <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer pr-1"
              >
                {DATE_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Horizontal Scrolling Stage Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
              {PIPELINE_STAGES.map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStage(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    selectedStage === st
                      ? 'bg-slate-900 text-white font-bold shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Conversion Funnel Display */}
          {showFunnel && (
            <div className="animate-in fade-in zoom-in-98 duration-200">
              <LeadFunnelChart
                data={funnelData}
                selectedStage={selectedStage}
                onStageSelect={(st) => setSelectedStage(st === selectedStage ? 'ALL' : st)}
                title={isAdmin ? 'Organization Pipeline Conversion Funnel' : 'Your Assigned Leads Conversion Funnel'}
                subtitle={`Conversion rate & drop-off for ${leads.length} leads in current view (Click stage to filter)`}
              />
            </div>
          )}

      {/* Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
          <p className="text-sm">Loading solar inquiries...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-3xl border border-dashed border-slate-200 shadow-xs max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Fresh & Clean Pipeline Ready
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
              The database seed data has been cleared. The sales pipeline is ready for fresh data to be entered or imported by the Super Admin.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-amber-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Fresh Lead</span>
            </button>
            {isSuperAdmin && recoveryBinLeads.length > 0 && (
              <button
                onClick={() => setIsRecoveryBinOpen(true)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                <span>View Recovery Bin ({recoveryBinLeads.length})</span>
              </button>
            )}
            {(searchTerm || selectedStage !== 'ALL' || dateFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSelectedStage('ALL');
                  setSearchTerm('');
                  setDateFilter('ALL');
                }}
                className="px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Reset Search Filters
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      ) : (
        /* Kanban Board View */
        <div className="flex gap-4 overflow-x-auto pb-6">
          {PIPELINE_STAGES.filter((s) => s !== 'ALL').map((stage) => {
            const stageLeads = leads.filter((l) => l.stage === stage);
            return (
              <div
                key={stage}
                className="w-72 shrink-0 bg-slate-100/70 rounded-2xl p-3 border border-slate-200/60 flex flex-col max-h-[75vh]"
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                    {stage.replace('_', ' ')}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-700 shadow-xs border border-slate-200">
                    {stageLeads.length}
                  </span>
                </div>
                <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                  {stageLeads.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} />
                  ))}
                  {stageLeads.length === 0 && (
                    <div className="text-center py-8 text-[11px] text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      No leads in {stage}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  )}

      {/* Add Lead Modal */}
      <LeadModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />

      {/* 30-Day Recovery Bin Modal */}
      <LeadRecoveryBinModal
        isOpen={isRecoveryBinOpen}
        onClose={() => setIsRecoveryBinOpen(false)}
      />

      {/* Purge Seed Confirmation Modal */}
      {isPurgeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200">
                <ShieldAlert className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Purge Pipeline Seed Data</h3>
                <p className="text-xs text-slate-500">Super Admin privileged action</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              This will clear all seed or mock records currently in the sales pipeline so you can start fresh with real leads.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsPurgeModalOpen(false)}
                className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => purgeSeedMutation.mutate()}
                disabled={purgeSeedMutation.isPending}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-500 shadow-sm flex items-center justify-center gap-1.5"
              >
                {purgeSeedMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm & Purge</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
