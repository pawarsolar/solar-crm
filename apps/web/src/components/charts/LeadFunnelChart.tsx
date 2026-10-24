import React from 'react';
import {
  TrendingDown,
  ArrowRight,
  Zap,
  Users,
  CheckCircle,
  FileText,
  DollarSign,
  ChevronRight,
} from 'lucide-react';

export interface FunnelStageData {
  stage: string;
  lead_count: number;
  total_kw?: number;
  total_value?: number;
}

interface LeadFunnelChartProps {
  data: FunnelStageData[];
  onStageSelect?: (stage: string) => void;
  selectedStage?: string;
  title?: string;
  subtitle?: string;
}

const STAGE_CONFIG: Record<
  string,
  { label: string; color: string; bgGradient: string; barColor: string }
> = {
  NEW: {
    label: '1. New Inquiries',
    color: 'text-blue-400',
    bgGradient: 'from-blue-500/20 to-blue-500/5',
    barColor: '#3b82f6',
  },
  CONTACTED: {
    label: '2. Contacted',
    color: 'text-indigo-400',
    bgGradient: 'from-indigo-500/20 to-indigo-500/5',
    barColor: '#6366f1',
  },
  QUALIFIED: {
    label: '3. Qualified Roof',
    color: 'text-cyan-400',
    bgGradient: 'from-cyan-500/20 to-cyan-500/5',
    barColor: '#06b6d4',
  },
  SURVEY_SCHEDULED: {
    label: '4. Survey Scheduled',
    color: 'text-amber-400',
    bgGradient: 'from-amber-500/20 to-amber-500/5',
    barColor: '#f59e0b',
  },
  SURVEY_DONE: {
    label: '5. Survey Completed',
    color: 'text-orange-400',
    bgGradient: 'from-orange-500/20 to-orange-500/5',
    barColor: '#f97316',
  },
  QUOTATION_SENT: {
    label: '6. Proposal Sent',
    color: 'text-purple-400',
    bgGradient: 'from-purple-500/20 to-purple-500/5',
    barColor: '#a855f7',
  },
  NEGOTIATION: {
    label: '7. In Negotiation',
    color: 'text-pink-400',
    bgGradient: 'from-pink-500/20 to-pink-500/5',
    barColor: '#ec4899',
  },
  BOOKED: {
    label: '8. Booked / Won',
    color: 'text-emerald-400',
    bgGradient: 'from-emerald-500/20 to-emerald-500/5',
    barColor: '#10b981',
  },
  COMMISSIONED: {
    label: '9. Commissioned',
    color: 'text-teal-400',
    bgGradient: 'from-teal-500/20 to-teal-500/5',
    barColor: '#14b8a6',
  },
};

export const LeadFunnelChart: React.FC<LeadFunnelChartProps> = ({
  data,
  onStageSelect,
  selectedStage,
  title = 'Pipeline Conversion Funnel',
  subtitle = 'Stage progression velocity & drop-off analytics',
}) => {
  // Normalize stages in standard pipeline sequence
  const sequence = [
    'NEW',
    'CONTACTED',
    'QUALIFIED',
    'SURVEY_SCHEDULED',
    'SURVEY_DONE',
    'QUOTATION_SENT',
    'NEGOTIATION',
    'BOOKED',
  ];

  const dataMap = new Map(data.map((d) => [d.stage, d]));
  const stages = sequence.map((st) => {
    const existing = dataMap.get(st);
    return {
      stage: st,
      lead_count: existing ? Number(existing.lead_count) || 0 : 0,
      total_kw: existing ? Number(existing.total_kw) || 0 : 0,
      total_value: existing ? Number(existing.total_value) || 0 : 0,
    };
  });

  const maxCount = Math.max(...stages.map((s) => s.lead_count), 1);
  const topCount = stages[0]?.lead_count || 1;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>{title}</span>
          </h3>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Top of Funnel: {topCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Booked: {stages[stages.length - 1]?.lead_count || 0}</span>
          </div>
        </div>
      </div>

      {/* Funnel Rows */}
      <div className="space-y-2.5">
        {stages.map((stageItem, index) => {
          const cfg = STAGE_CONFIG[stageItem.stage] || {
            label: stageItem.stage,
            color: 'text-slate-300',
            bgGradient: 'from-slate-700/20 to-slate-800/10',
            barColor: '#94a3b8',
          };

          const widthPercent = Math.max(
            Math.round((stageItem.lead_count / maxCount) * 100),
            stageItem.lead_count > 0 ? 8 : 4,
          );

          // Conversion from previous stage
          const prevCount = index > 0 ? stages[index - 1].lead_count : stageItem.lead_count;
          const stepConversion =
            prevCount > 0
              ? Math.min(Math.round((stageItem.lead_count / prevCount) * 100), 100)
              : 0;

          // Conversion from top
          const overallConversion =
            topCount > 0
              ? Math.min(Math.round((stageItem.lead_count / topCount) * 100), 100)
              : 0;

          const isSelected = selectedStage === stageItem.stage;

          return (
            <div
              key={stageItem.stage}
              onClick={() => onStageSelect && onStageSelect(stageItem.stage)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                isSelected
                  ? 'border-amber-500 bg-amber-500/15 shadow-lg shadow-amber-500/10'
                  : 'border-slate-800/70 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/70'
              }`}
            >
              {/* Animated Progress Bar Backdrop */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-gradient-to-r opacity-15 pointer-events-none transition-all duration-500 rounded-r-xl"
                style={{
                  width: `${widthPercent}%`,
                  backgroundColor: cfg.barColor,
                }}
              />

              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                {/* Stage Info */}
                <div className="flex items-center gap-2.5 min-w-[200px]">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cfg.barColor }}
                  />
                  <span className={`text-xs sm:text-sm font-bold ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>

                {/* Metrics Bar */}
                <div className="flex-1 w-full sm:w-auto flex items-center justify-between sm:justify-end gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-100 text-sm">
                      {stageItem.lead_count.toLocaleString()}{' '}
                      <span className="text-[11px] font-normal text-slate-400">leads</span>
                    </span>

                    {stageItem.total_kw ? (
                      <span className="text-[11px] text-amber-400 font-mono hidden md:inline">
                        {Math.round(stageItem.total_kw)} kW
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    {index > 0 && (
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border ${
                          stepConversion >= 70
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : stepConversion >= 40
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        }`}
                        title="Conversion from previous stage"
                      >
                        {stepConversion}% step
                      </span>
                    )}

                    <span
                      className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300"
                      title="Overall conversion rate from top inquiry"
                    >
                      {overallConversion}% total
                    </span>

                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
