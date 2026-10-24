import React from 'react';
import { Phone, MessageSquare, Zap, Calendar, User, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  city?: string;
  state?: string;
  system_kw?: number;
  stage: string;
  monthly_bill?: number;
  value_estimate?: number;
  next_followup_at?: string;
  created_at?: string;
  owner?: { full_name: string; role: string };
  source?: string;
}

const stageColorMap: Record<string, string> = {
  NEW: 'bg-blue-50 text-blue-700 border-blue-200',
  CONTACTED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  QUALIFIED: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  SURVEY_SCHEDULED: 'bg-amber-50 text-amber-700 border-amber-200',
  SURVEY_DONE: 'bg-amber-100 text-amber-800 border-amber-300',
  QUOTATION_SENT: 'bg-purple-50 text-purple-700 border-purple-200',
  NEGOTIATION: 'bg-orange-50 text-orange-700 border-orange-200',
  BOOKED: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
  INSTALLATION: 'bg-teal-50 text-teal-700 border-teal-200',
  COMMISSIONED: 'bg-green-100 text-green-800 border-green-300 font-bold',
  LOST: 'bg-slate-100 text-slate-600 border-slate-200',
  NOT_INTERESTED: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const LeadCard: React.FC<{ lead: Lead; onQuickAction?: () => void }> = ({ lead }) => {
  const navigate = useNavigate();

  const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=Hello%20${encodeURIComponent(lead.name)},%20this%20is%20Kyros%20Solar%20regarding%20your%20rooftop%20solar%20inquiry.`;

  return (
    <div
      onClick={() => navigate(`/leads/${lead.id}`)}
      className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer relative group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h3 className="font-semibold text-slate-900 text-base group-hover:text-amber-600 transition-colors">
            {lead.name}
          </h3>
          <p className="text-xs text-slate-500">{lead.city || 'Location unassigned'}</p>
        </div>
        <span
          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
            stageColorMap[lead.stage] || 'bg-slate-100 text-slate-700 border-slate-200'
          }`}
        >
          {lead.stage.replace('_', ' ')}
        </span>
      </div>

      {/* Metrics Row */}
      <div className="flex items-center gap-4 text-xs text-slate-600 my-2.5 py-1.5 border-y border-slate-50">
        <div className="flex items-center gap-1 font-medium text-slate-800">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>{lead.system_kw ? `${lead.system_kw} kW` : 'Size TBD'}</span>
        </div>
        {lead.value_estimate && (
          <div className="text-slate-600">
            Est: <span className="font-semibold text-slate-800">₹{Number(lead.value_estimate).toLocaleString('en-IN')}</span>
          </div>
        )}
      </div>

      {/* Import Timestamp */}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-2">
        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>
          Imported: {lead.created_at ? `${new Date(lead.created_at).toLocaleDateString()} ${new Date(lead.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Recent'}
        </span>
      </div>

      {/* Footer Info & One-Tap Communication */}
      <div className="flex items-center justify-between text-xs pt-1">
        <div className="flex items-center gap-1.5 text-slate-500 truncate max-w-[150px]">
          <User className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{lead.owner?.full_name || 'Unassigned'}</span>
        </div>

        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <a
            href={`tel:${lead.phone}`}
            className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 border border-slate-200/60 transition-colors"
            title="Call Lead"
          >
            <Phone className="w-3.5 h-3.5" />
          </a>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 border border-slate-200/60 transition-colors"
            title="WhatsApp Message"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </a>
          <div className="p-1 text-slate-400 group-hover:text-amber-500 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
