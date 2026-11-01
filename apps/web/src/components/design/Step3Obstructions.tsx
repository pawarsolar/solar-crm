import React, { useState, useRef, useEffect } from 'react';
import { Obstruction, Point2D, ObstructionType } from './types';
import { Droplet, Wind, Home, Trees, Plus, Trash2, ShieldAlert, Sparkles } from 'lucide-react';

interface Step3Props {
  polygon: Point2D[];
  obstructions: Obstruction[];
  onUpdateObstructions: (obstructions: Obstruction[]) => void;
}

export const Step3Obstructions: React.FC<Step3Props> = ({
  polygon,
  obstructions,
  onUpdateObstructions,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedObsType, setSelectedObsType] = useState<ObstructionType>('water_tank');
  const [selectedObsId, setSelectedObsId] = useState<string | null>(null);
  const [draggingObsId, setDraggingObsId] = useState<string | null>(null);

  // Quick preset definitions
  const PRESETS: Array<{
    type: ObstructionType;
    label: string;
    icon: any;
    shape: 'rect' | 'circle' | 'polygon';
    width: number;
    length: number;
    radius: number;
    height: number;
    buffer: number;
    color: string;
  }> = [
    {
      type: 'water_tank',
      label: 'Water Tank (Sintex)',
      icon: Droplet,
      shape: 'circle',
      width: 1.5,
      length: 1.5,
      radius: 0.8,
      height: 1.8,
      buffer: 1.0,
      color: '#0284c7',
    },
    {
      type: 'ac_unit',
      label: 'AC Outdoor Compressor',
      icon: Wind,
      shape: 'rect',
      width: 1.1,
      length: 0.6,
      radius: 0.5,
      height: 0.8,
      buffer: 0.8,
      color: '#64748b',
    },
    {
      type: 'staircase',
      label: 'Staircase Mumty / Headroom',
      icon: Home,
      shape: 'rect',
      width: 3.0,
      length: 2.8,
      radius: 1.5,
      height: 2.8,
      buffer: 1.5,
      color: '#94a3b8',
    },
    {
      type: 'tree',
      label: 'Adjacent Tree / Foliage',
      icon: Trees,
      shape: 'circle',
      width: 3.0,
      length: 3.0,
      radius: 1.8,
      height: 4.5,
      buffer: 2.0,
      color: '#15803d',
    },
  ];

  // Quick add obstruction
  const handleAddPreset = (type: ObstructionType) => {
    const preset = PRESETS.find((p) => p.type === type) || PRESETS[0];
    let cx = 18;
    let cy = 16;
    if (polygon.length > 0) {
      cx = polygon.reduce((acc, p) => acc + p.x, 0) / polygon.length;
      cy = polygon.reduce((acc, p) => acc + p.y, 0) / polygon.length;
    }

    const newObs: Obstruction = {
      id: `obs_${Date.now()}`,
      name: `${preset.label} #${obstructions.length + 1}`,
      type: preset.type,
      shape: preset.shape,
      x: cx + (Math.random() * 4 - 2),
      y: cy + (Math.random() * 4 - 2),
      width: preset.width,
      length: preset.length,
      radius: preset.radius,
      heightMeters: preset.height,
      bufferMeters: preset.buffer,
      color: preset.color,
    };

    onUpdateObstructions([...obstructions, newObs]);
    setSelectedObsId(newObs.id);
  };

  const handleDelete = (id: string) => {
    onUpdateObstructions(obstructions.filter((o) => o.id !== id));
    if (selectedObsId === id) setSelectedObsId(null);
  };

  // Canvas drawing for roof + obstructions
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

    let cx = 0;
    let cy = 0;
    polygon.forEach((p) => {
      cx += p.x;
      cy += p.y;
    });
    cx /= polygon.length;
    cy /= polygon.length;

    const scale = 14;
    const originX = width / 2;
    const originY = height / 2;

    const toScreen = (x: number, y: number) => ({
      x: originX + (x - cx) * scale,
      y: originY + (y - cy) * scale,
    });

    // Draw Roof Polygon Base
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
      const isSelected = obs.id === selectedObsId;

      // Draw Buffer Setback Zone (Translucent Red Circle/Rect)
      ctx.beginPath();
      const bufferPx = (obs.bufferMeters || 1.0) * scale;
      if (obs.shape === 'circle') {
        const radiusPx = (obs.radius || 1) * scale;
        ctx.arc(sp.x, sp.y, radiusPx + bufferPx, 0, Math.PI * 2);
      } else {
        const wPx = (obs.width || 2) * scale;
        const lPx = (obs.length || 2) * scale;
        ctx.rect(sp.x - (wPx / 2 + bufferPx), sp.y - (lPx / 2 + bufferPx), wPx + bufferPx * 2, lPx + bufferPx * 2);
      }
      ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Main Obstruction Shape
      ctx.beginPath();
      if (obs.shape === 'circle') {
        const radiusPx = (obs.radius || 1) * scale;
        ctx.arc(sp.x, sp.y, radiusPx, 0, Math.PI * 2);
      } else {
        const wPx = (obs.width || 2) * scale;
        const lPx = (obs.length || 2) * scale;
        ctx.rect(sp.x - wPx / 2, sp.y - lPx / 2, wPx, lPx);
      }
      ctx.fillStyle = obs.color || '#ef4444';
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#38bdf8' : '#ffffff';
      ctx.lineWidth = isSelected ? 3 : 1.5;
      ctx.stroke();

      // Label & Height
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${obs.name.split(' ')[0]} (${obs.heightMeters}m)`, sp.x, sp.y + 3);
    });
  }, [polygon, obstructions, selectedObsId]);

  // Dragging Obstructions on Canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
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

    // Check hit test against obstructions
    for (let i = obstructions.length - 1; i >= 0; i--) {
      const obs = obstructions[i];
      const sx = originX + (obs.x - cx) * scale;
      const sy = originY + (obs.y - cy) * scale;
      const hitRadius = Math.max(16, (obs.radius || obs.width / 2 || 1) * scale);
      if (Math.hypot(mouseX - sx, mouseY - sy) < hitRadius) {
        setDraggingObsId(obs.id);
        setSelectedObsId(obs.id);
        return;
      }
    }

    // Clicked empty area -> deselect
    setSelectedObsId(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggingObsId || !canvasRef.current || polygon.length === 0) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const scale = 14;
    const originX = canvas.width / 2;
    const originY = canvas.height / 2;

    let cx = polygon.reduce((acc, p) => acc + p.x, 0) / polygon.length;
    let cy = polygon.reduce((acc, p) => acc + p.y, 0) / polygon.length;

    const newX = Math.round((cx + (mouseX - originX) / scale) * 2) / 2;
    const newY = Math.round((cy + (mouseY - originY) / scale) * 2) / 2;

    onUpdateObstructions(
      obstructions.map((obs) => (obs.id === draggingObsId ? { ...obs, x: newX, y: newY } : obs)),
    );
  };

  const selectedObs = obstructions.find((o) => o.id === selectedObsId);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Step 3: Roof Obstructions & Setback Buffers</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Identify all objects casting shadows. Click preset icons to drop them onto the rooftop canvas.
          </p>
        </div>

        {/* Quick Add Presets Row */}
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.type}
                type="button"
                onClick={() => handleAddPreset(preset.type)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <Icon className="w-3.5 h-3.5 text-amber-400" />
                <span>+ {preset.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas Display */}
        <div className="lg:col-span-2 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl relative flex flex-col">
          <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between z-10 text-xs text-slate-300">
            <span>Click & drag any obstacle to reposition. Dashed red outline = exclusion buffer zone.</span>
            <span className="font-mono text-amber-400 font-bold">{obstructions.length} Marked</span>
          </div>

          <canvas
            ref={canvasRef}
            width={640}
            height={420}
            className="w-full h-[400px] cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={() => setDraggingObsId(null)}
          />
        </div>

        {/* Obstruction Settings & List */}
        <div className="space-y-4">
          {/* Selected Obstruction Property Editor */}
          {selectedObs ? (
            <div className="bg-white p-5 rounded-2xl border-2 border-amber-500/50 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Edit: {selectedObs.name}
                </h4>
                <button
                  onClick={() => handleDelete(selectedObs.id)}
                  className="p-1 text-rose-500 hover:bg-rose-50 rounded-md"
                  title="Delete Obstruction"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Height: {selectedObs.heightMeters}m ({(selectedObs.heightMeters * 3.28).toFixed(1)} ft)
                </label>
                <input
                  type="range"
                  min="0.4"
                  max="6.0"
                  step="0.2"
                  value={selectedObs.heightMeters}
                  onChange={(e) => {
                    const h = parseFloat(e.target.value);
                    onUpdateObstructions(
                      obstructions.map((o) => (o.id === selectedObs.id ? { ...o, heightMeters: h } : o)),
                    );
                  }}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Setback Buffer Zone: {selectedObs.bufferMeters}m
                </label>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.2"
                  value={selectedObs.bufferMeters}
                  onChange={(e) => {
                    const b = parseFloat(e.target.value);
                    onUpdateObstructions(
                      obstructions.map((o) => (o.id === selectedObs.id ? { ...o, bufferMeters: b } : o)),
                    );
                  }}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-5 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
              Click an obstruction on the canvas or click a preset button above to configure its height and setback.
            </div>
          )}

          {/* List of Obstructions */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Marked Obstructions ({obstructions.length})
            </h4>

            {obstructions.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No obstructions marked. Whole roof is available.</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {obstructions.map((obs) => (
                  <div
                    key={obs.id}
                    onClick={() => setSelectedObsId(obs.id)}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all cursor-pointer ${
                      selectedObsId === obs.id
                        ? 'bg-amber-50 text-amber-900 border border-amber-300 font-semibold'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: obs.color }} />
                      <span>{obs.name}</span>
                      <span className="text-[10px] text-slate-400">({obs.heightMeters}m tall)</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(obs.id);
                      }}
                      className="text-slate-400 hover:text-rose-500 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
