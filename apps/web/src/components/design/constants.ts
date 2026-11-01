import { SolarPanelSpec, InverterSpec } from './types';

export const SOLAR_PANELS: SolarPanelSpec[] = [
  {
    id: 'tata-540-mono',
    brand: 'Tata Power Solar',
    model: 'TP540M-144 Mono PERC Half-Cut',
    wattage: 540,
    lengthMm: 2278,
    widthMm: 1134,
    vmp: 41.8,
    imp: 12.92,
    voc: 49.8,
    isc: 13.72,
    efficiency: 20.9,
    tempCoeff: -0.35,
    technology: 'Mono PERC Half-Cut',
    warrantyYears: 25,
  },
  {
    id: 'waaree-545-bi',
    brand: 'Waaree Solar',
    model: 'Bi-54 545W Bifacial Framed',
    wattage: 545,
    lengthMm: 2278,
    widthMm: 1134,
    vmp: 42.1,
    imp: 12.95,
    voc: 50.1,
    isc: 13.8,
    efficiency: 21.1,
    tempCoeff: -0.34,
    technology: 'Bifacial Mono PERC',
    warrantyYears: 30,
  },
  {
    id: 'adani-535-mono',
    brand: 'Adani Solar',
    model: 'Eternal Shine 535W DCR Compliant',
    wattage: 535,
    lengthMm: 2256,
    widthMm: 1133,
    vmp: 41.5,
    imp: 12.89,
    voc: 49.5,
    isc: 13.65,
    efficiency: 20.8,
    tempCoeff: -0.36,
    technology: 'Mono PERC (ALMM/DCR)',
    warrantyYears: 25,
  },
  {
    id: 'vikram-550-half',
    brand: 'Vikram Solar',
    model: 'SOMERA Pro 550W Half-Cell',
    wattage: 550,
    lengthMm: 2278,
    widthMm: 1134,
    vmp: 42.4,
    imp: 12.98,
    voc: 50.3,
    isc: 13.85,
    efficiency: 21.3,
    tempCoeff: -0.35,
    technology: 'Mono PERC Multi-Busbar',
    warrantyYears: 25,
  },
  {
    id: 'loom-550-shark',
    brand: 'Loom Solar',
    model: 'SHARK 550W TopCon Bifacial',
    wattage: 550,
    lengthMm: 2279,
    widthMm: 1134,
    vmp: 42.8,
    imp: 13.1,
    voc: 51.0,
    isc: 13.95,
    efficiency: 21.8,
    tempCoeff: -0.30,
    technology: 'N-Type TOPCon Bifacial',
    warrantyYears: 30,
  },
];

export const INVERTERS: InverterSpec[] = [
  {
    id: 'sungrow-5k',
    brand: 'Sungrow',
    model: 'SG5.0RS (5 kW Single Phase)',
    capacityKw: 5.0,
    mpptCount: 2,
    minMpptVolts: 90,
    maxMpptVolts: 560,
    maxDcVolts: 600,
    maxDcCurrent: 16.0,
    efficiency: 98.4,
    phases: 1,
    type: 'string',
  },
  {
    id: 'growatt-6k',
    brand: 'Growatt',
    model: 'MIN 6000TL-X (6 kW Single Phase)',
    capacityKw: 6.0,
    mpptCount: 2,
    minMpptVolts: 80,
    maxMpptVolts: 550,
    maxDcVolts: 550,
    maxDcCurrent: 13.5,
    efficiency: 98.4,
    phases: 1,
    type: 'string',
  },
  {
    id: 'solis-5k',
    brand: 'Solis',
    model: 'S6-GR1P5K (5 kW Single Phase)',
    capacityKw: 5.0,
    mpptCount: 2,
    minMpptVolts: 90,
    maxMpptVolts: 520,
    maxDcVolts: 600,
    maxDcCurrent: 14.0,
    efficiency: 97.7,
    phases: 1,
    type: 'string',
  },
  {
    id: 'goodwe-10k',
    brand: 'GoodWe',
    model: 'GW10K-SDT-20 (10 kW 3-Phase)',
    capacityKw: 10.0,
    mpptCount: 2,
    minMpptVolts: 180,
    maxMpptVolts: 850,
    maxDcVolts: 1000,
    maxDcCurrent: 16.0,
    efficiency: 98.6,
    phases: 3,
    type: 'string',
  },
  {
    id: 'enphase-iq8p',
    brand: 'Enphase',
    model: 'IQ8P Microinverter (480VA per panel)',
    capacityKw: 0.48,
    mpptCount: 1,
    minMpptVolts: 16,
    maxMpptVolts: 65,
    maxDcVolts: 65,
    maxDcCurrent: 14.0,
    efficiency: 97.5,
    phases: 1,
    type: 'micro',
  },
  {
    id: 'deye-10k',
    brand: 'Deye',
    model: 'SUN-10K-G03 (10 kW 3-Phase Dual MPPT)',
    capacityKw: 10.0,
    mpptCount: 2,
    minMpptVolts: 200,
    maxMpptVolts: 850,
    maxDcVolts: 1000,
    maxDcCurrent: 13.0,
    efficiency: 98.5,
    phases: 3,
    type: 'string',
  },
];

