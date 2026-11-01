import React, { useRef } from 'react';
import { InverterSpec, PanelString, SolarPanelSpec } from './types';
import { Download, FileDown, ShieldCheck, Zap, ArrowRight, Cable, CheckCircle } from 'lucide-react';

interface Step9Props {
  systemKw: number;
  panelSpec: SolarPanelSpec;
  inverterSpec: InverterSpec;
  strings: PanelString[];
  customerName?: string;
  locationAddress?: string;
}

export const Step9SingleLineDiagram: React.FC<Step9Props> = ({
  systemKw,
  panelSpec,
  inverterSpec,
  strings,
  customerName = 'Solar Customer',
  locationAddress = 'Site Location',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const handleDownloadSvg = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `SLD_${customerName.replace(/\s+/g, '_')}_${systemKw}kW.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Step 9: Single Line Diagram (SLD) Schematic</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-generated electrical schematic diagram for DISCOM net metering sanction and installation safety compliance.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadSvg}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4 text-amber-400" />
          <span>Download Electrical SLD</span>
        </button>
      </div>

      {/* Interactive & Downloadable Vector SVG Diagram */}
      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-2xl overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox="0 0 980 440"
          className="w-full min-w-[880px] h-auto select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background Grid Pattern */}
          <defs>
            <pattern id="sldGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
            </pattern>
            <linearGradient id="panelGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="invGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>
          </defs>

          <rect width="980" height="440" fill="#090d16" />
          <rect width="980" height="440" fill="url(#sldGrid)" />

          {/* Title Block Header */}
          <rect x="20" y="15" width="940" height="40" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="1" />
          <text x="35" y="38" fill="#f8fafc" fontSize="13" fontWeight="bold" fontFamily="sans-serif">
            KYROS SOLAR EPC — SINGLE LINE DIAGRAM (SLD) | {systemKw} kW ON-GRID SOLAR PV SYSTEM
          </text>
          <text x="750" y="38" fill="#94a3b8" fontSize="11" fontFamily="monospace">
            DISCOM NET-METER COMPLIANT
          </text>

          {/* 1. PV ARRAY SECTION */}
          <g transform="translate(30, 80)">
            <rect width="180" height="300" rx="12" fill="#0f172a" stroke="#3b82f6" strokeWidth="1.5" />
            <text x="90" y="25" fill="#60a5fa" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
              SOLAR PV ARRAY
            </text>
            <text x="90" y="42" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="sans-serif">
              {panelSpec.brand} ({panelSpec.wattage}W)
            </text>

            {/* String 1 Box */}
            <rect x="15" y="60" width="150" height="90" rx="8" fill="url(#panelGrad)" stroke="#38bdf8" strokeWidth="1" />
            <text x="25" y="80" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
              STRING #1
            </text>
            <text x="25" y="98" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
              {strings[0]?.panelIds.length || Math.ceil(systemKw / 2 / 0.54)} × {panelSpec.wattage}W Modules
            </text>
            <text x="25" y="115" fill="#f59e0b" fontSize="9" fontFamily="monospace">
              Voc: {strings[0]?.totalVoc || 450}V | Imp: {panelSpec.imp}A
            </text>
            <text x="25" y="132" fill="#10b981" fontSize="9" fontFamily="monospace">
              Power: {strings[0]?.totalKw || (systemKw / 2).toFixed(1)} kW DC
            </text>

            {/* String 2 Box */}
            <rect x="15" y="165" width="150" height="90" rx="8" fill="url(#panelGrad)" stroke="#f59e0b" strokeWidth="1" />
            <text x="25" y="185" fill="#f59e0b" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
              STRING #2
            </text>
            <text x="25" y="203" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
              {strings[1]?.panelIds.length || Math.floor(systemKw / 2 / 0.54)} × {panelSpec.wattage}W Modules
            </text>
            <text x="25" y="220" fill="#f59e0b" fontSize="9" fontFamily="monospace">
              Voc: {strings[1]?.totalVoc || 450}V | Imp: {panelSpec.imp}A
            </text>
            <text x="25" y="237" fill="#10b981" fontSize="9" fontFamily="monospace">
              Power: {strings[1]?.totalKw || (systemKw / 2).toFixed(1)} kW DC
            </text>

            <text x="90" y="280" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="monospace">
              4 sq.mm Solar DC Cables
            </text>
          </g>

          {/* Wiring: PV to DCDB */}
          <path d="M 210 185 L 260 185" stroke="#38bdf8" strokeWidth="3" fill="none" />
          <path d="M 210 290 L 260 290" stroke="#f59e0b" strokeWidth="3" fill="none" />

          {/* 2. DCDB SECTION */}
          <g transform="translate(260, 110)">
            <rect width="130" height="240" rx="12" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.5" />
            <text x="65" y="25" fill="#f59e0b" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
              DCDB
            </text>
            <text x="65" y="40" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="sans-serif">
              DC Protection Box
            </text>

            {/* Components inside DCDB */}
            <rect x="15" y="55" width="100" height="32" rx="4" fill="#1e293b" stroke="#64748b" />
            <text x="65" y="75" fill="#f8fafc" fontSize="9" textAnchor="middle" fontFamily="sans-serif">
              1000V DC SPD Type II
            </text>

            <rect x="15" y="95" width="100" height="32" rx="4" fill="#1e293b" stroke="#64748b" />
            <text x="65" y="115" fill="#f8fafc" fontSize="9" textAnchor="middle" fontFamily="sans-serif">
              15A gPV DC Fuses (x4)
            </text>

            <rect x="15" y="135" width="100" height="32" rx="4" fill="#1e293b" stroke="#64748b" />
            <text x="65" y="155" fill="#f8fafc" fontSize="9" textAnchor="middle" fontFamily="sans-serif">
              32A DC MCB / Isolator
            </text>

            {/* Earth Symbol */}
            <path d="M 65 190 L 65 205 M 55 205 L 75 205 M 58 210 L 72 210 M 61 215 L 69 215" stroke="#10b981" strokeWidth="1.5" />
            <text x="65" y="230" fill="#10b981" fontSize="8" textAnchor="middle" fontFamily="monospace">
              Earth Pit #1
            </text>
          </g>

          {/* Wiring: DCDB to Inverter */}
          <path d="M 390 230 L 440 230" stroke="#f59e0b" strokeWidth="3" fill="none" />

          {/* 3. INVERTER SECTION */}
          <g transform="translate(440, 100)">
            <rect width="160" height="260" rx="12" fill="url(#invGrad)" stroke="#10b981" strokeWidth="1.5" />
            <text x="80" y="28" fill="#34d399" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
              SOLAR INVERTER
            </text>
            <text x="80" y="46" fill="#f8fafc" fontSize="10" textAnchor="middle" fontFamily="sans-serif">
              {inverterSpec.brand} ({inverterSpec.capacityKw} kW)
            </text>

            {/* Inverter Display / Features */}
            <rect x="20" y="60" width="120" height="75" rx="6" fill="#0f172a" stroke="#059669" />
            <text x="80" y="80" fill="#34d399" fontSize="9" textAnchor="middle" fontFamily="monospace">
              MPPT 1 &amp; MPPT 2 Dual
            </text>
            <text x="80" y="98" fill="#f8fafc" fontSize="9" textAnchor="middle" fontFamily="monospace">
              Eff: {inverterSpec.efficiency}%
            </text>
            <text x="80" y="116" fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="monospace">
              Anti-Islanding (IEEE 1547)
            </text>

            <rect x="20" y="150" width="120" height="30" rx="4" fill="#064e3b" stroke="#34d399" />
            <text x="80" y="169" fill="#f8fafc" fontSize="9" textAnchor="middle" fontFamily="sans-serif">
              AC Synch (415V/230V)
            </text>

            {/* Earth Symbol */}
            <path d="M 80 205 L 80 220 M 70 220 L 90 220 M 73 225 L 87 225 M 76 230 L 84 230" stroke="#10b981" strokeWidth="1.5" />
            <text x="80" y="245" fill="#10b981" fontSize="8" textAnchor="middle" fontFamily="monospace">
              Earth Pit #2
            </text>
          </g>

          {/* Wiring: Inverter to ACDB */}
          <path d="M 600 230 L 650 230" stroke="#38bdf8" strokeWidth="3" fill="none" />

          {/* 4. ACDB SECTION */}
          <g transform="translate(650, 110)">
            <rect width="120" height="240" rx="12" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
            <text x="60" y="25" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
              ACDB
            </text>
            <text x="60" y="40" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="sans-serif">
              AC Protection Box
            </text>

            <rect x="15" y="55" width="90" height="32" rx="4" fill="#1e293b" stroke="#64748b" />
            <text x="60" y="75" fill="#f8fafc" fontSize="9" textAnchor="middle" fontFamily="sans-serif">
              Type II AC SPD
            </text>

            <rect x="15" y="95" width="90" height="32" rx="4" fill="#1e293b" stroke="#64748b" />
            <text x="60" y="115" fill="#f8fafc" fontSize="9" textAnchor="middle" fontFamily="sans-serif">
              32A 4P AC MCB
            </text>

            <rect x="15" y="135" width="90" height="32" rx="4" fill="#1e293b" stroke="#64748b" />
            <text x="60" y="155" fill="#f8fafc" fontSize="9" textAnchor="middle" fontFamily="sans-serif">
              30mA RCCB ELCB
            </text>

            {/* Earth Symbol */}
            <path d="M 60 190 L 60 205 M 50 205 L 70 205 M 53 210 L 67 210 M 56 215 L 64 215" stroke="#10b981" strokeWidth="1.5" />
            <text x="60" y="230" fill="#10b981" fontSize="8" textAnchor="middle" fontFamily="monospace">
              Earth Pit #3
            </text>
          </g>

          {/* Wiring: ACDB to Net Meter */}
          <path d="M 770 230 L 810 230" stroke="#38bdf8" strokeWidth="3" fill="none" />

          {/* 5. NET METER & GRID */}
          <g transform="translate(810, 130)">
            {/* Bidirectional Net Meter Box */}
            <rect width="140" height="90" rx="10" fill="#0f172a" stroke="#e2e8f0" strokeWidth="1.5" />
            <text x="70" y="25" fill="#f8fafc" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
              BI-DIRECTIONAL
            </text>
            <text x="70" y="40" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
              NET METER
            </text>
            <text x="70" y="60" fill="#10b981" fontSize="9" textAnchor="middle" fontFamily="monospace">
              Import &amp; Export kWh
            </text>
            <text x="70" y="75" fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="monospace">
              DISCOM Net Meter
            </text>

            {/* Utility Grid Pole */}
            <rect x="25" y="120" width="90" height="70" rx="8" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1" />
            <text x="70" y="145" fill="#fbbf24" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
              DISCOM GRID
            </text>
            <text x="70" y="162" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="sans-serif">
              415V / 230V 50Hz
            </text>
            <text x="70" y="177" fill="#64748b" fontSize="8" textAnchor="middle" fontFamily="monospace">
              Utility LT Supply
            </text>

            <path d="M 70 90 L 70 120" stroke="#e2e8f0" strokeWidth="3" fill="none" />
          </g>

          {/* Document Footer Signoff */}
          <text x="35" y="420" fill="#64748b" fontSize="9" fontFamily="sans-serif">
            Project: {customerName} | Site: {locationAddress} | Engineer: Kyros Solar Systems | Standard: IS 732 / IEC 60364
          </text>
        </svg>
      </div>

      {/* Engineering Compliance Notes */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2 text-xs text-slate-600">
        <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Electrical Design Standards & Safety Protections
        </h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>DC Distribution Box (DCDB):</strong> Equipped with 1000V DC Type II Surge Protection Devices (SPD) and individual gPV string fuses rated at 15A.
          </li>
          <li>
            <strong>Solar Inverter:</strong> Certified with integrated DC disconnect switch, dual MPPT voltage trackers, and automatic Anti-Islanding safety cutoff complying with IEEE 1547 / IEC 62116.
          </li>
          <li>
            <strong>AC Distribution Box (ACDB):</strong> Fitted with Type II AC Surge Protection Device and 30mA high-sensitivity residual current breaker (RCCB).
          </li>
          <li>
            <strong>Earthing System:</strong> Three separate chemical maintenance-free earth pits dedicated for DC surge, Inverter body/chassis, and AC neutral protection with &lt; 5 Ohms earth resistance.
          </li>
        </ul>
      </div>
    </div>
  );
};
