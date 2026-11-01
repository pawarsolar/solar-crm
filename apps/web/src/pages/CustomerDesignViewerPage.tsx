import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Solar3DViewport } from '../components/design/Solar3DViewport';
import { SolarDesignProject } from '../components/design/types';
import { SOLAR_PANELS, INVERTERS, calculateCentralSubsidy } from '../components/design/constants';
import { usePageSeo } from '../lib/seo';
import {
  Sun,
  IndianRupee,
  ShieldCheck,
  Zap,
  Leaf,
  Phone,
  CheckCircle2,
  Calendar,
  Share2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const CustomerDesignViewerPage: React.FC = () => {
  const { designId } = useParams<{ designId: string }>();
  const [project, setProject] = useState<SolarDesignProject | null>(null);
  const [copied, setCopied] = useState(false);
  const [surveyRequested, setSurveyRequested] = useState(false);

  usePageSeo(
    'Interactive 3D Rooftop Solar View',
    'Explore your custom 3D rooftop solar system design, real-time sun and shadow simulation, and PM Surya Ghar subsidy savings.',
  );

  useEffect(() => {
    // Try to load project from localStorage
    try {
      const stored = localStorage.getItem(`solar_design_${designId}`);
      if (stored) {
        setProject(JSON.parse(stored));
        return;
      }
    } catch {
      // Ignore
    }

    // Default demo project for demonstration if opened via link
    const defaultProject: SolarDesignProject = {
      id: designId || 'demo-design',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      customerInfo: {
        name: 'Pawar Residence',
        phone: '+91 98765 43210',
        address: 'Plot 42, Green Glen Layout, Pune, Maharashtra',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411038',
        monthlyBill: 4500,
        tariffRate: 8.5,
      },
      location: {
        address: 'Pune, Maharashtra',
        lat: 18.5204,
        lng: 73.8567,
        peakSunHours: 5.5,
        ghiKwhM2: 5.9,
        dniKwhM2: 5.3,
        optimalTilt: 18,
      },
      roof: {
        polygon: [
          { x: 10, y: 10 },
          { x: 26, y: 10 },
          { x: 26, y: 22 },
          { x: 10, y: 22 },
        ],
        roofType: 'rcc_flat',
        heightFromGroundM: 6.0,
        parapetHeightM: 0.9,
        totalAreaSqM: 192,
        totalAreaSqFt: 2066,
        usableAreaSqM: 160,
      },
      obstructions: [
        {
          id: 'obs_demo_tank',
          name: 'Water Tank (Sintex)',
          type: 'water_tank',
          shape: 'circle',
          x: 14,
          y: 13,
          width: 1.6,
          length: 1.6,
          radius: 0.8,
          heightMeters: 1.8,
          bufferMeters: 1.0,
          color: '#0284c7',
        },
        {
          id: 'obs_demo_mumty',
          name: 'Staircase Mumty',
          type: 'staircase',
          shape: 'rect',
          x: 23,
          y: 19,
          width: 2.8,
          length: 2.6,
          radius: 1.4,
          heightMeters: 2.6,
          bufferMeters: 1.2,
          color: '#94a3b8',
        },
      ],
      components: {
        panel: SOLAR_PANELS[0],
        inverter: INVERTERS[0],
        targetCapacityKw: 5.4,
      },
      layout: {
        panels: [
          { id: 'p1', x: 12, y: 16, z: 0, width: 1.134, length: 2.278, azimuth: 180, tilt: 18, roofSection: 'flat' },
          { id: 'p2', x: 13.5, y: 16, z: 0, width: 1.134, length: 2.278, azimuth: 180, tilt: 18, roofSection: 'flat' },
          { id: 'p3', x: 15, y: 16, z: 0, width: 1.134, length: 2.278, azimuth: 180, tilt: 18, roofSection: 'flat' },
          { id: 'p4', x: 16.5, y: 16, z: 0, width: 1.134, length: 2.278, azimuth: 180, tilt: 18, roofSection: 'flat' },
          { id: 'p5', x: 18, y: 16, z: 0, width: 1.134, length: 2.278, azimuth: 180, tilt: 18, roofSection: 'flat' },
          { id: 'p6', x: 12, y: 19, z: 0, width: 1.134, length: 2.278, azimuth: 180, tilt: 18, roofSection: 'flat' },
          { id: 'p7', x: 13.5, y: 19, z: 0, width: 1.134, length: 2.278, azimuth: 180, tilt: 18, roofSection: 'flat' },
          { id: 'p8', x: 15, y: 19, z: 0, width: 1.134, length: 2.278, azimuth: 180, tilt: 18, roofSection: 'flat' },
          { id: 'p9', x: 16.5, y: 19, z: 0, width: 1.134, length: 2.278, azimuth: 180, tilt: 18, roofSection: 'flat' },
          { id: 'p10', x: 18, y: 19, z: 0, width: 1.134, length: 2.278, azimuth: 180, tilt: 18, roofSection: 'flat' },
        ],
        azimuth: 180,
        tilt: 18,
        structureProfile: 'c_channel_elevated',
        structureHeightM: 1.8,
        rowSpacingM: 0.8,
      },
      stringing: {
        strings: [],
        inverterPlacement: { x: 26, y: 6.5, z: 16, wallMounted: true, mountedSide: 'south' },
      },
      analysis: {
        snapshots: { morning: '', noon: '', evening: '', shadingLossPct: 1.2 },
        energyReport: {
          annualGenerationMwh: 7.8,
          dailyAvgKwh: 21.4,
          specificYieldKwhPerKwp: 1445,
          performanceRatioPct: 81.2,
          monthlyGenerationKwh: [580, 620, 710, 750, 760, 650, 520, 540, 610, 680, 690, 600],
          losses: {
            shadingLossPct: 1.2,
            temperatureLossPct: 6.5,
            soilingLossPct: 3.0,
            inverterLossPct: 2.5,
            cableLossPct: 1.8,
            mismatchLossPct: 1.5,
            totalLossPct: 16.5,
            netEfficiencyPct: 83.5,
          },
        },
      },
      financials: {
        grossCost: 295000,
        centralSubsidy: 78000,
        stateSubsidy: 0,
        netPayable: 217000,
        monthlySavings: 4250,
        annualSavings: 51000,
        paybackYears: 4.2,
        lifetime25YearSavings: 1275000,
        co2OffsetTonsYear: 6.2,
        treesEquivalent: 280,
      },
      proposalNotes: 'Standard 5.4 kW elevated rooftop system.',
    };

    setProject(defaultProject);
  }, [designId]);

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white p-4">
        <div className="text-center">
          <Sun className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold">Loading 3D Solar Model...</p>
        </div>
      </div>
    );
  }

  const actualKw =
    (project.layout.panels.length * project.components.panel.wattage) / 1000 || project.components.targetCapacityKw;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Customer Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md">
            <Sun className="w-5 h-5 animate-[spin_12s_linear_infinite]" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white">Kyros Solar</h1>
            <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
              Interactive 3D Rooftop Simulation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-400" />
            <span>{copied ? 'Link Copied!' : 'Share Design'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Welcome Greeting Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
              Personalized Rooftop Solar Proposal
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
              Welcome, {project.customerInfo.name || 'Valued Customer'}!
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
              Here is the interactive 3D digital twin of your roof located in {project.location.address}. Drag with one finger to rotate, pinch to zoom, and scrub the time slider below to observe daylight and shadows!
            </p>
          </div>

          <div className="bg-amber-500 text-slate-950 p-4 rounded-2xl text-center shadow-lg shrink-0 w-full sm:w-auto">
            <span className="text-[10px] uppercase font-extrabold tracking-wider block">PM Surya Ghar Subsidy</span>
            <span className="text-2xl font-black font-mono">
              ₹{project.financials.centralSubsidy.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] font-bold block mt-0.5">Direct Bank Credit</span>
          </div>
        </div>

        {/* 3D Interactive WebGL Canvas */}
        <div className="h-[460px] sm:h-[560px] w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-800 relative">
          <Solar3DViewport
            polygon={project.roof.polygon}
            roofType={project.roof.roofType}
            heightMeters={project.roof.heightFromGroundM}
            parapetHeightMeters={project.roof.parapetHeightM}
            obstructions={project.obstructions}
            panels={project.layout.panels}
            azimuth={project.layout.azimuth}
            tilt={project.layout.tilt}
            structureProfile={project.layout.structureProfile}
            structureHeightM={project.layout.structureHeightM}
            inverterPosition={project.stringing.inverterPlacement}
            latitude={project.location.lat}
            showShadows={true}
          />
        </div>

        {/* Key Customer Highlights Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md">
            <span className="text-slate-400 text-xs font-medium block">Recommended Capacity</span>
            <div className="text-2xl font-black font-mono text-amber-400 mt-1">{actualKw.toFixed(2)} kW</div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {project.layout.panels.length} High-Efficiency Modules
            </span>
          </div>

          <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md">
            <span className="text-slate-400 text-xs font-medium block">Monthly Bill Savings</span>
            <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
              ₹{project.financials.monthlySavings.toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-emerald-500 mt-1 block font-semibold">Over 90% Bill Reduction</span>
          </div>

          <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md">
            <span className="text-slate-400 text-xs font-medium block">Net Investment</span>
            <div className="text-2xl font-black font-mono text-white mt-1">
              ₹{project.financials.netPayable.toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Payback in {project.financials.paybackYears} Years</span>
          </div>

          <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md">
            <span className="text-slate-400 text-xs font-medium block">Clean Green Energy</span>
            <div className="text-2xl font-black font-mono text-blue-400 mt-1">
              {project.financials.co2OffsetTonsYear} <span className="text-xs font-normal">Tons/yr</span>
            </div>
            <span className="text-[11px] text-emerald-400 mt-1 block font-semibold">
              ≈ {project.financials.treesEquivalent} Trees Planted
            </span>
          </div>
        </div>

        {/* Customer Call to Action Banner */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 p-6 rounded-2xl border border-emerald-500/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Ready to Go Solar?
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">Lock In Your PM Surya Ghar Subsidy Slot</h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Request a free physical site visit by our certified solar engineer to confirm roof dimensions and electrical earthing.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSurveyRequested(true)}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-xl shadow-lg active:scale-95 transition-all shrink-0 flex items-center gap-2 cursor-pointer"
          >
            {surveyRequested ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-slate-950" />
                <span>Site Visit Requested!</span>
              </>
            ) : (
              <>
                <span>Schedule Free Site Survey</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-slate-900 text-center text-xs text-slate-500">
        <p>© 2026 Kyros Solar Engineering. Approved Rooftop Solar EPC &amp; PM Surya Ghar Partner.</p>
      </footer>
    </div>
  );
};
