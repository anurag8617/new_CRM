import React, { useState, useEffect } from 'react';
import { getDealById, updateDealStage, createActivity, deleteDeal } from '../services/api';
import { 
  X, 
  Briefcase, 
  Building2, 
  User, 
  Calendar, 
  DollarSign, 
  Percent, 
  Clock, 
  Plus, 
  Loader2, 
  FileText,
  Trash2,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export default function DealDetailModal({ dealId, onClose, onUpdated, stages = [] }) {
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noteContent, setNoteContent] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [changingStage, setChangingStage] = useState(false);

  const fetchDeal = async () => {
    if (!dealId) return;
    setLoading(true);
    try {
      const res = await getDealById(dealId);
      if (res.success) {
        setDeal(res.data);
      }
    } catch (e) {
      console.error('Failed to load deal:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeal();
  }, [dealId]);

  const handleStageChange = async (newStageId) => {
    setChangingStage(true);
    try {
      await updateDealStage(dealId, newStageId);
      await fetchDeal();
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Failed to change stage:', err);
    } finally {
      setChangingStage(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setSubmittingNote(true);
    try {
      await createActivity({
        recordType: 'deal',
        recordId: dealId,
        activityType: 'note',
        payload: { content: noteContent.trim() },
      });
      setNoteContent('');
      await fetchDeal();
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete deal "${deal.title}"?`)) return;
    try {
      await deleteDeal(dealId);
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
    }
  };

  if (!dealId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50/50">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span>Loading deal details...</span>
            </div>
          ) : deal ? (
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-sm">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    deal.status === 'won' ? 'bg-emerald-100 text-emerald-800' :
                    deal.status === 'lost' ? 'bg-rose-100 text-rose-800' :
                    'bg-indigo-100 text-indigo-800'
                  }`}>
                    {deal.status}
                  </span>
                  <span className="text-xs text-slate-400">Deal #{deal.id}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  {deal.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  {deal.company_name && (
                    <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{deal.company_name}</span>
                    </span>
                  )}
                  {deal.contact_name && (
                    <span className="inline-flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{deal.contact_name}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Deal not found</p>
          )}

          <div className="flex items-center gap-1">
            {deal && (
              <button
                onClick={handleDelete}
                title="Delete Deal"
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {deal && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* KPI Deal Highlights */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Deal Value</span>
                <span className="text-xl font-bold text-emerald-600">
                  ${parseFloat(deal.value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">{deal.currency}</span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Win Probability</span>
                <span className="text-xl font-bold text-indigo-600">
                  {deal.stage_probability}%
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Weighted: ${(deal.value * (deal.stage_probability / 100)).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Close</span>
                <span className="text-sm font-semibold text-slate-700 block mt-1">
                  {deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString() : 'Not Set'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Owner: {deal.owner_name || 'Admin'}</span>
              </div>
            </div>

            {/* Stage Selector Bar */}
            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Pipeline Stage Progression</span>
                </label>
                {changingStage && (
                  <span className="text-[11px] text-indigo-600 font-medium flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Saving stage...
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {stages.map((st) => {
                  const isCurrent = st.id === deal.stage_id;
                  return (
                    <button
                      key={st.id}
                      onClick={() => handleStageChange(st.id)}
                      disabled={changingStage}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                        isCurrent
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isCurrent ? '#ffffff' : st.color || '#6366f1' }}></span>
                      <span>{st.name}</span>
                      <span className="text-[10px] opacity-80">({st.probability}%)</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Note Input (Creates Activity on Deal) */}
            <form onSubmit={handleAddNote} className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>Add Deal Note (§10 Unified Timeline)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Log next action, meeting feedback, or pricing terms..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  type="submit"
                  disabled={submittingNote || !noteContent.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {submittingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Post</span>
                </button>
              </div>
            </form>

            {/* Chronological Activity Feed */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Deal Activity & History</span>
              </h4>

              <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {(deal.activities || []).length === 0 ? (
                  <p className="text-xs text-slate-400 pl-8">No activities recorded yet on this opportunity.</p>
                ) : (
                  deal.activities.map((act) => {
                    const payload = typeof act.payload_json === 'string' ? JSON.parse(act.payload_json) : act.payload_json;
                    return (
                      <div key={act.id} className="relative pl-8 text-xs">
                        <div className="absolute left-1.5 top-1 w-3 h-3 rounded-full bg-white border-2 border-indigo-600"></div>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-slate-800 capitalize">
                              {act.activity_type.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(act.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-slate-600">
                            {act.activity_type === 'status_change'
                              ? `Stage changed from "${payload.from}" to "${payload.to}" (${payload.probability}% win probability)`
                              : payload?.content || payload?.message || JSON.stringify(payload)}
                          </p>
                          {act.actor_name && (
                            <span className="text-[10px] text-indigo-600 font-medium mt-1 inline-block">
                              Logged by {act.actor_name}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