export interface CitySolarPreset {
  city: string;
  state: string;
  lat: number;
  lng: number;
  peakSunHours: number;
  ghi: number;
  dni: number;
  optimalTilt: number;
}

export const CITY_PRESETS: CitySolarPreset[] = [
  { city: 'Delhi', state: 'Delhi', lat: 28.6139, lng: 77.209, peakSunHours: 5.4, ghi: 5.8, dni: 5.1, optimalTilt: 28 },
  { city: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.8777, peakSunHours: 5.2, ghi: 5.5, dni: 4.8, optimalTilt: 19 },
  { city: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, peakSunHours: 5.5, ghi: 5.9, dni: 5.3, optimalTilt: 18 },
  { city: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946, peakSunHours: 5.3, ghi: 5.6, dni: 4.9, optimalTilt: 13 },
  { city: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714, peakSunHours: 5.8, ghi: 6.2, dni: 5.7, optimalTilt: 23 },
  { city: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, peakSunHours: 5.9, ghi: 6.4, dni: 6.0, optimalTilt: 26 },
  { city: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, peakSunHours: 5.3, ghi: 5.7, dni: 4.8, optimalTilt: 13 },
  { city: 'Hyderabad', state: 'Telangana', lat: 17.385, lng: 78.4867, peakSunHours: 5.4, ghi: 5.8, dni: 5.2, optimalTilt: 17 },
  { city: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462, peakSunHours: 5.2, ghi: 5.6, dni: 4.9, optimalTilt: 26 },
  { city: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639, peakSunHours: 4.8, ghi: 5.2, dni: 4.4, optimalTilt: 22 },
];

/**
 * Calculates PM Surya Ghar Muft Bijli Yojana Central Financial Assistance (CFA)
 * 1 kW = ₹30,000
 * 2 kW = ₹60,000
 * 3 kW+ = ₹78,000 (Maximum cap for residential rooftop)
 */
export function calculateCentralSubsidy(capacityKw: number): number {
  if (capacityKw <= 0) return 0;
  if (capacityKw <= 1.0) return 30000;
  if (capacityKw <= 2.0) return 30000 + (capacityKw - 1.0) * 30000;
  if (capacityKw <= 3.0) return 60000 + (capacityKw - 2.0) * 18000;
  return 78000; // Cap at ₹78,000 for 3kW and above
}

/**
 * Telecaller Pitch & Script Assistance for each wizard step
 */
export const TELECALLER_STEPS_SCRIPT: Record<number, { title: string; hint: string; pitch: string }> = {
  1: {
    title: 'Installation Location',
    hint: 'Confirm landmark and coordinates with customer',
    pitch:
      'Sir/Ma’am, based on your pin code in {{city}}, your roof receives an average of {{psh}} peak sun hours daily, which is prime solar territory for maximum generation!',
  },
  2: {
    title: 'Roof Setup',
    hint: 'Trace roof perimeter with click-to-draw polygon tool',
    pitch:
      'I am looking at your satellite roof image right now. What type of roof do you have—RCC concrete terrace, or metal shed?',
  },
  3: {
    title: 'Obstructions',
    hint: 'Mark water tanks, AC units, and staircase headroom',
    pitch:
      'Do you have any overhead water tanks, AC compressors, or a staircase mumty? We exclude those zones so zero shadow falls on your solar panels.',
  },
  4: {
    title: 'Component Selection',
    hint: 'Select Tier-1 panels, inverter & target kW',
    pitch:
      'We use Tier-1 ALMM-approved panels like Tata Power and Waaree Mono PERC with a 25-year performance warranty to guarantee your PM Surya Ghar subsidy approval.',
  },
  5: {
    title: 'Panel Placement',
    hint: 'Auto-fill layout or adjust tilt & azimuth',
    pitch:
      'We orient your panels facing True South at a {{tilt}}° tilt on an elevated C-Channel structure, leaving your terrace 100% usable for walking and clothes drying.',
  },
  6: {
    title: '3D & Shadow Simulation',
    hint: 'Drag time slider to show shadow trajectory',
    pitch:
      'I am generating a live 3D shadow simulation of your roof. Even during winter solstice when the sun is lowest, our spacing guarantees virtually zero panel shading!',
  },
  7: {
    title: 'Stringing & Inverter',
    hint: 'Place inverter & click Auto-String',
    pitch:
      'Our electrical algorithm splits your panels into balanced strings within the inverter’s peak MPPT efficiency zone, maximizing daily unit output.',
  },
  8: {
    title: 'Proposal & Energy Report',
    hint: 'Review monthly units and losses breakdown',
    pitch:
      'Your system will generate approx {{units}} units per month, saving you roughly ₹{{savings}} every month on your electric bill.',
  },
  9: {
    title: 'Single Line Diagram',
    hint: 'Review and verify electrical safety schematic',
    pitch:
      'Here is your certified Single Line Diagram showing all dual-protection DCDB and ACDB surge arrestors, complying with DISCOM net-metering safety standards.',
  },
  10: {
    title: 'Branded Proposal & Dynamic QR',
    hint: 'Send PDF proposal & share live 3D mobile link',
    pitch:
      'I’m emailing your proposal right now! When you scan the QR code on the front page with your phone, you can explore your roof in 3D with your family!',
  },
};
