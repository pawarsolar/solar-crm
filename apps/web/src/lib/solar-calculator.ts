// ==============================================================================
// Solar Plant Size, Panel Sizing & 25-Year Projection Engine
// Modeled exactly according to the Solar EPC Sizing Specification
// ==============================================================================

export const PANEL_OPTIONS = [
  { label: '330W Panel', watts: 330 },
  { label: '400W Panel', watts: 400 },
  { label: '440W Panel', watts: 440 },
  { label: '450W Panel', watts: 450 },
  { label: '500W Panel', watts: 500 },
  { label: '535W Panel', watts: 535 },
  { label: '540W Panel', watts: 540 },
  { label: '550W Panel', watts: 550 },
  { label: '580W Panel', watts: 580 },
  { label: '585W Panel', watts: 585 },
  { label: '600W Panel', watts: 600 },
  { label: '610W Panel', watts: 610 },
  { label: '620W Panel', watts: 620 },
  { label: '650W Panel', watts: 650 },
  { label: '700W Panel', watts: 700 },
];

export interface SolarCalculatorInput {
  inputMethod: 'units' | 'bill';
  monthlyUnits: number;
  monthlyBill: number;
  effectiveTariff: number; // ₹/kWh, default ₹8.00
  targetSolarOffsetPct: number; // %, default 100%
  specificGeneration: number; // kWh/kWp/month, default 120.00 (range 120-135)
  selectedPanelWatt: number; // Watts, e.g. 620
  annualDegradationRatePct?: number; // %/yr, default 0.50%
  annualTariffEscalationRatePct?: number; // %/yr, default 3.00%
}

export interface YearProjection {
  year: number;
  degradationFactor: number;
  monthlyGeneration: number;
  annualGeneration: number;
  tariffRate: number;
  annualSavings: number;
  cumulativeSavings: number;
}

export interface SolarCalculatorOutput {
  monthlyConsumptionUsed: number;
  annualConsumption: number;
  requiredSolarGenerationMonth: number;
  recommendedSolarPlantSizeKw: number;
  selectedPanelWatt: number;
  panelsRequired: number;
  actualDcPlantSizeKw: number;
  estimatedMonthlySolarGeneration: number;
  estimatedAnnualSolarGeneration: number;
  estimatedMonthlyBillSaving: number;
  estimatedAnnualBillSaving: number;
  solarGenerationVsConsumptionPct: number;
  approxRooftopAreaRequiredSqFt: number;
  projection25Years: YearProjection[];
  total25YearGeneration: number;
  total25YearSavings: number;
}

export function calculateSolarSystem(input: SolarCalculatorInput): SolarCalculatorOutput {
  const tariff = input.effectiveTariff > 0 ? input.effectiveTariff : 8.0;
  const specificGen = input.specificGeneration > 0 ? input.specificGeneration : 120.0;
  const offsetPct = input.targetSolarOffsetPct > 0 ? input.targetSolarOffsetPct : 100.0;
  const panelWatt = input.selectedPanelWatt > 0 ? input.selectedPanelWatt : 620;
  const degRate = (input.annualDegradationRatePct ?? 0.5) / 100;
  const escRate = (input.annualTariffEscalationRatePct ?? 3.0) / 100;

  // 1. Monthly consumption used (kWh)
  const monthlyConsumptionUsed =
    input.inputMethod === 'units'
      ? Number(input.monthlyUnits || 0)
      : Number(((input.monthlyBill || 0) / tariff).toFixed(2));

  // 2. Annual Consumption (kWh)
  const annualConsumption = Number((monthlyConsumptionUsed * 12).toFixed(2));

  // 3. Required Solar Generation / Month (kWh)
  const requiredSolarGenerationMonth = Number((monthlyConsumptionUsed * (offsetPct / 100)).toFixed(2));

  // 4. Recommended Solar Plant Size (kWp / kW)
  const recommendedSolarPlantSizeKw =
    specificGen > 0
      ? Number((requiredSolarGenerationMonth / specificGen).toFixed(2))
      : 0;

  // 5. Panels Required (Nos.)
  const panelsRequired =
    panelWatt > 0
      ? Math.ceil((recommendedSolarPlantSizeKw * 1000) / panelWatt)
      : 0;

  // 6. Actual DC Plant Size with Selected Panels (kWp)
  const actualDcPlantSizeKw = Number(((panelsRequired * panelWatt) / 1000).toFixed(2));

  // 7. Estimated Monthly Solar Generation (kWh)
  const estimatedMonthlySolarGeneration = Number((actualDcPlantSizeKw * specificGen).toFixed(2));

  // 8. Estimated Annual Solar Generation (kWh)
  const estimatedAnnualSolarGeneration = Number((estimatedMonthlySolarGeneration * 12).toFixed(2));

  // 9. Commercial Savings (₹)
  const estimatedMonthlyBillSaving = Number((estimatedMonthlySolarGeneration * tariff).toFixed(2));
  const estimatedAnnualBillSaving = Number((estimatedAnnualSolarGeneration * tariff).toFixed(2));

  // 10. Solar Generation vs Consumption (%)
  const solarGenerationVsConsumptionPct =
    monthlyConsumptionUsed > 0
      ? Number(((estimatedMonthlySolarGeneration / monthlyConsumptionUsed) * 100).toFixed(1))
      : 0;

  // 11. Approx. Rooftop Area Required (sq.ft.)
  // Specification benchmark: 5.58 kWp requires 601 sq.ft. (ratio = ~107.706 sq.ft. per kWp)
  const approxRooftopAreaRequiredSqFt = Math.round(actualDcPlantSizeKw * 107.7);

  // 12. 25-Year Solar Generation & Savings Projection
  const projection25Years: YearProjection[] = [];
  let runningSavings = 0;
  let totalGeneration = 0;

  for (let year = 1; year <= 25; year++) {
    // Degradation Factor = (1 - degRate)^(year - 1)
    const factor = Math.pow(1 - degRate, year - 1);
    const degradationFactor = Number(factor.toFixed(4));

    // Generation in Year t
    const mGen = Math.round(estimatedMonthlySolarGeneration * factor);
    const aGen = Math.round(estimatedAnnualSolarGeneration * factor);

    // Escalated Tariff Rate in Year t
    const tRate = Number((tariff * Math.pow(1 + escRate, year - 1)).toFixed(2));

    // Annual savings in Year t
    const aSavings = Math.round(aGen * tRate);
    runningSavings += aSavings;
    totalGeneration += aGen;

    projection25Years.push({
      year,
      degradationFactor,
      monthlyGeneration: mGen,
      annualGeneration: aGen,
      tariffRate: tRate,
      annualSavings: aSavings,
      cumulativeSavings: runningSavings,
    });
  }

  return {
    monthlyConsumptionUsed,
    annualConsumption,
    requiredSolarGenerationMonth,
    recommendedSolarPlantSizeKw,
    selectedPanelWatt: panelWatt,
    panelsRequired,
    actualDcPlantSizeKw,
    estimatedMonthlySolarGeneration,
    estimatedAnnualSolarGeneration,
    estimatedMonthlyBillSaving,
    estimatedAnnualBillSaving,
    solarGenerationVsConsumptionPct,
    approxRooftopAreaRequiredSqFt,
    projection25Years,
    total25YearGeneration: totalGeneration,
    total25YearSavings: runningSavings,
  };
}
