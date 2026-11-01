import React, { useState, useRef, useEffect } from 'react';
import { Point2D, RoofType } from './types';
import { Square, RotateCcw, Trash2, CheckCircle, Sliders, Layers, Ruler } from 'lucide-react';

interface Step2Props {
  polygon: Point2D[];
  roofType: RoofType;
  heightFromGroundM: number;
  parapetHeightM: number;
  onUpdateRoof: (data: {
    polygon?: Point2D[];
    roofType?: RoofType;
    heightFromGroundM?: number;
    parapetHeightM?: number;
    totalAreaSqM?: number;
    totalAreaSqFt?: number;
  }) => void;
}

export const Step2RoofSetup: React.FC<Step2Props> = ({
  polygon,
  roofType,
  heightFromGroundM,
  parapetHeightM,
  onUpdateRoof,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<Point2D[]>(
    polygon.length >= 3
      ? polygon
      : [
          { x: 10, y: 10 },
          { x: 25, y: 10 },
          { x: 25, y: 22 },
          { x: 10, y: 22 },
        ],
  );
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  // Calculate polygon area using Shoelace formula
  const calculateArea = (pts: Point2D[]): { sqM: number; sqFt: number } => {
    if (pts.length < 3) return { sqM: 0, sqFt: 0 };
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      area += pts[i].x * pts[j].y;
      area -= pts[j].x * pts[i].y;
    }
    const sqM = Math.abs(area) / 2;
    const sqFt = sqM * 10.7639;
    return { sqM: Math.round(sqM * 10) / 10, sqFt: Math.round(sqFt) };
  };

  const { sqM, sqFt } = calculateArea(points);

  useEffect(() => {
    onUpdateRoof({
      polygon: points,
      totalAreaSqM: sqM,
      totalAreaSqFt: sqFt,
    });
  }, [points, sqM, sqFt]);

  // Draw 2D Top-down Satellite Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background satellite simulator texture
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Coordinate grid (1 meter = 12 pixels, centered)
    const scale = 14; // px per meter
    const originX = width / 2;
    const originY = height / 2;

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += scale * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += scale * 2) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (points.length < 1) return;

    // Calculate centroid of points to center in canvas
    let cx = 0;
    let cy = 0;
    points.forEach((p) => {
      cx += p.x;
      cy += p.y;
    });
    cx /= points.length;
    cy /= points.length;

    const toScreen = (p: Point2D) => ({
      x: originX + (p.x - cx) * scale,
      y: originY + (p.y - cy) * scale,
    });

    // Draw Polygon Perimeter & Shaded Area
    ctx.beginPath();
    const first = toScreen(points[0]);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < points.length; i++) {
      const sp = toScreen(points[i]);
      ctx.lineTo(sp.x, sp.y);
    }
    ctx.closePath();

    // Fill roof area with semi-transparent amber
    ctx.fillStyle = roofType === 'metal_shed' ? 'rgba(71, 85, 105, 0.45)' : 'rgba(245, 158, 11, 0.18)';
    ctx.fill();

    // Outline
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Draw Vertices (Interactive Handles)
    points.forEach((p, idx) => {
      const sp = toScreen(p);
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, draggingIdx === idx ? 8 : 6, 0, Math.PI * 2);
      ctx.fillStyle = draggingIdx === idx ? '#38bdf8' : '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Vertex label
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText(`V${idx + 1}`, sp.x + 8, sp.y - 8);
    });

    // Draw dimension measurements along edges
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px sans-serif';
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      const sp1 = toScreen(p1);
      const sp2 = toScreen(p2);
      const midX = (sp1.x + sp2.x) / 2;
      const midY = (sp1.y + sp2.y) / 2;
      const lengthM = Math.hypot(p2.x - p1.x, p2.y - p1.y).toFixed(1);
      ctx.fillText(`${lengthM}m`, midX, midY - 6);
    }
  }, [points, draggingIdx, roofType]);

  // Click to add vertex or start dragging
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const scale = 14;
    const originX = canvas.width / 2;
    const originY = canvas.height / 2;

    let cx = 0;
    let cy = 0;
    if (points.length > 0) {
      points.forEach((p) => {
        cx += p.x;
        cy += p.y;
      });
      cx /= points.length;
      cy /= points.length;
    }

    // Check if clicked an existing vertex to drag
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const sx = originX + (p.x - cx) * scale;
      const sy = originY + (p.y - cy) * scale;
      if (Math.hypot(mouseX - sx, mouseY - sy) < 12) {
        setDraggingIdx(i);
        return;
      }
    }

    // Otherwise, add new vertex at clicked point
    const worldX = cx + (mouseX - originX) / scale;
    const worldY = cy + (mouseY - originY) / scale;
    setPoints([...points, { x: Math.round(worldX * 2) / 2, y: Math.round(worldY * 2) / 2 }]);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingIdx === null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const scale = 14;
    const originX = canvas.width / 2;
    const originY = canvas.height / 2;

    let cx = 0;
    let cy = 0;
    points.forEach((p) => {
      cx += p.x;
      cy += p.y;
    });
    cx /= points.length;
    cy /= points.length;

    const newX = Math.round((cx + (mouseX - originX) / scale) * 2) / 2;
    const newY = Math.round((cy + (mouseY - originY) / scale) * 2) / 2;

    const updated = [...points];
    updated[draggingIdx] = { x: newX, y: newY };
    setPoints(updated);
  };

  const handleCanvasMouseUp = () => {
    setDraggingIdx(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Step 2: Roof Boundary & Specifications</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Click on canvas to add corner vertices or drag existing corners to match the building outline.
          </p>
        </div>

        {/* Live Area Metric Badges */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 text-white px-4 py-2 rounded-xl border border-slate-700 shadow-sm">
            <span className="text-[10px] uppercase font-semibold text-amber-400 block tracking-wider">
              Total Roof Area
            </span>
            <div className="text-lg font-mono font-bold text-white">
              {sqM} <span className="text-xs font-normal text-slate-400">m²</span>
              <span className="text-xs font-normal text-slate-400 ml-1.5">({sqFt} sq.ft)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive 2D Polygon Drawing Canvas */}
        <div className="lg:col-span-2 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl relative flex flex-col">
          {/* Top Bar with Toolbar */}
          <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">2D Satellite Drawing Tool</span>
              <span className="text-[10px] text-slate-400">({points.length} vertices)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setPoints([
                    { x: 10, y: 10 },
                    { x: 26, y: 10 },
                    { x: 26, y: 22 },
                    { x: 10, y: 22 },
                  ]);
                }}
                className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 flex items-center gap-1"
                title="Rectangular Terrace"
              >
                <Square className="w-3.5 h-3.5 text-amber-400" />
                <span>Box</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPoints([
                    { x: 8, y: 8 },
                    { x: 26, y: 8 },
                    { x: 26, y: 16 },
                    { x: 18, y: 16 },
                    { x: 18, y: 24 },
                    { x: 8, y: 24 },
                  ]);
                }}
                className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 flex items-center gap-1"
                title="L-Shaped Terrace"
              >
                <span>L-Shape</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (points.length > 3) setPoints(points.slice(0, -1));
                }}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700"
                title="Undo Last Vertex"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setPoints([]);
                }}
                className="p-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-lg border border-rose-800/60"
                title="Clear Boundary"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Canvas */}
          <canvas
            ref={canvasRef}
            width={640}
            height={420}
            className="w-full h-[400px] cursor-crosshair"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
          />

          {/* Canvas Footer Helper */}
          <div className="p-2.5 bg-slate-900/90 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>🖱️ Click canvas to add new points. Click and drag white dots to adjust corners.</span>
            <span className="font-mono text-amber-400">1 grid square = 2m × 2m</span>
          </div>
        </div>

        {/* Roof Settings & Elevation Sliders */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-slate-600" />
              Roof Parameters
            </h4>

            {/* Roof Type Dropdown */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Roof Type</label>
              <select
                value={roofType}
                onChange={(e) => onUpdateRoof({ roofType: e.target.value as RoofType })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                <option value="rcc_flat">RCC Concrete Flat Roof (Standard Terrace)</option>
                <option value="metal_shed">Metal Shed / Industrial Tin Roof</option>
                <option value="tile">Clay / Ceramic Tile Sloped Roof</option>
                <option value="ground_mount">Ground Mount / Open Plot</option>
              </select>
            </div>

            {/* Height from Ground Slider */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-slate-700">Height from Ground:</span>
                <span className="font-mono font-bold text-amber-600">{heightFromGroundM} meters ({(heightFromGroundM * 3.28).toFixed(1)} ft)</span>
              </div>
              <input
                type="range"
                min="2.5"
                max="25.0"
                step="0.5"
                value={heightFromGroundM}
                onChange={(e) => onUpdateRoof({ heightFromGroundM: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>G+0 (3m)</span>
                <span>G+2 (9m)</span>
                <span>G+4 (15m+)</span>
              </div>
            </div>

            {/* Parapet Wall Height Slider */}
            {roofType === 'rcc_flat' && (
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-semibold text-slate-700">Parapet Wall Height:</span>
                  <span className="font-mono font-bold text-amber-600">{parapetHeightM} meters ({Math.round(parapetHeightM * 100)} cm)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.8"
                  step="0.1"
                  value={parapetHeightM}
                  onChange={(e) => onUpdateRoof({ parapetHeightM: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Simulates shadow cast by boundary walls onto the panel array.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
