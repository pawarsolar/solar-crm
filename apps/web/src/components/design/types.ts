export type RoofType = 'rcc_flat' | 'metal_shed' | 'ground_mount' | 'tile';
export type ObstructionType = 'water_tank' | 'ac_unit' | 'staircase' | 'tree' | 'chimney' | 'custom';
export type StructureProfile = 'c_channel_elevated' | 'flush_mount' | 'ballasted' | 'tin_clamp';
export type SeasonType = 'summer' | 'winter' | 'equinox';

export interface Point2D {
  x: number;
  y: number;
}

export interface Obstruction {
  id: string;
  name: string;
  type: ObstructionType;
  shape: 'rect' | 'circle' | 'polygon';
  x: number;
  y: number;
  width: number;
  length: number;
  radius: number;
  heightMeters: number;
  bufferMeters: number;
  color?: string;
}

export interface SolarPanelSpec {
  id: string;
  brand: string;
  model: string;
  wattage: number;
  lengthMm: number;
  widthMm: number;
  vmp: number;
  imp: number;
  voc: number;
  isc: number;
  efficiency: number;
  tempCoeff: number; // % / °C
  technology: string;
  warrantyYears: number;
}

export interface InverterSpec {
  id: string;
  brand: string;
  model: string;
  capacityKw: number;
  mpptCount: number;
  minMpptVolts: number;
  maxMpptVolts: number;
  maxDcVolts: number;
  maxDcCurrent: number;
  efficiency: number;
  phases: 1 | 3;
  type: 'string' | 'micro';
}

export interface PlacedPanel {
  id: string;
  x: number; // meters from roof center
  y: number; // meters from roof center
  z: number; // height offset
  width: number;
  length: number;
  azimuth: number;
  tilt: number;
  stringId?: string;
  stringOrder?: number;
  isShaded?: boolean;
  roofSection?: 'flat' | 'tin_shed';
}

export interface PanelString {
  id: string;
  name: string;
  color: string;
  panelIds: string[];
  inverterId?: string;
  mpptInput?: number;
  totalVmp: number;
  totalVoc: number;
  totalKw: number;
}

export interface InverterPlacement {
  x: number;
  y: number;
  z: number;
  wallMounted: boolean;
  mountedSide: 'north' | 'south' | 'east' | 'west' | 'ground';
}

export interface ShadowAnalysisSnapshot {
  morning: string; // base64 or data URL
  noon: string;
  evening: string;
  shadingLossPct: number;
}

export interface EnergyReport {
  annualGenerationMwh: number;
  dailyAvgKwh: number;
  specificYieldKwhPerKwp: number;
  performanceRatioPct: number;
  monthlyGenerationKwh: number[];
  losses: {
    shadingLossPct: number;
    temperatureLossPct: number;
    soilingLossPct: number;
    inverterLossPct: number;
    cableLossPct: number;
    mismatchLossPct: number;
    totalLossPct: number;
    netEfficiencyPct: number;
  };
}

export interface FinancialBreakdown {
  grossCost: number;
  centralSubsidy: number;
  stateSubsidy: number;
  netPayable: number;
  monthlySavings: number;
  annualSavings: number;
  paybackYears: number;
  lifetime25YearSavings: number;
  co2OffsetTonsYear: number;
  treesEquivalent: number;
}

export interface SolarDesignProject {
  id: string;
  createdAt: string;
  updatedAt: string;
  leadId?: string;
  customerInfo: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    consumerNumber?: string;
    sanctionedLoadKw?: number;
    monthlyBill: number;
    tariffRate: number;
  };
  location: {
    address: string;
    lat: number;
    lng: number;
    peakSunHours: number;
    ghiKwhM2: number;
    dniKwhM2: number;
    optimalTilt: number;
  };
  roof: {
    polygon: Point2D[];
    roofType: RoofType;
    heightFromGroundM: number;
    parapetHeightM: number;
    totalAreaSqM: number;
    totalAreaSqFt: number;
    usableAreaSqM: number;
  };
  obstructions: Obstruction[];
  components: {
    panel: SolarPanelSpec;
    inverter: InverterSpec;
    targetCapacityKw: number;
  };
  layout: {
    panels: PlacedPanel[];
    azimuth: number;
    tilt: number;
    structureProfile: StructureProfile;
    structureHeightM: number;
    rowSpacingM: number;
  };
  stringing: {
    strings: PanelString[];
    inverterPlacement: InverterPlacement;
  };
  analysis: {
    snapshots: ShadowAnalysisSnapshot;
    energyReport: EnergyReport;
  };
  financials: FinancialBreakdown;
  proposalNotes: string;
}
