import { describe, it, expect } from 'vitest';
import { calculateSolarSystem, PANEL_OPTIONS } from './solar-calculator';

describe('Solar Plant Size & Panel Calculator (Reference Document Spec)', () => {
  it('has all 15 industry panel options from 330W to 700W', () => {
    expect(PANEL_OPTIONS).toHaveLength(15);
    expect(PANEL_OPTIONS[0].watts).toBe(330);
    expect(PANEL_OPTIONS[PANEL_OPTIONS.length - 1].watts).toBe(700);
  });

  it('matches Page 1 specification numbers exactly for 600 kWh consumption with 620W panel', () => {
    const result = calculateSolarSystem({
      inputMethod: 'units',
      monthlyUnits: 600,
      monthlyBill: 0,
      effectiveTariff: 8.0,
      targetSolarOffsetPct: 100,
      specificGeneration: 120.0,
      selectedPanelWatt: 620,
      annualDegradationRatePct: 0.5,
      annualTariffEscalationRatePct: 3.0,
    });

    // 1. Calculated Result
    expect(result.monthlyConsumptionUsed).toBe(600.0);
    expect(result.annualConsumption).toBe(7200.0);
    expect(result.requiredSolarGenerationMonth).toBe(600.0);
    expect(result.recommendedSolarPlantSizeKw).toBe(5.0);
    expect(result.panelsRequired).toBe(9);
    expect(result.actualDcPlantSizeKw).toBe(5.58);
    expect(result.estimatedMonthlySolarGeneration).toBe(669.6);
    expect(result.estimatedAnnualSolarGeneration).toBe(8035.2);

    // 2. Commercial Output
    expect(result.estimatedMonthlyBillSaving).toBe(5356.8);
    expect(result.estimatedAnnualBillSaving).toBe(64281.6);
    expect(result.approxRooftopAreaRequiredSqFt).toBe(601);

    // 3. 25-Year Projection
    expect(result.projection25Years).toHaveLength(25);
    expect(result.projection25Years[0].year).toBe(1);
    expect(result.projection25Years[0].degradationFactor).toBe(1.0);
    expect(result.projection25Years[0].annualGeneration).toBe(8035);
    expect(result.projection25Years[0].annualSavings).toBe(64280);

    expect(result.projection25Years[1].year).toBe(2);
    expect(result.projection25Years[1].degradationFactor).toBe(0.995);
    expect(result.projection25Years[1].annualGeneration).toBe(7995);
    expect(result.projection25Years[1].tariffRate).toBe(8.24);

    expect(result.projection25Years[24].year).toBe(25);
    expect(result.projection25Years[24].degradationFactor).toBe(0.8867);
    expect(result.projection25Years[24].annualGeneration).toBe(7124);
    expect(result.projection25Years[24].tariffRate).toBe(16.26);

    // Total 25 year generation and cumulative savings
    expect(result.total25YearGeneration).toBeGreaterThan(189000);
    expect(result.total25YearSavings).toBeGreaterThan(2190000);
  });

  it('correctly derives consumption when inputMethod is bill', () => {
    const result = calculateSolarSystem({
      inputMethod: 'bill',
      monthlyUnits: 0,
      monthlyBill: 4800,
      effectiveTariff: 8.0,
      targetSolarOffsetPct: 100,
      specificGeneration: 120.0,
      selectedPanelWatt: 620,
    });

    expect(result.monthlyConsumptionUsed).toBe(600);
    expect(result.actualDcPlantSizeKw).toBe(5.58);
    expect(result.panelsRequired).toBe(9);
  });
});
