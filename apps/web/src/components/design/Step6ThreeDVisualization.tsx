import React, { useRef, useState } from 'react';
import { Point2D, RoofType, Obstruction, PlacedPanel, StructureProfile, SeasonType } from './types';
import { Solar3DViewport, Solar3DViewportHandle } from './Solar3DViewport';
import { Sun, Calendar, Clock, Camera, ShieldCheck, Sparkles } from 'lucide-react';

interface Step6Props {
  polygon: Point2D[];
  roofType: RoofType;
  heightMeters: number;
  parapetHeightMeters: number;
  obstructions: Obstruction[];
  panels: PlacedPanel[];
  azimuth: number;
  tilt: number;
  structureProfile: StructureProfile;
  structureHeightM: number;
  latitude: number;
  onCaptureSnapshot?: (dataUrl: string) => void;
  onShadingUpdate?: (shadedPanelCount: number, shadePercentage: number) => void;
}

export const Step6ThreeDVisualization: React.FC<Step6Props> = ({
  polygon,
  roofType,
  heightMeters,
  parapetHeightMeters,
  obstructions,
  panels,
  azimuth,
  tilt,
  structureProfile,
  structureHeightM,
  latitude,
  onCaptureSnapshot,
  onShadingUpdate,
}) => {
  const viewportRef = useRef<Solar3DViewportHandle>(null);
  const [shadingPct, setShadingPct] = useState(0);
  const [capturedFeedback, setCapturedFeedback] = useState(false);

  const handleCapture = () => {
    if (!viewportRef.current) return;
    const dataUrl = viewportRef.current.captureSnapshot();
    onCaptureSnapshot?.(dataUrl);
    setCapturedFeedback(true);
    setTimeout(() => setCapturedFeedback(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Step 6: 3D Visualization & Real-Time Shadow Analysis</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Lightweight GPU-accelerated 3D model. Scrub time slider or change seasons to observe shadow trajectories on panels.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCapture}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4 text-amber-400" />
            <span>{capturedFeedback ? 'Snapshot Saved!' : 'Take 3D Snapshot'}</span>
          </button>
        </div>
      </div>

      {/* 3D Viewport Window */}
      <div className="h-[520px] w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
        <Solar3DViewport
          ref={viewportRef}
          polygon={polygon}
          roofType={roofType}
          heightMeters={heightMeters}
          parapetHeightMeters={parapetHeightMeters}
          obstructions={obstructions}
          panels={panels}
          azimuth={azimuth}
          tilt={tilt}
          structureProfile={structureProfile}
          structureHeightM={structureHeightM}
          latitude={latitude}
          showShadows={true}
          onShadingUpdate={(count, pct) => {
            setShadingPct(pct);
            onShadingUpdate?.(count, pct);
          }}
        />
      </div>

      {/* Analysis Explanations for Telecaller */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-amber-50/80 p-4 rounded-xl border border-amber-200/80">
          <span className="font-bold text-amber-900 flex items-center gap-1.5">
            <Sun className="w-4 h-4 text-amber-600" />
            Diurnal Shadow Sweep
          </span>
          <p className="text-amber-800 mt-1">
            Observe shadows at 9 AM, 12 PM, and 4 PM. In Northern hemisphere India, low winter sun casts longer northern shadows.
          </p>
        </div>

        <div className="bg-blue-50/80 p-4 rounded-xl border border-blue-200/80">
          <span className="font-bold text-blue-900 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-600" />
            Seasonal Sun Solstices
          </span>
          <p className="text-blue-800 mt-1">
            Toggle between Summer Solstice (highest sun elevation) and Winter Solstice (lowest sun elevation) to ensure year-round generation.
          </p>
        </div>

        <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-200/80">
          <span className="font-bold text-emerald-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Current Shading: {shadingPct}%
          </span>
          <p className="text-emerald-800 mt-1">
            {shadingPct < 5
              ? 'Excellent rooftop exposure! Over 95% of panels receive direct uninterrupted sunlight.'
              : 'Some panels fall into shade. Spacing or elevated structure profile helps eliminate losses.'}
          </p>
        </div>
      </div>
    </div>
  );
};
