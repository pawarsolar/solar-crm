import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  CheckCircle2,
  FileText,
  TrendingUp,
  AlertTriangle,
  Clock,
  Download,
  Share2,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { StatCard } from '../components/ui/StatCard';
import { LeadFunnelChart } from '../components/charts/LeadFunnelChart';
import { apiRequest, downloadFile } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { FeatureGate } from '../components/ui/FeatureGate';

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#64748b'];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [view, setView] = useState<'company' | 'my'>('company');

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', view],
    queryFn: () => apiRequest(`/dashboard/summary?view=${view}`),
    refetchInterval: 30000, // Auto refresh every 30s
  });

  const kpis = data?.kpis || {
    totalLeads: 0,
    bookedLeads: 0,
    quotesSent: 0,
    pipelineValue: 0,
    conversionRate: 0,
    followupsPending: 0,
    stuckCount: 0,
  };

  const handleExportExcel = async () => {
    try {
      await downloadFile('/exports/pipeline.xlsx', 'pipeline.xlsx');
    } catch (err: any) {
      alert(err.message || 'Export failed');
    }
  };

  const handleExportPdf = async () => {
    try {
      await downloadFile('/exports/pipeline.pdf', 'pipeline.pdf');
    } catch (err: any) {
      alert(err.message || 'Export failed');
    }
  };

  const handleShareReport = async () => {
    try {
      const res = await apiRequest('/reports/share', {
        method: 'POST',
        body: { report: 'executive_pipeline_summary' },
      });
      navigator.clipboard.writeText(window.location.origin + res.shareUrl);
      alert('Secure expiring share link copied to clipboard!');
    } catch (err: any) {
      alert(err.message || 'Failed to create share link');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & View Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Solar Pipeline Executive Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-500">Live operational & commercial overview</p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          {['super_admin', 'sales_admin'].includes(user?.role || '') && (
            <div className="bg-slate-200/80 p-1 rounded-xl flex items-center text-xs font-semibold">
              <button
                onClick={() => setView('company')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  view === 'company' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600'
                }`}
              >
                Company View
              </button>
              <button
                onClick={() => setView('my')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  view === 'my' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600'
                }`}
              >
                My Dashboard
              </button>
            </div>
          )}

          <FeatureGate feature="export_excel">
            <button
              onClick={handleExportExcel}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Export Pipeline Excel"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Excel</span>
            </button>
          </FeatureGate>

          <FeatureGate feature="report_share">
            <button
              onClick={handleShareReport}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm shadow-amber-500/20"
              title="Share Expiring Link"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share Link</span>
            </button>
          </FeatureGate>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Inquiries"
          value={isLoading ? '...' : kpis.totalLeads}
          subtitle="Active pipeline leads"
          icon={Users}
          color="amber"
        />
        <StatCard
          title="Booked Closures"
          value={isLoading ? '...' : kpis.bookedLeads}
          subtitle={`Conversion: ${kpis.conversionRate}%`}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Quotations Issued"
          value={isLoading ? '...' : kpis.quotesSent}
          subtitle="PM Surya Ghar proposals"
          icon={FileText}
          color="purple"
        />
        <StatCard
          title="Pipeline Value"
          value={isLoading ? '...' : `₹${(kpis.pipelineValue / 100000).toFixed(1)}L`}
          subtitle="Projected system value"
          icon={TrendingUp}
          color="blue"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Conversion Funnel */}
        <div className="lg:col-span-2">
          <LeadFunnelChart
            data={data?.funnel || []}
            onStageSelect={(stage) => navigate(`/leads?stage=${stage}`)}
            title="Pipeline Conversion Funnel"
            subtitle="Stage progression velocity, drop-offs, and cumulative conversion rate (Click stage to filter leads)"
          />
        </div>

        {/* Source Donut Chart */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-900 text-base mb-1">Leads by Marketing Channel</h3>
          <p className="text-xs text-slate-500 mb-4">Inquiry source breakdown</p>
          <div className="h-56 sm:h-64 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.sources || []}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                >
                  {(data?.sources || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-2 border-t border-slate-100">
            {(data?.sources || []).slice(0, 6).map((src: any, i: number) => (
              <div key={src.name} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="truncate">{src.name}: {src.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stuck Leads Aging Alerts */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">{`Stuck Leads (>7 Days in Stage)`}</h3>
              <p className="text-xs text-slate-500">Requires telecaller/sales intervention</p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800">
            {data?.stuckLeads?.length || 0} Stuck
          </span>
        </div>

        {data?.stuckLeads && data.stuckLeads.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.stuckLeads.map((lead: any) => (
              <div
                key={lead.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{lead.name}</h4>
                  <p className="text-xs text-slate-500">
                    Stage: <span className="font-medium text-amber-700">{lead.stage}</span> ({lead.system_kw || '-'} kW)
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>&gt;7d</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-3 text-center">🎉 No overdue or stuck leads detected in pipeline.</p>
        )}
      </div>
    </div>
  );
};
