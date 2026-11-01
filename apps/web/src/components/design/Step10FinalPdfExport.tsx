import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { SolarDesignProject } from './types';
import {
  FileText,
  Printer,
  Share2,
  QrCode,
  Download,
  IndianRupee,
  Sun,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Award,
  Calendar,
  Building,
  Phone,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Step10Props {
  project: SolarDesignProject;
  onSaveToLeadQuotation?: () => Promise<void>;
  isSavingQuotation?: boolean;
}

export const Step10FinalPdfExport: React.FC<Step10Props> = ({
  project,
  onSaveToLeadQuotation,
  isSavingQuotation = false,
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [shareSuccess, setShareSuccess] = useState(false);
  const printSectionRef = useRef<HTMLDivElement>(null);

  // Direct Interactive 3D Viewer Link for Customer
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://pawarsolar-crm.netlify.app';
  const customerViewerUrl = `${origin}/viewer/design/${project.id}`;

  // Generate dynamic QR Code for proposal
  useEffect(() => {
    QRCode.toDataURL(customerViewerUrl, {
      width: 200,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('QR code generation failed:', err));

    // Celebrate proposal completion with light confetti
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {
      // Ignore if not supported
    }
  }, [customerViewerUrl]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(customerViewerUrl);
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 2500);
  };

  const actualKw =
    (project.layout.panels.length * project.components.panel.wattage) / 1000 || project.components.targetCapacityKw;

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            Proposal Ready for Customer Presentation
          </span>
          <h3 className="text-base font-bold text-slate-900 mt-1">Step 10: Executive Proposal & Dynamic 3D QR Code</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            A comprehensive, bank-grade proposal for the homeowner with interactive smartphone 3D view.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-slate-600" />
            <span>{shareSuccess ? 'Copied 3D Link!' : 'Copy 3D Link'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Print / Save as PDF</span>
          </button>

          {onSaveToLeadQuotation && (
            <button
              type="button"
              disabled={isSavingQuotation}
              onClick={onSaveToLeadQuotation}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>{isSavingQuotation ? 'Saving...' : 'Save to CRM Quotations'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Dynamic QR Code Mobile Experience Showcase Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 p-5 rounded-2xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white p-1 rounded-xl shadow-md shrink-0 flex items-center justify-center">
            {qrCodeDataUrl ? (
              <img src={qrCodeDataUrl} alt="Customer 3D View QR Code" className="w-full h-full object-contain" />
            ) : (
              <QrCode className="w-8 h-8 text-slate-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-wider bg-slate-950 text-amber-400 px-2 py-0.5 rounded">
                Dynamic 3D Phone QR
              </span>
              <span className="text-xs font-bold text-slate-900">Zero Login Required</span>
            </div>
            <h4 className="text-sm font-bold text-slate-950 mt-1">
              Customer Can Scan Proposal to Rotate &amp; View Their 3D Rooftop in Real-Time!
            </h4>
            <p className="text-xs text-slate-800 mt-0.5">
              Live link:{' '}
              <a
                href={customerViewerUrl}
                target="_blank"
                rel="noreferrer"
                className="underline font-mono text-[11px] font-semibold hover:text-black inline-flex items-center gap-1"
              >
                {customerViewerUrl}
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        </div>

        <a
          href={customerViewerUrl}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2.5 bg-slate-950 hover:bg-slate-900 text-amber-400 text-xs font-bold rounded-xl shadow-md active:scale-95 transition-all shrink-0 flex items-center gap-1.5"
        >
          <span>Preview Mobile 3D Page</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Branded Printable PDF Proposal Preview Document */}
      <div
        ref={printSectionRef}
        id="printable-solar-proposal"
        className="bg-white p-8 sm:p-12 rounded-2xl border border-slate-300 shadow-xl max-w-4xl mx-auto space-y-8 text-slate-900 print:p-0 print:border-none print:shadow-none"
      >
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b-2 border-slate-900 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-md">
              <Sun className="w-7 h-7 animate-[spin_12s_linear_infinite]" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950">KYROS SOLAR EPC</h1>
              <p className="text-xs text-amber-600 font-bold uppercase tracking-wider">
                Rooftop Solar Proposal &amp; Engineering Design
              </p>
            </div>
          </div>

          <div className="text-right text-xs">
            <span className="font-mono text-slate-400 block">Proposal Ref: #{project.id.slice(0, 8).toUpperCase()}</span>
            <span className="font-semibold text-slate-700 block mt-0.5">Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-1">
              PM Surya Ghar Subsidy Ready
            </span>
          </div>
        </div>

        {/* Customer & Installation Location Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block mb-1">
              Customer Details
            </span>
            <h4 className="font-bold text-slate-900 text-sm">{project.customerInfo.name || 'Valued Homeowner'}</h4>
            <p className="text-slate-600 mt-0.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              {project.customerInfo.phone || '9876543210'}
            </p>
            <p className="text-slate-600 mt-0.5">
              Monthly Electricity Bill: <strong>₹{project.customerInfo.monthlyBill.toLocaleString('en-IN')}</strong>
            </p>
          </div>

          <div>
            <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block mb-1">
              Installation Site &amp; Solar Resource
            </span>
            <h4 className="font-bold text-slate-900">{project.location.address}</h4>
            <p className="text-slate-600 mt-0.5 font-mono text-[11px]">
              Coordinates: {project.location.lat.toFixed(4)}°N, {project.location.lng.toFixed(4)}°E
            </p>
            <p className="text-slate-600 mt-0.5">
              Solar Peak Hours: <strong>{project.location.peakSunHours} hrs/day</strong> | Optimal Tilt:{' '}
              <strong>{project.location.optimalTilt}° True South</strong>
            </p>
          </div>
        </div>

        {/* 3D Visual Render & Morning/Noon/Evening Shadow Analysis Gallery */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-500" />
            3D Rooftop Solar Simulation &amp; Shadow Analysis
          </h3>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950 flex flex-col">
              <div className="bg-slate-900 text-amber-400 font-bold p-1.5 text-[10px] text-center">
                Morning 09:00 AM
              </div>
              <div className="h-28 w-full bg-slate-950 flex items-center justify-center">
                {project.analysis.snapshots.morning ? (
                  <img src={project.analysis.snapshots.morning} alt="Morning Shadow" className="w-full h-full object-cover" />
                ) : (
                  <Sun className="w-5 h-5 text-amber-500/50" />
                )}
              </div>
            </div>

            <div className="rounded-xl overflow-hidden border-2 border-amber-500 bg-slate-950 flex flex-col shadow">
              <div className="bg-amber-500 text-slate-950 font-bold p-1.5 text-[10px] text-center">
                Midday Peak 12:00 PM
              </div>
              <div className="h-28 w-full bg-slate-950 flex items-center justify-center">
                {project.analysis.snapshots.noon ? (
                  <img src={project.analysis.snapshots.noon} alt="Noon Shadow" className="w-full h-full object-cover" />
                ) : (
                  <Sun className="w-5 h-5 text-amber-500" />
                )}
              </div>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950 flex flex-col">
              <div className="bg-slate-900 text-orange-400 font-bold p-1.5 text-[10px] text-center">
                Evening 04:00 PM
              </div>
              <div className="h-28 w-full bg-slate-950 flex items-center justify-center">
                {project.analysis.snapshots.evening ? (
                  <img src={project.analysis.snapshots.evening} alt="Evening Shadow" className="w-full h-full object-cover" />
                ) : (
                  <Sun className="w-5 h-5 text-orange-500/50" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* System Specifications & Bill of Materials */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600" />
            Engineered System Specifications
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[10px]">System Capacity</span>
              <span className="font-mono font-bold text-base text-slate-900">{actualKw.toFixed(2)} kWp</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[10px]">Solar Modules</span>
              <span className="font-mono font-bold text-base text-slate-900">
                {project.layout.panels.length} × {project.components.panel.wattage}W
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[10px]">Annual Generation</span>
              <span className="font-mono font-bold text-base text-emerald-600">
                {project.analysis.energyReport.annualGenerationMwh} MWh/yr
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[10px]">Performance Ratio</span>
              <span className="font-mono font-bold text-base text-blue-600">
                {project.analysis.energyReport.performanceRatioPct}% PR
              </span>
            </div>
          </div>

          {/* BOM Equipment Details */}
          <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Equipment Component</th>
                <th className="py-2.5 px-3">Specification / Brand</th>
                <th className="py-2.5 px-3">Quantity</th>
                <th className="py-2.5 px-3">Warranty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="py-2 px-3 font-semibold text-slate-900">Solar PV Modules</td>
                <td className="py-2 px-3">{project.components.panel.brand} ({project.components.panel.model})</td>
                <td className="py-2 px-3 font-mono">{project.layout.panels.length} Nos</td>
                <td className="py-2 px-3 font-bold text-emerald-600">25 Years</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-slate-900">Grid-Tie Inverter</td>
                <td className="py-2 px-3">{project.components.inverter.brand} ({project.components.inverter.model})</td>
                <td className="py-2 px-3 font-mono">1 Set</td>
                <td className="py-2 px-3 font-bold text-emerald-600">10 Years</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-slate-900">Mounting Structure</td>
                <td className="py-2 px-3">
                  {project.layout.structureProfile === 'c_channel_elevated'
                    ? `Elevated C-Channel HDG Structure (${project.layout.structureHeightM}m clearance)`
                    : 'Direct Aluminium Tin-Shed Clamp Mount'}
                </td>
                <td className="py-2 px-3 font-mono">Complete Set</td>
                <td className="py-2 px-3 font-bold text-emerald-600">15 Years</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-slate-900">Electrical Balance (BOS)</td>
                <td className="py-2 px-3">1000V DCDB with SPD + ACDB with MCB + 4 sq.mm solar cables + 3 Earthing Pits</td>
                <td className="py-2 px-3 font-mono">1 Lot</td>
                <td className="py-2 px-3 font-bold text-emerald-600">5 Years</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Financial & PM Surya Ghar Subsidy Breakdown */}
        <div className="bg-gradient-to-br from-slate-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                Financial Savings &amp; Investment
              </span>
              <h3 className="text-lg font-bold text-white mt-0.5">PM Surya Ghar Subsidy Financial Plan</h3>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Simple Payback Period</span>
              <span className="font-mono text-xl font-bold text-emerald-400">
                {project.financials.paybackYears} Years
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800 text-xs">
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Gross System Cost</span>
              <span className="font-mono font-bold text-base text-white">
                ₹{project.financials.grossCost.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-3 bg-emerald-950/70 rounded-xl border border-emerald-500/40">
              <span className="text-emerald-400 block text-[10px] font-bold">PM Surya Ghar Subsidy</span>
              <span className="font-mono font-bold text-base text-emerald-300">
                -₹{project.financials.centralSubsidy.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-3 bg-amber-500 text-slate-950 rounded-xl shadow-md font-bold">
              <span className="text-slate-900 block text-[10px]">Net Customer Payable</span>
              <span className="font-mono text-lg text-slate-950">
                ₹{project.financials.netPayable.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Est. Monthly Savings</span>
              <span className="font-mono font-bold text-base text-emerald-400">
                ₹{project.financials.monthlySavings.toLocaleString('en-IN')}/mo
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span>25-Year Cumulative Lifetime Savings:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              ₹{project.financials.lifetime25YearSavings.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Dynamic QR Code Section & Environmental Impact */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-200 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 bg-white p-1 rounded-xl border border-slate-300 shadow shrink-0 flex items-center justify-center">
              {qrCodeDataUrl ? (
                <img src={qrCodeDataUrl} alt="3D Proposal QR Code" className="w-full h-full object-contain" />
              ) : (
                <QrCode className="w-10 h-10 text-slate-400" />
              )}
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">
                Interactive 3D Simulation
              </span>
              <h4 className="font-bold text-slate-900 text-sm mt-0.5">Scan to View 3D Rooftop on Phone</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Open phone camera to experience interactive sun &amp; shadow movement on your rooftop design.
              </p>
            </div>
          </div>

          <div className="text-right text-xs space-y-1">
            <span className="font-bold text-emerald-700 block">🌱 Environmental Benefits</span>
            <span className="text-slate-600 block">
              CO₂ Offset: <strong>{project.financials.co2OffsetTonsYear} Tons/year</strong>
            </span>
            <span className="text-slate-600 block">
              Equivalent to: <strong>{project.financials.treesEquivalent} Trees Planted</strong>
            </span>
          </div>
        </div>

        {/* Terms & Authorized Signature */}
        <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
          <div>
            <p>1. Prices include all net-metering liaison and subsidy documentation.</p>
            <p>2. Proposal valid for 15 days from date of issuance.</p>
          </div>
          <div className="text-center">
            <div className="w-36 border-b border-slate-400 mb-1" />
            <span className="font-bold text-slate-800">Authorized Signature</span>
            <span className="text-[10px] block text-slate-400">Kyros Solar Systems Pvt Ltd</span>
          </div>
        </div>
      </div>
    </div>
  );
};
