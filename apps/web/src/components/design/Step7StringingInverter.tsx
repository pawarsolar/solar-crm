import React, { useState } from 'react';
import { PlacedPanel, PanelString, InverterSpec, SolarPanelSpec, Point2D, RoofType, Obstruction, StructureProfile, InverterPlacement } from './types';
import { Solar3DViewport } from './Solar3DViewport';
import { Cpu, Zap, Sparkles, CheckCircle2, ShieldAlert, Cable, ArrowRight } from 'lucide-react';

interface Step7Props {
  polygon: Point2D[];
  roofType: RoofType;
  heightMeters: number;
  parapetHeightMeters: number;
  obstructions: Obstruction[];
  panels: PlacedPanel[];
  azimuth: number;
  tilt: number;
  structureProfile: StructureProfile;
  structureHeightM: number;
  inverterSpec: InverterSpec;
  panelSpec: SolarPanelSpec;
  strings: PanelString[];
  inverterPosition?: InverterPlacement;
  onUpdateStrings: (strings: PanelString[]) => void;
  onUpdateInverterPosition: (pos: InverterPlacement) => void;
}

export const Step7StringingInverter: React.FC<Step7Props> = ({
  polygon,
  roofType,
  heightMeters,
  parapetHeightMeters,
  obstructions,
  panels,
  azimuth,
  tilt,
  structureProfile,
  structureHeightM,
  inverterSpec,
  panelSpec,
  strings,
  inverterPosition,
  onUpdateStrings,
  onUpdateInverterPosition,
}) => {
  const [placementMode, setPlacementMode] = useState(false);

  // Auto-Stringing Algorithm:
  // Split panels across inverter MPPT trackers within voltage limits
  const handleAutoString = () => {
    if (panels.length === 0) return;

    // Optimal string size = Vmpp_inverter_nominal / Vmp_panel
    // E.g. 360V nominal / 41.8V = 8 to 14 panels per string
    const minPanelsPerString = Math.ceil(inverterSpec.minMpptVolts / panelSpec.vmp);
    const maxPanelsPerString = Math.floor(inverterSpec.maxDcVolts / (panelSpec.voc * 1.15)); // 15% safety factor for cold weather Voc

    const targetPanelsPerString = Math.min(
      maxPanelsPerString,
      Math.max(minPanelsPerString, Math.ceil(panels.length / inverterSpec.mpptCount)),
    );

    const stringColors = ['#06b6d4', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];
    const newStrings: PanelString[] = [];

    const stringCount = Math.max(1, Math.ceil(panels.length / targetPanelsPerString));

    for (let s = 0; s < stringCount; s++) {
      const startIdx = s * targetPanelsPerString;
      const endIdx = Math.min(panels.length, (s + 1) * targetPanelsPerString);
      const strPanels = panels.slice(startIdx, endIdx);

      if (strPanels.length > 0) {
        newStrings.push({
          id: `str_${s + 1}`,
          name: `String #${s + 1}`,
          color: stringColors[s % stringColors.length],
          panelIds: strPanels.map((p) => p.id),
          mpptInput: (s % inverterSpec.mpptCount) + 1,
          totalVmp: Math.round(strPanels.length * panelSpec.vmp * 10) / 10,
          totalVoc: Math.round(strPanels.length * panelSpec.voc * 10) / 10,
          totalKw: Math.round(((strPanels.length * panelSpec.wattage) / 1000) * 100) / 100,
        });
      }
    }

    onUpdateStrings(newStrings);
  };

  const isVoltageSafe = strings.every(
    (s) =>
      s.totalVmp >= inverterSpec.minMpptVolts &&
      s.totalVoc <= inverterSpec.maxDcVolts,
  );

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Step 7: Stringing & Inverter Placement</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Click on 3D building wall to mount the inverter. Use &ldquo;Auto-String&rdquo; to balance DC voltage into MPPT channels.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPlacementMode(!placementMode)}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer ${
              placementMode
                ? 'bg-emerald-500 text-slate-950 border border-emerald-400'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>{placementMode ? 'Click 3D Wall to Place Inverter' : 'Mount Inverter'}</span>
          </button>

          <button
            type="button"
            onClick={handleAutoString}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Auto String Array</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Viewport with Inverter Mount Raycasting */}
        <div className="lg:col-span-2 h-[460px] rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
          <Solar3DViewport
            polygon={polygon}
            roofType={roofType}
            heightMeters={heightMeters}
            parapetHeightMeters={parapetHeightMeters}
            obstructions={obstructions}
            panels={panels}
            azimuth={azimuth}
            tilt={tilt}
            structureProfile={structureProfile}
            structureHeightM={structureHeightM}
            inverterPosition={inverterPosition}
            allowInverterPlacement={placementMode}
            onInverterPlace={(pos) => {
              onUpdateInverterPosition(pos);
              setPlacementMode(false);
            }}
          />
        </div>

        {/* Inverter Specs & String Configuration Cards */}
        <div className="space-y-4">
          {/* Selected Inverter Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-emerald-600" />
                Inverter MPPT Limits
              </h4>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                {inverterSpec.brand}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Inverter Model:</span>
                <span className="font-semibold text-slate-800">{inverterSpec.model}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Rated AC Capacity:</span>
                <span className="font-mono font-bold text-emerald-600">{inverterSpec.capacityKw} kW</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">MPPT Voltage Window:</span>
                <span className="font-mono font-bold text-slate-800">
                  {inverterSpec.minMpptVolts}V – {inverterSpec.maxMpptVolts}V
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Max DC Input Voltage:</span>
                <span className="font-mono font-bold text-rose-600">{inverterSpec.maxDcVolts}V Max</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">MPPT Trackers:</span>
                <span className="font-mono font-bold text-blue-600">{inverterSpec.mpptCount} Inputs</span>
              </div>
            </div>

            {/* Inverter Position Status */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Mount Location:</span>
              <span className="font-semibold text-slate-700">
                {inverterPosition ? 'Mounted on Wall (3D)' : 'Terrace Wall / Ground'}
              </span>
            </div>
          </div>

          {/* Generated Strings List */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Cable className="w-4 h-4 text-blue-600" />
                Electrical Strings ({strings.length})
              </h4>
              {strings.length > 0 && isVoltageSafe && (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Voltage Compliant
                </span>
              )}
            </div>

            {strings.length === 0 ? (
              <div className="text-center p-4 bg-slate-50 rounded-xl text-xs text-slate-400">
                Click &ldquo;Auto String Array&rdquo; to group {panels.length} panels into optimized series strings.
              </div>
            ) : (
              <div className="space-y-2">
                {strings.map((str) => (
                  <div
                    key={str.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: str.color }} />
                        <span className="font-bold text-slate-900">{str.name}</span>
                        <span className="text-[10px] text-slate-500">({str.panelIds.length} Panels)</span>
                      </div>
                      <span className="font-mono font-bold text-slate-700">{str.totalKw} kW</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-600 pt-1 border-t border-slate-200/60">
                      <div>
                        <span>Vmpp: </span>
                        <span className="font-bold text-slate-900">{str.totalVmp}V</span>
                      </div>
                      <div>
                        <span>Voc: </span>
                        <span className="font-bold text-slate-900">{str.totalVoc}V</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
