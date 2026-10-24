import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 mb-4 font-bold text-4xl">
        404
      </div>
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Page Not Found</h1>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mb-6">
        The route you are looking for does not exist or has been shifted in the solar operations pipeline.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-xs flex items-center gap-1.5 hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Go Back</span>
        </button>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:bg-amber-400"
        >
          <Home className="w-4 h-4" />
          <span>Return Home</span>
        </button>
      </div>
    </div>
  );
};
