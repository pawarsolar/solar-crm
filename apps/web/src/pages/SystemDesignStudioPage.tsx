import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { SolarDesignProject } from '../components/design/types';
import { SOLAR_PANELS, INVERTERS, calculateCentralSubsidy, TELECALLER_STEPS_SCRIPT } from '../components/design/constants';
import { Step1LocationMap } from '../components/design/Step1LocationMap';
import { Step2RoofSetup } from '../components/design/Step2RoofSetup';
import { Step3Obstructions } from '../components/design/Step3Obstructions';
import { Step4ComponentSelection } from '../components/design/Step4ComponentSelection';
import { Step5PanelPlacement } from '../components/design/Step5PanelPlacement';
import { Step6ThreeDVisualization } from '../components/design/Step6ThreeDVisualization';
import { Step7StringingInverter } from '../components/design/Step7StringingInverter';
import { Step8ProposalEnergyReport } from '../components/design/Step8ProposalEnergyReport';
import { Step9SingleLineDiagram } from '../components/design/Step9SingleLineDiagram';
import { Step10FinalPdfExport } from '../components/design/Step10FinalPdfExport';
import { apiRequest } from '../lib/api';
import { usePageSeo } from '../lib/seo';
import { toast } from '../context/ToastContext';
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Headphones,
  Sparkles,
  CheckCircle2,
  Save,
  MessageSquare,
  HelpCircle,
  FileCheck,
} from 'lucide-react';

