import React, { useState } from 'react';
import { SolarPanelSpec, InverterSpec } from './types';
import { SOLAR_PANELS, INVERTERS, calculateCentralSubsidy } from './constants';
import { Search, Zap, CheckCircle2, ShieldCheck, Calculator, Sparkles, AlertCircle } from 'lucide-react';

interface Step4Props {
  selectedPanel: SolarPanelSpec;
  selectedInverter: InverterSpec;
  targetCapacityKw: number;
  usableAreaSqM: number;
  monthlyBill: number;
  tariffRate?: number;
  onSelectPanel: (panel: SolarPanelSpec) => void;
  onSelectInverter: (inverter: InverterSpec) => void;
  onUpdateCapacity: (kw: number) => void;
}

export const Step4ComponentSelection: React.FC<Step4Props> = ({
  selectedPanel,
  selectedInverter,
  targetCapacityKw,
  usableAreaSqM,
  monthlyBill,
  tariffRate = 8.0,
  onSelectPanel,
  onSelectInverter,
  onUpdateCapacity,
}) => {
  const [panelSearch, setPanelSearch] = useState('');
  const [inverterSearch, setInverterSearch] = useState('');

  // Auto calculation logic
  const handleAutoCalcByArea = () => {
    // 1 kW roughly requires 10 sq. meters of unobstructed roof space
    const feasibleKw = Math.max(1, Math.round((usableAreaSqM / 10) * 2) / 2);
    onUpdateCapacity(feasibleKw);
  };

  const handleAutoCalcByBill = () => {
    // Monthly bill / tariff rate = monthly units consumed
    // Average 1 kW generates ~120 units per month in India
    const monthlyUnits = monthlyBill / tariffRate;
    const recommendedKw = Math.max(1, Math.round((monthlyUnits / 120) * 2) / 2);
    onUpdateCapacity(recommendedKw);
  };

  const filteredPanels = SOLAR_PANELS.filter(
    (p) =>
      p.brand.toLowerCase().includes(panelSearch.toLowerCase()) ||
      p.model.toLowerCase().includes(panelSearch.toLowerCase()) ||
      p.technology.toLowerCase().includes(panelSearch.toLowerCase()),
  );

  const filteredInverters = INVERTERS.filter(
    (i) =>
      i.brand.toLowerCase().includes(inverterSearch.toLowerCase()) ||
      i.model.toLowerCase().includes(inverterSearch.toLowerCase()),
  );

  // Approximate panels count based on target kW
  const approxPanelCount = Math.ceil((targetCapacityKw * 1000) / selectedPanel.wattage);
  const actualKw = (approxPanelCount * selectedPanel.wattage) / 1000;
  const centralSubsidy = calculateCentralSubsidy(actualKw);

  return (
    <div className="space-y-6">
      {/* Target Capacity & Auto-Calculate Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-xl border border-slate-700 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block">
              Step 4: System Sizing & Equipment Selection
            </span>
            <h3 className="text-xl font-bold text-white mt-0.5">Target Capacity: {actualKw.toFixed(2)} kW</h3>
            <p className="text-xs text-slate-300 mt-1">
              Select Tier-1 ALMM modules & high-efficiency inverters for PM Surya Ghar subsidy approval.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleAutoCalcByBill}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Calculator className="w-4 h-4" />
              <span>Auto-Size by Bill (₹{monthlyBill}/mo)</span>
            </button>

            <button
              type="button"
              onClick={handleAutoCalcByArea}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white flex items-center gap-1.5 transition-all border border-slate-600 active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Auto-Size by Roof ({Math.round(usableAreaSqM)} m²)</span>
            </button>
          </div>
        </div>

        {/* Live Calculation Summary Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-700/80 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">System Capacity:</span>
            <span className="font-mono font-bold text-lg text-amber-400">{actualKw.toFixed(2)} kW</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Modules Required:</span>
            <span className="font-mono font-bold text-lg text-white">{approxPanelCount} Panels</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Est. Monthly Units:</span>
            <span className="font-mono font-bold text-lg text-emerald-400">
              {Math.round(actualKw * 125)} kWh/mo
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">PM Surya Ghar Subsidy:</span>
            <span className="font-mono font-bold text-lg text-sky-400">₹{centralSubsidy.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Equipment Selection Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel Selection Catalog */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Select Solar Panel Brand & Wattage
            </h4>
            <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold border border-emerald-200">
              ALMM / DCR Approved
            </span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              value={panelSearch}
              onChange={(e) => setPanelSearch(e.target.value)}
              placeholder="Search panel brand (e.g. Tata, Waaree, Adani, 540W)..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-1 focus:ring-amber-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          {/* Panel Cards List */}
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {filteredPanels.map((p) => {
              const isSelected = selectedPanel.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => onSelectPanel(p)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/60 shadow-md ring-2 ring-amber-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-xs">{p.brand}</span>
                      <h5 className="text-xs text-slate-600 font-medium">{p.model}</h5>
                    </div>
                    <span className="text-sm font-mono font-extrabold text-amber-600 bg-amber-100/80 px-2 py-0.5 rounded-md">
                      {p.wattage}W
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-mono">
                    <div>
                      <span>Eff: </span>
                      <span className="font-bold text-slate-700">{p.efficiency}%</span>
                    </div>
                    <div>
                      <span>Vmp: </span>
                      <span className="font-bold text-slate-700">{p.vmp}V</span>
                    </div>
                    <div>
                      <span>Warranty: </span>
                      <span className="font-bold text-slate-700">{p.warrantyYears} yrs</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Inverter Selection Catalog */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Select Grid-Tie Inverter
            </h4>
            <span className="text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-semibold border border-blue-200">
              Dual MPPT High Yield
            </span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              value={inverterSearch}
              onChange={(e) => setInverterSearch(e.target.value)}
              placeholder="Search inverter brand (e.g. Sungrow, Growatt, Solis, 5kW)..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-1 focus:ring-amber-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          {/* Inverter Cards List */}
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {filteredInverters.map((inv) => {
              const isSelected = selectedInverter.id === inv.id;
              return (
                <div
                  key={inv.id}
                  onClick={() => onSelectInverter(inv)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/60 shadow-md ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-xs">{inv.brand}</span>
                      <h5 className="text-xs text-slate-600 font-medium">{inv.model}</h5>
                    </div>
                    <span className="text-sm font-mono font-extrabold text-emerald-600 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                      {inv.capacityKw} kW
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-mono">
                    <div>
                      <span>MPPT: </span>
                      <span className="font-bold text-slate-700">{inv.mpptCount} Trackers</span>
                    </div>
                    <div>
                      <span>V-Range: </span>
                      <span className="font-bold text-slate-700">
                        {inv.minMpptVolts}-{inv.maxMpptVolts}V
                      </span>
                    </div>
                    <div>
                      <span>Eff: </span>
                      <span className="font-bold text-slate-700">{inv.efficiency}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
