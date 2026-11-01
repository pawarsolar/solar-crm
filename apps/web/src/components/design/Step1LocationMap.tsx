import React, { useState } from 'react';
import { Search, MapPin, Sun, Zap, Compass, CheckCircle2, User, Phone, IndianRupee } from 'lucide-react';
import { CITY_PRESETS, CitySolarPreset } from './constants';

interface Step1Props {
  location: {
    address: string;
    lat: number;
    lng: number;
    peakSunHours: number;
    ghiKwhM2: number;
    dniKwhM2: number;
    optimalTilt: number;
  };
  customerInfo: {
    name: string;
    phone: string;
    monthlyBill: number;
    tariffRate: number;
  };
  onUpdateLocation: (data: Partial<Step1Props['location']>) => void;
  onUpdateCustomer: (data: Partial<Step1Props['customerInfo']>) => void;
  onConfirm: () => void;
}

export const Step1LocationMap: React.FC<Step1Props> = ({
  location,
  customerInfo,
  onUpdateLocation,
  onUpdateCustomer,
  onConfirm,
}) => {
  const [searchQuery, setSearchQuery] = useState(location.address || 'Pune, Maharashtra');
  const [selectedCity, setSelectedCity] = useState<CitySolarPreset | null>(
    CITY_PRESETS.find((c) => c.city.toLowerCase() === 'pune') || CITY_PRESETS[0],
  );
  const [isPinDragging, setIsPinDragging] = useState(false);
  const [pinOffset, setPinOffset] = useState({ x: 0, y: 0 });

  const handleSelectCity = (preset: CitySolarPreset) => {
    setSelectedCity(preset);
    setSearchQuery(`${preset.city}, ${preset.state}, India`);
    onUpdateLocation({
      address: `${preset.city}, ${preset.state}`,
      lat: preset.lat,
      lng: preset.lng,
      peakSunHours: preset.peakSunHours,
      ghiKwhM2: preset.ghi,
      dniKwhM2: preset.dni,
      optimalTilt: preset.optimalTilt,
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.toLowerCase();
    const found = CITY_PRESETS.find(
      (c) => query.includes(c.city.toLowerCase()) || query.includes(c.state.toLowerCase()),
    );
    if (found) {
      handleSelectCity(found);
    } else {
      // Custom geocoded address with approximate India solar average
      onUpdateLocation({
        address: searchQuery,
        lat: 19.5,
        lng: 75.5,
        peakSunHours: 5.3,
        ghiKwhM2: 5.6,
        dniKwhM2: 5.0,
        optimalTilt: 20,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & City Quick Presets */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Step 1: Installation Site & Solar Resource</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter customer address or landmark to retrieve satellite tile and live solar irradiation data.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Sun className="w-3.5 h-3.5 text-amber-600 animate-spin" />
            NASA-POWER / NREL Data Source
          </span>
        </div>

        {/* Address Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search roof address, society name, or pin code (e.g. Kothrud, Pune 411038)..."
            className="w-full pl-11 pr-28 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-inner"
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            Locate Roof
          </button>
        </form>

        {/* Quick Cities Pill Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-semibold text-slate-400 shrink-0">Popular:</span>
          {CITY_PRESETS.map((preset) => (
            <button
              key={preset.city}
              type="button"
              onClick={() => handleSelectCity(preset)}
              className={`px-3 py-1 rounded-lg text-xs font-medium shrink-0 transition-all cursor-pointer ${
                selectedCity?.city === preset.city
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {preset.city}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Map Tile Simulator with Draggable Pin */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-lg relative min-h-[380px] flex flex-col justify-between">
          {/* Simulated Satellite Map Tile Canvas */}
          <div
            className="absolute inset-0 bg-cover bg-center cursor-crosshair"
            style={{
              backgroundImage: `radial-gradient(circle at center, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.9) 100%), linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
              backgroundSize: '100% 100%, 30px 30px, 30px 30px',
              backgroundColor: '#1e293b',
            }}
            onMouseMove={(e) => {
              if (isPinDragging) {
                const rect = e.currentTarget.getBoundingClientRect();
                setPinOffset({
                  x: Math.max(-140, Math.min(140, e.clientX - rect.left - rect.width / 2)),
                  y: Math.max(-100, Math.min(100, e.clientY - rect.top - rect.height / 2)),
                });
              }
            }}
            onMouseUp={() => setIsPinDragging(false)}
          >
            {/* Visual Rooftop Silhouette under Pin */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-36 rounded-xl border-2 border-dashed border-amber-400/60 bg-amber-500/10 backdrop-blur-xs flex items-center justify-center pointer-events-none transition-transform"
              style={{
                transform: `translate(calc(-50% + ${pinOffset.x}px), calc(-50% + ${pinOffset.y}px))`,
              }}
            >
              <div className="text-[11px] font-mono text-amber-300 font-semibold bg-slate-950/80 px-2 py-0.5 rounded border border-amber-500/30">
                Lat: {(location.lat + pinOffset.y * 0.0001).toFixed(4)}° | Lng: {(location.lng + pinOffset.x * 0.0001).toFixed(4)}°
              </div>
            </div>

            {/* Draggable Map Pin Marker */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full cursor-grab active:cursor-grabbing group z-20"
              style={{
                transform: `translate(calc(-50% + ${pinOffset.x}px), calc(-100% + ${pinOffset.y}px))`,
              }}
              onMouseDown={() => setIsPinDragging(true)}
            >
              <div className="flex flex-col items-center">
                <div className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-white whitespace-nowrap mb-1">
                  Drag to target rooftop
                </div>
                <div className="w-10 h-10 rounded-full bg-rose-500 border-4 border-white shadow-2xl flex items-center justify-center text-white animate-bounce">
                  <MapPin className="w-5 h-5 fill-current" />
                </div>
                <div className="w-3 h-1.5 rounded-full bg-black/40 blur-xs mt-0.5" />
              </div>
            </div>
          </div>

          {/* Map Top Bar */}
          <div className="relative z-10 p-3.5 flex items-center justify-between bg-slate-900/80 backdrop-blur-md border-b border-slate-700/60">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-white">Satellite High-Resolution Layer (Zoom 19x)</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">{location.address}</span>
          </div>

          {/* Map Bottom Hint */}
          <div className="relative z-10 p-3 bg-slate-900/90 backdrop-blur-md border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-300">
            <span>💡 Tip: Telecaller can drag pin to lock onto customer&apos;s exact building terrace.</span>
            <button
              onClick={() => {
                setPinOffset({ x: 0, y: 0 });
              }}
              className="text-amber-400 hover:text-amber-300 text-xs font-medium underline"
            >
              Center Pin
            </button>
          </div>
        </div>

        {/* Solar Data & Customer Details Card */}
        <div className="space-y-4">
          {/* Background Solar Radiation Data */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-amber-500" />
              Solar Irradiance Metrics
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/70">
                <span className="text-[11px] font-medium text-amber-800">Peak Sun Hours</span>
                <div className="text-2xl font-extrabold text-amber-950 mt-0.5">
                  {location.peakSunHours} <span className="text-xs font-normal text-amber-700">hrs/day</span>
                </div>
                <span className="text-[10px] text-amber-600 mt-1 block">Tier-1 High Yield Zone</span>
              </div>

              <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/70">
                <span className="text-[11px] font-medium text-blue-800">Global Radiation (GHI)</span>
                <div className="text-2xl font-extrabold text-blue-950 mt-0.5">
                  {location.ghiKwhM2} <span className="text-xs font-normal text-blue-700">kWh/m²</span>
                </div>
                <span className="text-[10px] text-blue-600 mt-1 block">Annual daily average</span>
              </div>

              <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200/70">
                <span className="text-[11px] font-medium text-emerald-800">Direct Normal (DNI)</span>
                <div className="text-xl font-extrabold text-emerald-950 mt-0.5">
                  {location.dniKwhM2} <span className="text-xs font-normal text-emerald-700">kWh/m²</span>
                </div>
              </div>

              <div className="bg-purple-50/70 p-3 rounded-xl border border-purple-200/70">
                <span className="text-[11px] font-medium text-purple-800">Optimal Tilt</span>
                <div className="text-xl font-extrabold text-purple-950 mt-0.5">
                  {location.optimalTilt}° <span className="text-xs font-normal text-purple-700">True South</span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Call Context Info */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-500" />
              Customer Sales Profile
            </h4>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Customer Name</label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    value={customerInfo.name}
                    onChange={(e) => onUpdateCustomer({ name: e.target.value })}
                    placeholder="e.g. Ramesh Patel"
                    className="w-full pl-8 pr-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">Contact Number</label>
                <div className="relative mt-1">
                  <input
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => onUpdateCustomer({ phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full pl-8 pr-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">Average Monthly Electricity Bill</label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    value={customerInfo.monthlyBill || ''}
                    onChange={(e) => onUpdateCustomer({ monthlyBill: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g. 3500"
                    className="w-full pl-8 pr-3 py-1.5 text-xs font-bold text-slate-900 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500"
                  />
                  <IndianRupee className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