export const SystemDesignStudioPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const leadId = searchParams.get('leadId') || undefined;

  usePageSeo(
    '3D Solar System Design Studio',
    'Interactive 3D Solar rooftop system designer, shadow analysis simulation, and PM Surya Ghar proposal generator for telecallers and sales engineers.',
  );

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [showCallScript, setShowCallScript] = useState<boolean>(true);
  const [isSavingQuotation, setIsSavingQuotation] = useState<boolean>(false);

  // Initialize Project State
  const [project, setProject] = useState<SolarDesignProject>(() => {
    const defaultId = `solar_proj_${Date.now()}`;
    return {
      id: defaultId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      leadId,
      customerInfo: {
        name: 'Prospective Customer',
        phone: '9876543210',
        address: 'Pune, Maharashtra',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411038',
        monthlyBill: 4500,
        tariffRate: 8.5,
      },
      location: {
        address: 'Pune, Maharashtra, India',
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
          id: 'obs_1',
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
        strings: [
          {
            id: 'str_1',
            name: 'String #1',
            color: '#06b6d4',
            panelIds: ['p1', 'p2', 'p3', 'p4', 'p5'],
            mpptInput: 1,
            totalVmp: 209,
            totalVoc: 249,
            totalKw: 2.7,
          },
          {
            id: 'str_2',
            name: 'String #2',
            color: '#f59e0b',
            panelIds: ['p6', 'p7', 'p8', 'p9', 'p10'],
            mpptInput: 2,
            totalVmp: 209,
            totalVoc: 249,
            totalKw: 2.7,
          },
        ],
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
      proposalNotes: '5.4 kW system on elevated structure with PM Surya Ghar subsidy.',
    };
  });

  // If leadId is present, fetch Lead details to auto-populate
  useEffect(() => {
    if (!leadId) return;
    apiRequest(`/leads/${leadId}`)
      .then((lead) => {
        if (lead) {
          setProject((prev) => ({
            ...prev,
            customerInfo: {
              ...prev.customerInfo,
              name: lead.name || prev.customerInfo.name,
              phone: lead.phone || prev.customerInfo.phone,
              address: lead.address || prev.customerInfo.address,
              monthlyBill: lead.monthly_bill || prev.customerInfo.monthlyBill,
            },
          }));
        }
      })
      .catch(() => {
        // Fallback gracefully
      });
  }, [leadId]);

  // Recalculate financial breakdown whenever capacity changes
  useEffect(() => {
    const actualKw =
      (project.layout.panels.length * project.components.panel.wattage) / 1000 ||
      project.components.targetCapacityKw;
    const grossCost = Math.round(actualKw * 55000); // Standard industry benchmark ₹55k/kW installed
    const centralSubsidy = calculateCentralSubsidy(actualKw);
    const netPayable = Math.max(0, grossCost - centralSubsidy);
    const monthlySavings = Math.round(actualKw * 125 * project.customerInfo.tariffRate);
    const annualSavings = monthlySavings * 12;
    const paybackYears = Math.round((netPayable / Math.max(1, annualSavings)) * 10) / 10;
    const lifetime25YearSavings = annualSavings * 25;
    const co2Offset = Math.round(actualKw * 1.15 * 10) / 10;
    const trees = Math.round(co2Offset * 45);

    setProject((prev) => ({
      ...prev,
      financials: {
        grossCost,
        centralSubsidy,
        stateSubsidy: 0,
        netPayable,
        monthlySavings,
        annualSavings,
        paybackYears,
        lifetime25YearSavings,
        co2OffsetTonsYear: co2Offset,
        treesEquivalent: trees,
      },
    }));

    // Save project snapshot to localStorage for customer QR link
    try {
      localStorage.setItem(`solar_design_${project.id}`, JSON.stringify(project));
    } catch {
      // Ignore
    }
  }, [project.layout.panels.length, project.components.panel.wattage, project.customerInfo.tariffRate, project.id]);

  // Save to CRM Quotations API
  const handleSaveToQuotation = async () => {
    setIsSavingQuotation(true);
    try {
      const actualKw =
        (project.layout.panels.length * project.components.panel.wattage) / 1000 ||
        project.components.targetCapacityKw;

      await apiRequest('/quotations', {
        method: 'POST',
        body: {
          lead_id: project.leadId || '00000000-0000-0000-0000-000000000000',
          kw: actualKw,
          panel_brand: `${project.components.panel.brand} ${project.components.panel.model}`,
          inverter_brand: `${project.components.inverter.brand} ${project.components.inverter.model}`,
          panel_watt: project.components.panel.wattage,
          tariff_rate: project.customerInfo.tariffRate,
          monthly_bill: project.customerInfo.monthlyBill,
          custom_subsidy: project.financials.centralSubsidy,
          notes: JSON.stringify({
            designId: project.id,
            roofType: project.roof.roofType,
            panelCount: project.layout.panels.length,
            azimuth: project.layout.azimuth,
            tilt: project.layout.tilt,
            structure: project.layout.structureProfile,
            annualGenerationMwh: project.analysis.energyReport.annualGenerationMwh,
            publicViewerUrl: `${window.location.origin}/viewer/design/${project.id}`,
          }),
        },
      });

      toast.success('3D Solar Design and Official Quotation successfully saved to CRM pipeline!');
      navigate('/quotations');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save quotation to CRM pipeline', {
        title: 'Quotation Save Error',
      });
      toast.warning(`Design state preserved locally in browser (ID: ${project.id.slice(0, 8)})`);
    } finally {
      setIsSavingQuotation(false);
    }
  };

  const stepsList = [
    { num: 1, label: 'Location' },
    { num: 2, label: 'Roof Setup' },
    { num: 3, label: 'Obstructions' },
    { num: 4, label: 'Components' },
    { num: 5, label: 'Panel Layout' },
    { num: 6, label: '3D Simulation' },
    { num: 7, label: 'Stringing' },
    { num: 8, label: 'Energy Report' },
    { num: 9, label: 'SLD Schematic' },
    { num: 10, label: 'PDF Proposal' },
  ];

  const actualKw =
    (project.layout.panels.length * project.components.panel.wattage) / 1000 ||
    project.components.targetCapacityKw;

  const currentScript = TELECALLER_STEPS_SCRIPT[currentStep] || TELECALLER_STEPS_SCRIPT[1];
  const renderedPitch = currentScript.pitch
    .replace('{{city}}', project.customerInfo.city || 'your area')
    .replace('{{psh}}', String(project.location.peakSunHours))
    .replace('{{tilt}}', String(project.layout.tilt))
    .replace('{{units}}', String(Math.round(actualKw * 125)))
    .replace('{{savings}}', project.financials.monthlySavings.toLocaleString('en-IN'));

  return (
    <div className="space-y-6 pb-24">
      {/* Studio Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
              Telecaller Sales Studio
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">3D Solar System Design &amp; Proposal Generator</h2>
          <p className="text-xs text-slate-500">
            Rapid 10-step rooftop sizing workflow optimized for live customer sales conversions.
          </p>
        </div>

        {/* Live Quick-Quote Summary Metric */}
        <div className="flex items-center gap-3 bg-slate-900 text-white px-4 py-2.5 rounded-2xl border border-slate-800 shadow-lg">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">System Size</span>
            <span className="text-lg font-mono font-bold text-amber-400">{actualKw.toFixed(2)} kW</span>
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Modules</span>
            <span className="text-lg font-mono font-bold text-white">{project.layout.panels.length}</span>
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Net Payable</span>
            <span className="text-lg font-mono font-bold text-emerald-400">
              ₹{(project.financials.netPayable / 100000).toFixed(2)}L
            </span>
          </div>
        </div>
      </div>

      {/* 10-Step Wizard Progress Stepper */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm overflow-x-auto scrollbar-none">
        <div className="flex items-center justify-between min-w-[760px] gap-2">
          {stepsList.map((step) => {
            const isCompleted = step.num < currentStep;
            const isCurrent = step.num === currentStep;
            return (
              <button
                key={step.num}
                type="button"
                onClick={() => setCurrentStep(step.num)}
                className={`flex-1 flex flex-col items-center gap-1.5 p-2 rounded-xl text-center transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md scale-102 ring-2 ring-amber-500/30'
                    : isCompleted
                    ? 'bg-slate-50 text-slate-700 hover:bg-slate-100 font-medium'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-slate-950 text-amber-400 shadow'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : step.num}
                </div>
                <span className="text-[11px] whitespace-nowrap">{step.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Telecaller Active Sales Script Pitch Drawer */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white p-4 rounded-2xl shadow-lg border border-blue-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-blue-500/20 text-blue-300 shrink-0 mt-0.5">
            <Headphones className="w-5 h-5 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                Sales Call Script &bull; Step {currentStep} ({currentScript.title})
              </span>
              <span className="text-[10px] text-blue-200 bg-blue-950 px-2 py-0.5 rounded border border-blue-700">
                {currentScript.hint}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 mt-1 italic font-medium">
              &ldquo;{renderedPitch}&rdquo;
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCallScript(!showCallScript)}
          className="text-xs text-blue-300 hover:text-white underline shrink-0 cursor-pointer self-end sm:self-auto"
        >
          {showCallScript ? 'Collapse Pitch' : 'Show Pitch'}
        </button>
      </div>

      {/* Step Body Content View */}
      <div className="min-h-[500px]">
        {currentStep === 1 && (
          <Step1LocationMap
            location={project.location}
            customerInfo={project.customerInfo}
            onUpdateLocation={(loc) =>
              setProject((prev) => ({ ...prev, location: { ...prev.location, ...loc } }))
            }
            onUpdateCustomer={(cust) =>
              setProject((prev) => ({ ...prev, customerInfo: { ...prev.customerInfo, ...cust } }))
            }
            onConfirm={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 2 && (
          <Step2RoofSetup
            polygon={project.roof.polygon}
            roofType={project.roof.roofType}
            heightFromGroundM={project.roof.heightFromGroundM}
            parapetHeightM={project.roof.parapetHeightM}
            onUpdateRoof={(data) =>
              setProject((prev) => ({
                ...prev,
                roof: { ...prev.roof, ...data },
              }))
            }
          />
        )}

        {currentStep === 3 && (
          <Step3Obstructions
            polygon={project.roof.polygon}
            obstructions={project.obstructions}
            onUpdateObstructions={(obs) =>
              setProject((prev) => ({ ...prev, obstructions: obs }))
            }
          />
        )}

        {currentStep === 4 && (
          <Step4ComponentSelection
            selectedPanel={project.components.panel}
            selectedInverter={project.components.inverter}
            targetCapacityKw={project.components.targetCapacityKw}
            usableAreaSqM={project.roof.usableAreaSqM}
            monthlyBill={project.customerInfo.monthlyBill}
            tariffRate={project.customerInfo.tariffRate}
            onSelectPanel={(panel) =>
              setProject((prev) => ({
                ...prev,
                components: { ...prev.components, panel },
              }))
            }
            onSelectInverter={(inverter) =>
              setProject((prev) => ({
                ...prev,
                components: { ...prev.components, inverter },
              }))
            }
            onUpdateCapacity={(kw) =>
              setProject((prev) => ({
                ...prev,
                components: { ...prev.components, targetCapacityKw: kw },
              }))
            }
          />
        )}

        {currentStep === 5 && (
          <Step5PanelPlacement
            polygon={project.roof.polygon}
            obstructions={project.obstructions}
            panelSpec={project.components.panel}
            panels={project.layout.panels}
            azimuth={project.layout.azimuth}
            tilt={project.layout.tilt}
            structureProfile={project.layout.structureProfile}
            structureHeightM={project.layout.structureHeightM}
            onUpdatePanels={(panels) =>
              setProject((prev) => ({
                ...prev,
                layout: { ...prev.layout, panels },
              }))
            }
            onUpdateAzimuth={(azimuth) =>
              setProject((prev) => ({
                ...prev,
                layout: { ...prev.layout, azimuth },
              }))
            }
            onUpdateTilt={(tilt) =>
              setProject((prev) => ({
                ...prev,
                layout: { ...prev.layout, tilt },
              }))
            }
            onUpdateStructure={(profile, heightM) =>
              setProject((prev) => ({
                ...prev,
                layout: { ...prev.layout, structureProfile: profile, structureHeightM: heightM },
              }))
            }
          />
        )}

        {currentStep === 6 && (
          <Step6ThreeDVisualization
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
            latitude={project.location.lat}
            onCaptureSnapshot={(dataUrl) => {
              setProject((prev) => ({
                ...prev,
                analysis: {
                  ...prev.analysis,
                  snapshots: { ...prev.analysis.snapshots, noon: dataUrl },
                },
              }));
              toast.success('3D Snapshot saved to proposal!');
            }}
            onShadingUpdate={(count, pct) => {
              setProject((prev) => ({
                ...prev,
                analysis: {
                  ...prev.analysis,
                  energyReport: {
                    ...prev.analysis.energyReport,
                    losses: { ...prev.analysis.energyReport.losses, shadingLossPct: pct },
                  },
                },
              }));
            }}
          />
        )}

        {currentStep === 7 && (
          <Step7StringingInverter
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
            inverterSpec={project.components.inverter}
            panelSpec={project.components.panel}
            strings={project.stringing.strings}
            inverterPosition={project.stringing.inverterPlacement}
            onUpdateStrings={(strings) =>
              setProject((prev) => ({
                ...prev,
                stringing: { ...prev.stringing, strings },
              }))
            }
            onUpdateInverterPosition={(pos) =>
              setProject((prev) => ({
                ...prev,
                stringing: { ...prev.stringing, inverterPlacement: pos },
              }))
            }
          />
        )}

        {currentStep === 8 && (
          <Step8ProposalEnergyReport
            systemKw={actualKw}
            energyReport={project.analysis.energyReport}
            snapshots={project.analysis.snapshots}
            onRefreshSnapshots={() => {
              toast.info('3D Viewport refreshed with morning, noon, and evening sun positions.');
            }}
          />
        )}

        {currentStep === 9 && (
          <Step9SingleLineDiagram
            systemKw={actualKw}
            panelSpec={project.components.panel}
            inverterSpec={project.components.inverter}
            strings={project.stringing.strings}
            customerName={project.customerInfo.name}
            locationAddress={project.location.address}
          />
        )}

        {currentStep === 10 && (
          <Step10FinalPdfExport
            project={project}
            onSaveToLeadQuotation={handleSaveToQuotation}
            isSavingQuotation={isSavingQuotation}
          />
        )}
      </div>

      {/* Persistent Wizard Navigation Action Bar (Pinned to Bottom) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-3.5 px-4 sm:px-8 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-2 transition-all disabled:opacity-40 disabled:pointer-events-none active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Step</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-700">
            <span>Step {currentStep} of 10:</span>
            <span className="text-amber-600">{stepsList[currentStep - 1]?.label}</span>
          </div>

          <div className="flex items-center gap-2">
            {currentStep < 10 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.min(10, prev + 1))}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
              >
                <span>Next: {stepsList[currentStep]?.label}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveToQuotation}
                disabled={isSavingQuotation}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSavingQuotation ? 'Saving...' : 'Finalize & Save Proposal'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
