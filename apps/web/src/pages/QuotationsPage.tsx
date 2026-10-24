import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sun,
  FileText,
  Calculator,
  Download,
  Zap,
  TrendingUp,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  Home,
  CheckCircle2,
  Loader2,
  Edit3,
  Plus,
  RotateCcw,
  AlertCircle,
  X,
  Sliders,
  DollarSign,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { apiRequest, downloadFile } from '../lib/api';
import {
  calculateSolarSystem,
  PANEL_OPTIONS,
  SolarCalculatorInput,
} from '../lib/solar-calculator';

export const QuotationsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Selected Lead & Brands
  const [leadId, setLeadId] = useState(searchParams.get('lead_id') || '');
  const [panelBrand, setPanelBrand] = useState('Waaree / Adani Monocrystalline');
  const [inverterBrand, setInverterBrand] = useState('Growatt 5kW Hybrid On-Grid');

  // Calculator Inputs (matching Page 1 of Reference Spec)
  const [inputMethod, setInputMethod] = useState<'units' | 'bill'>('units');
  const [monthlyUnits, setMonthlyUnits] = useState<number>(600);
  const [monthlyBill, setMonthlyBill] = useState<number>(4800);
  const [effectiveTariff, setEffectiveTariff] = useState<number>(8.0);
  const [targetSolarOffsetPct, setTargetSolarOffsetPct] = useState<number>(100);
  const [specificGeneration, setSpecificGeneration] = useState<number>(120.0);
  const [selectedPanelWatt, setSelectedPanelWatt] = useState<number>(620);

  // 25-Year Projection Assumptions (matching Page 2 of Reference Spec)
  const [annualDegradationRatePct, setAnnualDegradationRatePct] = useState<number>(0.5);
  const [annualTariffEscalationRatePct, setAnnualTariffEscalationRatePct] = useState<number>(3.0);
  const [showFull25Years, setShowFull25Years] = useState<boolean>(false);

  // Dynamic Calculation Output based on formulas
  const calcResult = useMemo(() => {
    const calcInput: SolarCalculatorInput = {
      inputMethod,
      monthlyUnits,
      monthlyBill,
      effectiveTariff,
      targetSolarOffsetPct,
      specificGeneration,
      selectedPanelWatt,
      annualDegradationRatePct,
      annualTariffEscalationRatePct,
    };
    return calculateSolarSystem(calcInput);
  }, [
    inputMethod,
    monthlyUnits,
    monthlyBill,
    effectiveTariff,
    targetSolarOffsetPct,
    specificGeneration,
    selectedPanelWatt,
    annualDegradationRatePct,
    annualTariffEscalationRatePct,
  ]);

  // Default Standard Base Rate based on capacity
  const standardBaseRate = useMemo(() => {
    const kw = calcResult.actualDcPlantSizeKw;
    return kw <= 3 ? 60000 : kw <= 5 ? 55000 : 50000;
  }, [calcResult.actualDcPlantSizeKw]);

  // Editable Commercial Fields & Price Difference
  const [customBaseRate, setCustomBaseRate] = useState<number | null>(null);
  const activeBaseRate = customBaseRate !== null ? customBaseRate : standardBaseRate;

  // Price Difference (+/- ₹ difference, markup, extra works, or discount)
  const [priceDifference, setPriceDifference] = useState<number>(0);
  const [priceDiffNote, setPriceDiffNote] = useState<string>('');

  // Custom Subsidy Override
  const [useCustomSubsidy, setUseCustomSubsidy] = useState<boolean>(false);
  const [customSubsidyAmount, setCustomSubsidyAmount] = useState<number>(78000);

  // Proposal Revision & Notes
  const [revisionOf, setRevisionOf] = useState<string | null>(null);
  const [quotationNotes, setQuotationNotes] = useState<string>('');

  // Created Quote Modal State for Instant Download
  const [createdQuoteModal, setCreatedQuoteModal] = useState<any | null>(null);

  // Subsidy Calculation (PM Surya Ghar Muft Bijli Yojana)
  const calculatedSubsidy = useMemo(() => {
    const size = calcResult.actualDcPlantSizeKw;
    if (size <= 0) return 0;
    if (size <= 2) return Math.round(size * 30000);
    if (size <= 3) return Math.round(60000 + (size - 2) * 18000);
    return 78000;
  }, [calcResult.actualDcPlantSizeKw]);

  const activeSubsidy = useCustomSubsidy ? customSubsidyAmount : calculatedSubsidy;

  // Commercial Pricing with Editable Base Rate & Price Difference
  const baseCost = Math.round(calcResult.actualDcPlantSizeKw * activeBaseRate);
  const subtotal = Math.max(0, baseCost + priceDifference);
  const gst = Math.round(subtotal * 0.089); // Blended 8.9%
  const totalCommercial = subtotal + gst;
  const netCustomerCost = Math.max(0, totalCommercial - activeSubsidy);
  const paybackYears =
    calcResult.estimatedAnnualBillSaving > 0
      ? (netCustomerCost / calcResult.estimatedAnnualBillSaving).toFixed(1)
      : '0.0';

  // Leads Query
  const { data: leadsData } = useQuery({
    queryKey: ['leads', 'all'],
    queryFn: () => apiRequest('/leads?limit=100'),
  });
  const leads = leadsData?.items || [];

  // All Quotations Query
  const { data: allQuotesData, refetch: refetchAllQuotes } = useQuery({
    queryKey: ['quotations', 'all'],
    queryFn: () => apiRequest('/quotations'),
  });
  const allQuotations = Array.isArray(allQuotesData) ? allQuotesData : [];

  // Lead specific quotes
  const quoteHistory = useMemo(() => {
    if (!leadId) return allQuotations.slice(0, 5);
    return allQuotations.filter((q: any) => q.lead_id === leadId);
  }, [allQuotations, leadId]);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadPdf = async (quoteId: string, quoteNumber: string) => {
    try {
      setDownloadingId(quoteId);
      await downloadFile(
        `/quotations/${quoteId}/pdf`,
        `Quotation-${quoteNumber.replace(/\//g, '_')}.pdf`
      );
    } catch (err: any) {
      alert(`Error downloading PDF: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  // Proposal Creation Mutation
  const createQuoteMutation = useMutation({
    mutationFn: () =>
      apiRequest('/quotations', {
        method: 'POST',
        body: {
          lead_id: leadId,
          kw: calcResult.actualDcPlantSizeKw,
          panel_brand: `${calcResult.selectedPanelWatt}W Mono PERC / TopCon (${panelBrand})`,
          inverter_brand: inverterBrand,
          tariff_rate: effectiveTariff,
          monthly_units: calcResult.monthlyConsumptionUsed,
          panel_watt: calcResult.selectedPanelWatt,
          specific_generation: specificGeneration,
          target_solar_offset: targetSolarOffsetPct,
          annual_degradation_pct: annualDegradationRatePct,
          annual_tariff_escalation_pct: annualTariffEscalationRatePct,
          base_rate_per_kw: activeBaseRate,
          price_difference: priceDifference,
          custom_subsidy: useCustomSubsidy ? customSubsidyAmount : undefined,
          notes: [priceDiffNote, quotationNotes].filter(Boolean).join(' | '),
          revision_of: revisionOf || undefined,
        },
      }),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      refetchAllQuotes();
      // Set modal state so user sees a clean popup
      setCreatedQuoteModal(data);
      // Automatically trigger download
      await handleDownloadPdf(data.id, data.number);
    },
    onError: (err: any) => alert(err.message),
  });

  // Action to load an existing quotation for editing / revising
  const handleEditQuotation = (q: any) => {
    if (q.lead_id) setLeadId(q.lead_id);
    if (q.base_rate_per_kw) setCustomBaseRate(q.base_rate_per_kw);
    if (q.price_difference !== undefined) setPriceDifference(q.price_difference);
    if (q.notes) setQuotationNotes(q.notes);
    if (q.subsidy !== undefined) {
      setUseCustomSubsidy(true);
      setCustomSubsidyAmount(q.subsidy);
    }
    setRevisionOf(q.number);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetPricing = () => {
    setCustomBaseRate(null);
    setPriceDifference(0);
    setPriceDiffNote('');
    setUseCustomSubsidy(false);
    setQuotationNotes('');
    setRevisionOf(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Revision Banner if revising */}
      {revisionOf && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-amber-900">
          <div className="flex items-center gap-3">
            <Edit3 className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-sm">
                Revising Quotation: <span className="font-mono text-amber-800">{revisionOf}</span>
              </p>
              <p className="text-xs text-amber-700">
                You can adjust the sizing, base rate, or price difference. Saving will issue a revised proposal with revision history.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetPricing}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-800 hover:bg-amber-50"
          >
            Cancel Revision
          </button>
        </div>
      )}

      {/* Title & Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sun className="w-6 h-6 text-amber-500" />
            <span>Solar Sizing & Commercial Quotation Engine</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Precision engineering sizing engine, editable calculations, price difference adjustments & PDF export
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span>MP / Regional Benchmark (120–135 kWh/kWp/mo)</span>
          </span>
        </div>
      </div>

      {/* SECTION 1: Inputs & Parameters (Page 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-amber-500" />
                <span>1. Technical Parameters & Equipment Sizing</span>
              </h2>

              {/* Input Method Toggle */}
              <div className="inline-flex p-1 rounded-xl bg-slate-100 text-xs font-medium self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setInputMethod('units')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    inputMethod === 'units'
                      ? 'bg-white text-slate-900 font-bold shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  By Units (kWh)
                </button>
                <button
                  type="button"
                  onClick={() => setInputMethod('bill')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    inputMethod === 'bill'
                      ? 'bg-white text-slate-900 font-bold shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  By Monthly Bill (₹)
                </button>
              </div>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {inputMethod === 'units' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monthly Electricity Units (kWh)
                  </label>
                  <input
                    type="number"
                    min="10"
                    step="10"
                    value={monthlyUnits}
                    onChange={(e) => setMonthlyUnits(Number(e.target.value))}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">e.g. 600 kWh/month</span>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monthly Electricity Bill (₹)
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={monthlyBill}
                    onChange={(e) => setMonthlyBill(Number(e.target.value))}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">e.g. ₹4,800/month</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Average Effective Tariff (₹/kWh)
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="2"
                  max="20"
                  value={effectiveTariff}
                  onChange={(e) => setEffectiveTariff(Number(e.target.value))}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Default DISCOM tariff ₹8.00</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Selected Panel Wattage
                </label>
                <select
                  value={selectedPanelWatt}
                  onChange={(e) => setSelectedPanelWatt(Number(e.target.value))}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-amber-700 bg-amber-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  {PANEL_OPTIONS.map((opt) => (
                    <option key={opt.watts} value={opt.watts}>
                      {opt.label} ({opt.watts}W)
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-0.5 block">15 standard industry modules</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Solar Offset (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="10"
                    max="150"
                    step="5"
                    value={targetSolarOffsetPct}
                    onChange={(e) => setTargetSolarOffsetPct(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800 w-12 text-right">{targetSolarOffsetPct}%</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">100% = Full solar coverage</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Specific Generation (kWh/kWp/mo)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="1"
                    min="90"
                    max="160"
                    value={specificGeneration}
                    onChange={(e) => setSpecificGeneration(Number(e.target.value))}
                    className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                  <span className="text-xs font-bold text-slate-500">kWh</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Prefilled at 120 (MP/Bhopal: 120–135)</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Client / Lead *</label>
                <select
                  value={leadId}
                  onChange={(e) => setLeadId(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="">Select prospective client...</option>
                  {leads.map((l: any) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.phone}) - {l.city}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Required to issue formal quotation</span>
              </div>
            </div>

            {/* Equipment Brands */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Panel Brand & Specification
                </label>
                <input
                  type="text"
                  value={panelBrand}
                  onChange={(e) => setPanelBrand(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-200 font-medium text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Inverter Brand & Model
                </label>
                <input
                  type="text"
                  value={inverterBrand}
                  onChange={(e) => setInverterBrand(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-200 font-medium text-slate-800"
                />
              </div>
            </div>

            {/* CALCULATED RESULT (Exact Page 1 Specification Grid) */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Calculated Result (Page 1)</span>
                </h3>
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                  Actual Capacity: {calcResult.actualDcPlantSizeKw} kWp
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 block text-[11px]">Monthly Consumption</span>
                  <span className="font-bold text-slate-900 text-sm">{calcResult.monthlyConsumptionUsed} kWh</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 block text-[11px]">Annual Consumption</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {calcResult.annualConsumption.toLocaleString('en-IN')} kWh
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 block text-[11px]">Req. Gen / Month</span>
                  <span className="font-bold text-slate-900 text-sm">{calcResult.requiredSolarGenerationMonth} kWh</span>
                </div>
                <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/60">
                  <span className="text-amber-800 block text-[11px]">Recommended Plant Size</span>
                  <span className="font-bold text-amber-900 text-sm">{calcResult.recommendedSolarPlantSizeKw} kWp</span>
                </div>

                <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-200/60">
                  <span className="text-indigo-800 block text-[11px]">Panels Required</span>
                  <span className="font-black text-indigo-900 text-base">{calcResult.panelsRequired} Nos.</span>
                </div>
                <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-200/60">
                  <span className="text-indigo-800 block text-[11px]">Selected Panel Watt</span>
                  <span className="font-bold text-indigo-900 text-sm">{calcResult.selectedPanelWatt} W</span>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-emerald-800 block text-[11px]">Actual DC Plant Size</span>
                  <span className="font-black text-emerald-900 text-base">{calcResult.actualDcPlantSizeKw} kWp</span>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-emerald-800 block text-[11px]">Est. Monthly Solar Gen</span>
                  <span className="font-bold text-emerald-900 text-sm">{calcResult.estimatedMonthlySolarGeneration} kWh</span>
                </div>
              </div>
            </div>
          </div>

          {/* EDITABLE COMMERCIAL PRICING & PRICE DIFFERENCE SECTION */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-500" />
                <span>2. Editable Calculations & Price Difference (Margin / Adjustment)</span>
              </h3>
              {(customBaseRate !== null || priceDifference !== 0 || useCustomSubsidy) && (
                <button
                  type="button"
                  onClick={handleResetPricing}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Standard</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Editable Base Rate per kW */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800">
                    Base Rate per kW (₹)
                  </label>
                  {customBaseRate !== null && (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                      Customized
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    step="500"
                    min="20000"
                    max="150000"
                    value={activeBaseRate}
                    onChange={(e) => setCustomBaseRate(Number(e.target.value))}
                    className="w-full text-sm font-black text-slate-900 px-2 py-1 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  Standard benchmark: ₹{standardBaseRate.toLocaleString('en-IN')}/kWp
                </p>
              </div>

              {/* Price Difference / Adjustment */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800">
                    Price Difference (+ / - ₹)
                  </label>
                  {priceDifference !== 0 && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        priceDifference > 0
                          ? 'text-emerald-700 bg-emerald-50'
                          : 'text-rose-700 bg-rose-50'
                      }`}
                    >
                      {priceDifference > 0 ? '+ Markup' : '- Discount'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    step="500"
                    value={priceDifference}
                    onChange={(e) => setPriceDifference(Number(e.target.value))}
                    placeholder="e.g. +15000 or -5000"
                    className="w-full text-sm font-black text-slate-900 px-2 py-1 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  Add height difference, extra cable, or customer discount
                </p>
              </div>

              {/* Subsidy Override */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCustomSubsidy}
                      onChange={(e) => setUseCustomSubsidy(e.target.checked)}
                      className="rounded accent-amber-500"
                    />
                    <span>Override Subsidy</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Auto: ₹{calculatedSubsidy.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    disabled={!useCustomSubsidy}
                    value={activeSubsidy}
                    onChange={(e) => setCustomSubsidyAmount(Number(e.target.value))}
                    className="w-full text-sm font-black text-slate-900 px-2 py-1 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  Set to 0 for commercial or custom state grant
                </p>
              </div>
            </div>

            {/* Scope / Reason / Engineering Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Difference Reason / Scope (Appears on proposal)
                </label>
                <input
                  type="text"
                  value={priceDiffNote}
                  onChange={(e) => setPriceDiffNote(e.target.value)}
                  placeholder="e.g. Heavy-duty 10ft elevated GI structure difference"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Special Customer / Warranty Notes
                </label>
                <input
                  type="text"
                  value={quotationNotes}
                  onChange={(e) => setQuotationNotes(e.target.value)}
                  placeholder="e.g. 25-yr performance warranty on modules, 5-yr on inverter"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-800"
                />
              </div>
            </div>

            {/* Save Proposal Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => createQuoteMutation.mutate()}
                disabled={!leadId || createQuoteMutation.isPending}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-sm hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
              >
                {createQuoteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating & Downloading PDF Proposal...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>
                      {revisionOf ? 'Save Revised Quotation' : 'Create & Issue Formal Proposal'} (
                      {calcResult.actualDcPlantSizeKw} kWp • ₹{netCustomerCost.toLocaleString('en-IN')})
                    </span>
                  </>
                )}
              </button>
              {!leadId && (
                <p className="text-[11px] text-amber-700 text-center mt-1.5 font-medium">
                  * Please select a prospective client lead from the dropdown above to create proposal.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: COMMERCIAL OUTPUT SUMMARY CARD (Page 1 Spec) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 border border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-black text-sm text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                <span>Commercial Output</span>
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">Page 1 Spec</span>
            </div>

            {/* Financial Numbers */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Estimated Monthly Bill Saving:</span>
                <span className="font-bold text-emerald-400">
                  ₹{calcResult.estimatedMonthlyBillSaving.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Estimated Annual Bill Saving:</span>
                <span className="font-bold text-emerald-400">
                  ₹{calcResult.estimatedAnnualBillSaving.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Solar Gen vs Consumption:</span>
                <span className="font-bold text-white">{calcResult.solarGenerationVsConsumptionPct}%</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Approx Rooftop Area Required:</span>
                <span className="font-bold text-amber-400">{calcResult.approxRooftopAreaRequiredSqFt} sq.ft.</span>
              </div>

              {/* Investment Breakdown */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>Base EPC Rate:</span>
                  <span className="font-semibold text-slate-200">
                    ₹{activeBaseRate.toLocaleString('en-IN')} / kWp
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Base EPC Cost ({calcResult.actualDcPlantSizeKw} kW):</span>
                  <span className="font-semibold text-slate-200">₹{baseCost.toLocaleString('en-IN')}</span>
                </div>

                {priceDifference !== 0 && (
                  <div
                    className={`flex justify-between font-semibold ${
                      priceDifference > 0 ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    <span>Price Difference / Adjustment:</span>
                    <span>
                      {priceDifference > 0 ? '+' : ''}₹{priceDifference.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-slate-400">
                  <span>Gross EPC System Cost:</span>
                  <span className="font-semibold text-slate-200">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Blended Solar GST (8.9%):</span>
                  <span className="font-semibold text-slate-200">₹{gst.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-300 font-bold">
                  <span>Gross Commercial Cost:</span>
                  <span className="text-white">₹{totalCommercial.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>PM Surya Ghar Subsidy:</span>
                  <span>-₹{activeSubsidy.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-amber-400 pt-2 border-t border-slate-800">
                  <span>Net Customer Investment:</span>
                  <span>₹{netCustomerCost.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Payback badge */}
            <div className="p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700/80 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Simple Payback Period:</span>
                <span className="text-base font-black text-emerald-400">{paybackYears} Years</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Total 25-Year Power Savings:</span>
                <span className="font-bold text-amber-400">
                  ₹{calcResult.total25YearSavings.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed italic">
              *PM Surya Ghar subsidy credited directly to consumer Aadhaar-linked account by Govt of India after DISCOM inspection.
            </p>
          </div>

          {/* Lead Quotation History Card */}
          {quoteHistory && quoteHistory.length > 0 && (
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-500" />
                <span>{leadId ? 'Proposals for Selected Lead' : 'Recent Generated Proposals'}</span>
              </h4>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {quoteHistory.map((q: any) => (
                  <div
                    key={q.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900">{q.number}</p>
                        <p className="text-[11px] text-slate-500">
                          {q.kw} kWp • Net: ₹{q.net_cost?.toLocaleString('en-IN') || q.total?.toLocaleString('en-IN')}
                        </p>
                      </div>
                      {q.price_difference !== 0 && q.price_difference && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Diff: {q.price_difference > 0 ? '+' : ''}₹{q.price_difference}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(q.id, q.number)}
                        disabled={downloadingId === q.id}
                        className="flex-1 py-1.5 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center gap-1 transition-all disabled:opacity-50 text-[11px]"
                      >
                        {downloadingId === q.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        <span>Download PDF</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEditQuotation(q)}
                        className="py-1.5 px-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold flex items-center justify-center gap-1 transition-all text-[11px]"
                        title="Edit calculations and revise quotation"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                        <span>Edit / Revise</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: 25-YEAR SOLAR GENERATION & SAVINGS PROJECTION (Page 2) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              <span>3. 25-Year Solar Generation & Savings Projection</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct implementation of Page 2 compounding annual degradation and electricity tariff escalation
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowFull25Years(!showFull25Years)}
              className="text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200/80 flex items-center gap-1 transition-all"
            >
              <span>{showFull25Years ? 'Show 10 Years View' : 'Show Full 25 Years Table'}</span>
              {showFull25Years ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Assumptions Bar (Page 2 Header) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
          <div>
            <span className="text-slate-500 block text-[11px]">Annual Degradation Rate</span>
            <div className="flex items-center gap-1 mt-0.5">
              <input
                type="number"
                step="0.05"
                min="0.1"
                max="2.0"
                value={annualDegradationRatePct}
                onChange={(e) => setAnnualDegradationRatePct(Number(e.target.value))}
                className="w-16 px-2 py-1 rounded-lg border border-slate-200 font-bold text-slate-800"
              />
              <span className="font-semibold text-slate-500">%/yr</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Crystalline-silicon default 0.50%</span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px]">Annual Tariff Escalation</span>
            <div className="flex items-center gap-1 mt-0.5">
              <input
                type="number"
                step="0.25"
                min="0"
                max="10.0"
                value={annualTariffEscalationRatePct}
                onChange={(e) => setAnnualTariffEscalationRatePct(Number(e.target.value))}
                className="w-16 px-2 py-1 rounded-lg border border-slate-200 font-bold text-slate-800"
              />
              <span className="font-semibold text-slate-500">%/yr</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Year-on-year rise default 3.00%</span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px]">Base Monthly Gen (Yr 1)</span>
            <span className="font-bold text-slate-900 text-sm mt-1 block">
              {Math.round(calcResult.estimatedMonthlySolarGeneration)} kWh
            </span>
            <span className="text-[10px] text-slate-400 block">Linked from Solar Calculator</span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px]">Base Annual Gen (Yr 1)</span>
            <span className="font-bold text-slate-900 text-sm mt-1 block">
              {Math.round(calcResult.estimatedAnnualSolarGeneration).toLocaleString('en-IN')} kWh
            </span>
            <span className="text-[10px] text-slate-400 block">Linked from Solar Calculator</span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px]">Base Tariff (Yr 1)</span>
            <span className="font-bold text-slate-900 text-sm mt-1 block">₹{effectiveTariff.toFixed(2)}/kWh</span>
            <span className="text-[10px] text-slate-400 block">Linked from Solar Calculator</span>
          </div>
        </div>

        {/* Cumulative Savings Chart */}
        <div className="pt-2">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            25-Year Cumulative Savings Trajectory (₹)
          </h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={calcResult.projection25Years}
                margin={{ top: 10, right: 10, left: 20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tickFormatter={(y) => `Yr ${y}`} tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Cumulative Savings']}
                  labelFormatter={(y) => `Year ${y}`}
                />
                <Area
                  type="monotone"
                  dataKey="cumulativeSavings"
                  stroke="#d97706"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#savingsGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 25-Year Projection Table (Page 2 direct tabular replica) */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100/80 text-slate-800 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Year</th>
                <th className="py-2.5 px-3">Degradation Factor</th>
                <th className="py-2.5 px-3">Monthly Generation (kWh)</th>
                <th className="py-2.5 px-3">Annual Generation (kWh)</th>
                <th className="py-2.5 px-3">Tariff Rate (₹/kWh)</th>
                <th className="py-2.5 px-3">Annual Savings (₹)</th>
                <th className="py-2.5 px-3 text-right">Cumulative Savings (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(showFull25Years
                ? calcResult.projection25Years
                : calcResult.projection25Years.slice(0, 10)
              ).map((row) => (
                <tr
                  key={row.year}
                  className={`hover:bg-amber-50/40 transition-colors ${
                    row.year === 1 ? 'bg-amber-50/20 font-medium' : ''
                  }`}
                >
                  <td className="py-2 px-3 font-bold text-slate-900">{row.year}</td>
                  <td className="py-2 px-3 font-mono text-slate-600">{row.degradationFactor.toFixed(4)}</td>
                  <td className="py-2 px-3">{row.monthlyGeneration}</td>
                  <td className="py-2 px-3 font-semibold text-slate-900">
                    {row.annualGeneration.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2 px-3 font-mono">₹{row.tariffRate.toFixed(2)}</td>
                  <td className="py-2 px-3 font-semibold text-emerald-600">
                    ₹{row.annualSavings.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900">
                    ₹{row.cumulativeSavings.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}

              {/* TOTAL (25 yrs) Summary Row */}
              <tr className="bg-slate-900 text-white font-bold border-t-2 border-amber-400">
                <td className="py-3 px-3 uppercase tracking-wider text-amber-400 font-black">
                  TOTAL (25 yrs)
                </td>
                <td className="py-3 px-3 text-slate-400">-</td>
                <td className="py-3 px-3 text-slate-400">-</td>
                <td className="py-3 px-3 text-amber-400 font-black">
                  {calcResult.total25YearGeneration.toLocaleString('en-IN')} kWh
                </td>
                <td className="py-3 px-3 text-slate-400">-</td>
                <td className="py-3 px-3 text-emerald-400 font-black">
                  ₹{calcResult.total25YearSavings.toLocaleString('en-IN')}
                </td>
                <td className="py-3 px-3 text-right text-emerald-400 font-black text-sm">
                  ₹{calcResult.total25YearSavings.toLocaleString('en-IN')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed italic">
          Note: Generation is degraded annually from Year-1 output shown on the Solar Calculator sheet; the degradation and escalation rates above are editable assumptions. Tariff escalation and generation degradation are modelled as compounding annually, not intra-year. Actual results depend on irradiance, soiling, inverter performance and DISCOM tariff orders.
        </p>
      </div>

      {/* SUCCESS MODAL ON QUOTATION CREATION WITH DIRECT DOWNLOAD BUTTON */}
      {createdQuoteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Quotation Created!</h3>
                  <span className="font-mono text-xs font-bold text-amber-600">
                    {createdQuoteModal.number}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreatedQuoteModal(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>DC System Capacity:</span>
                <span className="font-bold text-slate-900">{createdQuoteModal.kw} kWp</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Base Rate:</span>
                <span className="font-semibold text-slate-800">
                  ₹{createdQuoteModal.base_rate_per_kw?.toLocaleString('en-IN') || '55,000'}/kWp
                </span>
              </div>
              {createdQuoteModal.price_difference !== 0 && (
                <div className="flex justify-between text-amber-700 font-semibold">
                  <span>Price Adjustment:</span>
                  <span>
                    {createdQuoteModal.price_difference > 0 ? '+' : ''}₹
                    {createdQuoteModal.price_difference?.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Gross Cost:</span>
                <span className="font-semibold text-slate-800">
                  ₹{createdQuoteModal.total?.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>PM Surya Ghar Subsidy:</span>
                <span>-₹{createdQuoteModal.subsidy?.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Net Customer Cost:</span>
                <span className="text-amber-600">
                  ₹{createdQuoteModal.net_cost?.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  handleDownloadPdf(createdQuoteModal.id, createdQuoteModal.number)
                }
                disabled={downloadingId === createdQuoteModal.id}
                className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
              >
                {downloadingId === createdQuoteModal.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Downloading PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download PDF Proposal Now</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setCreatedQuoteModal(null)}
                className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
              >
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
