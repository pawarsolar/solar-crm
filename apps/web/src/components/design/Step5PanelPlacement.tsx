import React, { useState, useRef, useEffect } from 'react';
import { PlacedPanel, Point2D, Obstruction, SolarPanelSpec, StructureProfile } from './types';
import { Compass, Sliders, Sparkles, Plus, Trash2, RotateCw, Grid, Layers } from 'lucide-react';

interface Step5Props {
  polygon: Point2D[];
  obstructions: Obstruction[];
  panelSpec: SolarPanelSpec;
  panels: PlacedPanel[];
  azimuth: number;
  tilt: number;
  structureProfile: StructureProfile;
  structureHeightM: number;
  onUpdatePanels: (panels: PlacedPanel[]) => void;
  onUpdateAzimuth: (azimuth: number) => void;
  onUpdateTilt: (tilt: number) => void;
  onUpdateStructure: (profile: StructureProfile, heightM: number) => void;
}

export const Step5PanelPlacement: React.FC<Step5Props> = ({
  polygon,
  obstructions,
  panelSpec,
  panels,
  azimuth,
  tilt,
  structureProfile,
  structureHeightM,
  onUpdatePanels,
  onUpdateAzimuth,
  onUpdateTilt,
  onUpdateStructure,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [roofSection, setRoofSection] = useState<'flat' | 'tin_shed'>('flat');

  // Point in polygon test (Ray casting)
  const isPointInPolygon = (x: number, y: number, poly: Point2D[]): boolean => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x;
      const yi = poly[i].y;
      const xj = poly[j].x;
      const yj = poly[j].y;
      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  };

  // Check collision with obstructions + safety buffer
  const isCollidingWithObstruction = (x: number, y: number, obsList: Obstruction[]): boolean => {
    for (const obs of obsList) {
      const dist = Math.hypot(x - obs.x, y - obs.y);
      const safeRadius = (obs.radius || Math.max(obs.width, obs.length) / 2 || 1.0) + (obs.bufferMeters || 0.8);
      if (dist < safeRadius) return true;
    }
    return false;
  };

  // Auto-Fill Grid Placement Algorithm
  const handleAutoFill = () => {
    if (polygon.length < 3) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    polygon.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const panelW = orientation === 'portrait' ? panelSpec.widthMm / 1000 : panelSpec.lengthMm / 1000;
    const panelL = orientation === 'portrait' ? panelSpec.lengthMm / 1000 : panelSpec.widthMm / 1000;
    const spacingX = 0.25; // meters between panels
    const spacingY = 0.6; // row spacing for shading clearance

    const setback = 0.6; // boundary setback margin
    const newPanels: PlacedPanel[] = [];
    let count = 0;

    for (let y = minY + setback + panelL / 2; y <= maxY - setback - panelL / 2; y += panelL + spacingY) {
      for (let x = minX + setback + panelW / 2; x <= maxX - setback - panelW / 2; x += panelW + spacingX) {
        // Test corners of panel inside polygon
        const p1 = isPointInPolygon(x - panelW / 2, y - panelL / 2, polygon);
        const p2 = isPointInPolygon(x + panelW / 2, y - panelL / 2, polygon);
        const p3 = isPointInPolygon(x + panelW / 2, y + panelL / 2, polygon);
        const p4 = isPointInPolygon(x - panelW / 2, y + panelL / 2, polygon);

        if (p1 && p2 && p3 && p4 && !isCollidingWithObstruction(x, y, obstructions)) {
          count++;
          newPanels.push({
            id: `p_${Date.now()}_${count}`,
            x: Math.round(x * 100) / 100,
            y: Math.round(y * 100) / 100,
            z: 0,
            width: panelW,
            length: panelL,
            azimuth,
            tilt,
            roofSection,
          });
        }
      }
    }

    onUpdatePanels(newPanels);
  };

  // Canvas Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    if (polygon.length < 3) return;

    let cx = polygon.reduce((acc, p) => acc + p.x, 0) / polygon.length;
    let cy = polygon.reduce((acc, p) => acc + p.y, 0) / polygon.length;

    const scale = 14;
    const originX = width / 2;
    const originY = height / 2;

    const toScreen = (x: number, y: number) => ({
      x: originX + (x - cx) * scale,
      y: originY + (y - cy) * scale,
    });

    // Draw Roof Boundary
    ctx.beginPath();
    const first = toScreen(polygon[0].x, polygon[0].y);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < polygon.length; i++) {
      const sp = toScreen(polygon[i].x, polygon[i].y);
      ctx.lineTo(sp.x, sp.y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(51, 65, 85, 0.4)';
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Obstructions
    obstructions.forEach((obs) => {
      const sp = toScreen(obs.x, obs.y);
      ctx.beginPath();
      if (obs.shape === 'circle') {
        ctx.arc(sp.x, sp.y, (obs.radius || 1) * scale, 0, Math.PI * 2);
      } else {
        const wPx = (obs.width || 2) * scale;
        const lPx = (obs.length || 2) * scale;
        ctx.rect(sp.x - wPx / 2, sp.y - lPx / 2, wPx, lPx);
      }
      ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.stroke();
    });

    // Draw Placed Panels
    panels.forEach((p, idx) => {
      const sp = toScreen(p.x, p.y);
      const wPx = (p.width || 1.134) * scale;
      const lPx = (p.length || 2.278) * scale;
      const isSelected = selectedPanelId === p.id;

      ctx.save();
      ctx.translate(sp.x, sp.y);
      // Azimuth rotation relative to True South
      ctx.rotate(-((azimuth - 180) * Math.PI) / 180);

      // Panel body (solar blue)
      ctx.fillStyle = isSelected ? '#38bdf8' : p.roofSection === 'tin_shed' ? '#0284c7' : '#1e3a8a';
      ctx.fillRect(-wPx / 2, -lPx / 2, wPx, lPx);

      // Aluminum border
      ctx.strokeStyle = isSelected ? '#ffffff' : '#94a3b8';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(-wPx / 2, -lPx / 2, wPx, lPx);

      // Subtle solar cell wafer grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-wPx / 2, 0);
      ctx.lineTo(wPx / 2, 0);
      ctx.stroke();

      ctx.restore();
    });
  }, [polygon, obstructions, panels, azimuth, tilt, selectedPanelId]);

  // Click on canvas to add or delete panel
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || polygon.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const scale = 14;
    const originX = canvas.width / 2;
    const originY = canvas.height / 2;

    let cx = polygon.reduce((acc, p) => acc + p.x, 0) / polygon.length;
    let cy = polygon.reduce((acc, p) => acc + p.y, 0) / polygon.length;

    // Check if clicked an existing panel -> delete or select
    for (let i = panels.length - 1; i >= 0; i--) {
      const p = panels[i];
      const sp = { x: originX + (p.x - cx) * scale, y: originY + (p.y - cy) * scale };
      const wPx = (p.width || 1.134) * scale;
      const lPx = (p.length || 2.278) * scale;
      if (Math.abs(mouseX - sp.x) < wPx / 2 && Math.abs(mouseY - sp.y) < lPx / 2) {
        // Remove panel on click
        onUpdatePanels(panels.filter((_, idx) => idx !== i));
        return;
      }
    }

    // Otherwise, place a single panel at click coordinates
    const worldX = Math.round((cx + (mouseX - originX) / scale) * 2) / 2;
    const worldY = Math.round((cy + (mouseY - originY) / scale) * 2) / 2;

    if (isPointInPolygon(worldX, worldY, polygon) && !isCollidingWithObstruction(worldX, worldY, obstructions)) {
      const panelW = orientation === 'portrait' ? panelSpec.widthMm / 1000 : panelSpec.lengthMm / 1000;
      const panelL = orientation === 'portrait' ? panelSpec.lengthMm / 1000 : panelSpec.widthMm / 1000;
      const newPanel: PlacedPanel = {
        id: `p_${Date.now()}`,
        x: worldX,
        y: worldY,
        z: 0,
        width: panelW,
        length: panelL,
        azimuth,
        tilt,
        roofSection,
      };
      onUpdatePanels([...panels, newPanel]);
    }
  };

  const totalKw = ((panels.length * panelSpec.wattage) / 1000).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Step 5: Solar Panel Array Layout & Structure</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Click &ldquo;Auto-Fill Array&rdquo; for optimal geometric distribution or click anywhere on the roof to add/remove panels.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAutoFill}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Auto-Fill Array</span>
          </button>

          <button
            type="button"
            onClick={() => onUpdatePanels([])}
            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-200"
            title="Clear all panels"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2D Placement Canvas */}
        <div className="lg:col-span-2 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl relative flex flex-col">
          <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between z-10 text-xs text-slate-300">
            <span>🖱️ Click empty space to add panel. Click existing panel to remove it.</span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-emerald-400 font-bold">{panels.length} Placed</span>
              <span className="font-mono text-amber-400 font-bold">{totalKw} kW</span>
            </div>
          </div>

          <canvas
            ref={canvasRef}
            width={640}
            height={420}
            className="w-full h-[400px] cursor-pointer"
            onClick={handleCanvasClick}
          />
        </div>

        {/* Orientation, Azimuth, Tilt & Structure Controls */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-amber-500" />
              Orientation & Angles
            </h4>

            {/* Azimuth Direction Slider */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-slate-700">Azimuth Direction:</span>
                <span className="font-mono font-bold text-amber-600">
                  {azimuth}° ({azimuth === 180 ? 'True South' : azimuth < 180 ? 'South-East' : 'South-West'})
                </span>
              </div>
              <input
                type="range"
                min="90"
                max="270"
                step="5"
                value={azimuth}
                onChange={(e) => onUpdateAzimuth(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>East (90°)</span>
                <button
                  type="button"
                  onClick={() => onUpdateAzimuth(180)}
                  className="text-amber-600 font-bold underline"
                >
                  True South (180°)
                </button>
                <span>West (270°)</span>
              </div>
            </div>

            {/* Tilt Angle Slider */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-slate-700">Panel Tilt Angle:</span>
                <span className="font-mono font-bold text-emerald-600">{tilt}°</span>
              </div>
              <input
                type="range"
                min="5"
                max="45"
                step="1"
                value={tilt}
                onChange={(e) => onUpdateTilt(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Recommended for latitude: 18°–24° for optimal annual solar generation.
              </span>
            </div>

            {/* Structure Profile Dropdown */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Mounting Structure Profile</label>
              <select
                value={structureProfile}
                onChange={(e) => onUpdateStructure(e.target.value as StructureProfile, structureHeightM)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-1 focus:ring-amber-500"
              >
                <option value="c_channel_elevated">Elevated C-Channel HDG Structure (Usable Terrace)</option>
                <option value="tin_clamp">Direct Clamped / Flush Mount (Tin Shed Roofs)</option>
                <option value="ballasted">Ballasted Non-Penetrating (Flat RCC)</option>
              </select>
            </div>

            {/* Elevated Structure Height */}
            {structureProfile === 'c_channel_elevated' && (
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-semibold text-slate-700">Structure Height:</span>
                  <span className="font-mono font-bold text-amber-600">{structureHeightM}m (Walking Clearance)</span>
                </div>
                <input
                  type="range"
                  min="1.2"
                  max="3.0"
                  step="0.1"
                  value={structureHeightM}
                  onChange={(e) => onUpdateStructure(structureProfile, parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            )}

            {/* Section Switcher (Supports Flat Roof + Tin Shed Combination) */}
            <div className="pt-2 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Roof Zone Type</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setRoofSection('flat')}
                  className={`py-1.5 px-3 rounded-xl font-medium border transition-all ${
                    roofSection === 'flat'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  Flat Terrace Area
                </button>
                <button
                  type="button"
                  onClick={() => setRoofSection('tin_shed')}
                  className={`py-1.5 px-3 rounded-xl font-medium border transition-all ${
                    roofSection === 'tin_shed'
                      ? 'bg-blue-600 text-white border-blue-500 font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  Elevated Tin Shed
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
