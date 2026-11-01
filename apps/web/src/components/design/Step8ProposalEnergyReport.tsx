import React from 'react';
import { EnergyReport, ShadowAnalysisSnapshot } from './types';
import { Sun, BatteryCharging, Zap, TrendingUp, BarChart3, AlertCircle, Layers } from 'lucide-react';

interface Step8Props {
  systemKw: number;
  energyReport: EnergyReport;
  snapshots: ShadowAnalysisSnapshot;
  onRefreshSnapshots: () => void;
}

export const Step8ProposalEnergyReport: React.FC<Step8Props> = ({
  systemKw,
  energyReport,
  snapshots,
  onRefreshSnapshots,
}) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const maxMonthly = Math.max(...energyReport.monthlyGenerationKwh, 1);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Step 8: Energy Generation & Technical Loss Analysis</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated simulation capturing morning, noon, and evening shadow models, alongside PVsyst-grade yield calculations.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefreshSnapshots}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
        >
          <Sun className="w-4 h-4 text-amber-400" />
          <span>Refresh 3D Snapshots</span>
        </button>
      </div>

      {/* 3-Stage Shadow Analysis Snapshots (Morning, Noon, Evening) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-500" />
          Rooftop 3D Shadow Analysis Snapshots
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Morning 9:00 AM */}
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-900 flex flex-col">
            <div className="p-2.5 bg-slate-800 border-b border-slate-700 flex justify-between items-center text-xs">
              <span className="font-bold text-amber-400">Morning (09:00 AM)</span>
              <span className="text-[10px] text-slate-300">Azimuth 115° | Low Sun</span>
            </div>
            <div className="h-44 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
              {snapshots.morning ? (
                <img src={snapshots.morning} alt="Morning Shadow Snapshot" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4 text-xs text-slate-500">
                  <Sun className="w-6 h-6 text-amber-500/40 mx-auto mb-1 animate-pulse" />
                  Generating 9 AM Shadow Simulation...
                </div>
              )}
            </div>
            <div className="p-2 text-[11px] bg-slate-900 text-slate-400 text-center border-t border-slate-800">
              Low eastern sun; shadows cast towards West.
            </div>
          </div>

          {/* Noon 12:00 PM */}
          <div className="rounded-xl border-2 border-amber-500/60 overflow-hidden bg-slate-900 flex flex-col shadow-lg">
            <div className="p-2.5 bg-amber-500 text-slate-950 flex justify-between items-center text-xs font-bold">
              <span>Midday Peak (12:00 PM)</span>
              <span className="text-[10px] bg-slate-950 text-amber-400 px-1.5 py-0.5 rounded">0% Shade</span>
            </div>
            <div className="h-44 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
              {snapshots.noon ? (
                <img src={snapshots.noon} alt="Noon Shadow Snapshot" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4 text-xs text-slate-500">
                  <Sun className="w-6 h-6 text-amber-500 mx-auto mb-1 animate-spin" />
                  Generating 12 PM Zenith Simulation...
                </div>
              )}
            </div>
            <div className="p-2 text-[11px] bg-slate-900 text-amber-300 text-center border-t border-slate-800">
              Maximum solar irradiance; peak daily output.
            </div>
          </div>

          {/* Evening 04:00 PM */}
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-900 flex flex-col">
            <div className="p-2.5 bg-slate-800 border-b border-slate-700 flex justify-between items-center text-xs">
              <span className="font-bold text-orange-400">Evening (04:00 PM)</span>
              <span className="text-[10px] text-slate-300">Azimuth 245° | Golden Hour</span>
            </div>
            <div className="h-44 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
              {snapshots.evening ? (
                <img src={snapshots.evening} alt="Evening Shadow Snapshot" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4 text-xs text-slate-500">
                  <Sun className="w-6 h-6 text-orange-500/40 mx-auto mb-1 animate-pulse" />
                  Generating 4 PM Shadow Simulation...
                </div>
              )}
            </div>
            <div className="p-2 text-[11px] bg-slate-900 text-slate-400 text-center border-t border-slate-800">
              Low western sun; shadows cast towards East.
            </div>
          </div>
        </div>
      </div>

      {/* Energy Metrics 4-Grid Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Annual Generation
          </span>
          <div className="text-2xl font-mono font-extrabold text-slate-900 mt-1">
            {energyReport.annualGenerationMwh}{' '}
            <span className="text-sm font-normal text-slate-500">MWh/yr</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
            {(energyReport.annualGenerationMwh * 1000).toLocaleString('en-IN')} Units / year
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Specific Yield
          </span>
          <div className="text-2xl font-mono font-extrabold text-amber-600 mt-1">
            {energyReport.specificYieldKwhPerKwp}{' '}
            <span className="text-sm font-normal text-slate-500">kWh/kWp</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Optimal for Western/Central India</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Performance Ratio
          </span>
          <div className="text-2xl font-mono font-extrabold text-emerald-600 mt-1">
            {energyReport.performanceRatioPct}%
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">Tier-1 High PR Factor</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Daily Average
          </span>
          <div className="text-2xl font-mono font-extrabold text-blue-600 mt-1">
            {energyReport.dailyAvgKwh}{' '}
            <span className="text-sm font-normal text-slate-500">kWh/day</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">~{Math.round(energyReport.dailyAvgKwh * 30)} Units/month</span>
        </div>
      </div>

      {/* Monthly Generation Bar Chart & Losses Breakdown Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Generation Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-600" />
              Monthly Solar Generation Profile (kWh)
            </h4>
            <span className="text-xs font-mono font-bold text-slate-700">
              Peak: March &amp; May
            </span>
          </div>

          {/* Pure CSS Responsive Bar Chart */}
          <div className="pt-6 pb-2">
            <div className="h-48 flex items-end gap-2 sm:gap-3 px-2 border-b border-slate-200">
              {energyReport.monthlyGenerationKwh.map((units, idx) => {
                const heightPct = Math.round((units / maxMonthly) * 100);
                return (
                  <div key={months[idx]} className="flex-1 flex flex-col items-center gap-1 group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
                      {Math.round(units)} kWh
                    </div>
                    {/* Bar */}
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-amber-600 to-amber-400 group-hover:from-amber-500 group-hover:to-amber-300 transition-all shadow-sm"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-900">
                      {months[idx]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Losses Breakdown Table */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-600" />
            System Losses Breakdown
          </h4>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Temperature Derating:</span>
              <span className="font-mono font-bold text-rose-600">
                -{energyReport.losses.temperatureLossPct}%
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Shading Losses (3D):</span>
              <span className="font-mono font-bold text-rose-600">
                -{energyReport.losses.shadingLossPct}%
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Soiling &amp; Dust:</span>
              <span className="font-mono font-bold text-rose-600">
                -{energyReport.losses.soilingLossPct}%
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Inverter Conversion Loss:</span>
              <span className="font-mono font-bold text-rose-600">
                -{energyReport.losses.inverterLossPct}%
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">DC &amp; AC Cable Drop:</span>
              <span className="font-mono font-bold text-rose-600">
                -{energyReport.losses.cableLossPct}%
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Module Mismatch:</span>
              <span className="font-mono font-bold text-rose-600">
                -{energyReport.losses.mismatchLossPct}%
              </span>
            </div>

            <div className="flex justify-between py-1.5 pt-2 border-t-2 border-slate-200 font-bold">
              <span className="text-slate-900">Total System Losses:</span>
              <span className="font-mono text-rose-600">
                -{energyReport.losses.totalLossPct}%
              </span>
            </div>

            <div className="flex justify-between py-1.5 bg-emerald-50 px-2 rounded-lg font-bold text-emerald-900">
              <span>Net Energy Yield:</span>
              <span className="font-mono text-emerald-700">
                {energyReport.losses.netEfficiencyPct}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
