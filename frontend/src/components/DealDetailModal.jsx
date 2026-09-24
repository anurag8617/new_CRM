import React, { useState, useEffect } from 'react';
import { getDealById, updateDealStage, createActivity, deleteDeal } from '../services/api';
import { 
  X, 
  Briefcase, 
  Building2, 
  User, 
  Calendar, 
  Clock, 
  Plus, 
  Loader2, 
  FileText,
  Trash2
} from 'lucide-react';
import { Button, Badge } from './ui';

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
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[var(--bg-overlay)] backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-[var(--bg-modal)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] overflow-hidden z-10 animate-in fade-in duration-150">
        {/* Header */}
        <div className="p-5 border-b border-[var(--border-subtle)] flex items-start justify-between bg-[var(--bg-surface-raised)]">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--text-tertiary)]" />
              <span>Loading opportunity...</span>
            </div>
          ) : deal ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--bg-surface-sunken)] border border-[var(--border-subtle)] text-[var(--accent)] flex items-center justify-center font-bold text-sm">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  {deal.title}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Pipeline: {deal.pipeline_name || 'Standard Sales Pipeline'}
                </p>
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            {deal && (
              <button
                onClick={handleDelete}
                className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors"
                title="Delete Deal"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-full text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {deal && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-[var(--bg-surface-sunken)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] text-xs">
              <div>
                <span className="text-[var(--text-tertiary)] block mb-0.5">Deal Value</span>
                <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                  ${parseFloat(deal.value || 0).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-tertiary)] block mb-0.5">Expected Close</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-tertiary)] block mb-0.5">Probability</span>
                <span className="font-medium text-[var(--accent)] tabular-nums">
                  {deal.probability}%
                </span>
              </div>
              <div>
                <span className="text-[var(--text-tertiary)] block mb-0.5">Stage</span>
                <select
                  disabled={changingStage}
                  value={deal.stage_id}
                  onChange={(e) => handleStageChange(Number(e.target.value))}
                  className="bg-[var(--bg-input)] border border-[var(--border-default)] rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)] cursor-pointer"
                >
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Associated Entities */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                <div className="min-w-0">
                  <span className="text-[11px] text-[var(--text-tertiary)] block">Company</span>
                  <span className="font-medium text-[var(--text-primary)] truncate block">
                    {deal.company_name || 'None associated'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] flex items-center gap-2.5">
                <User className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                <div className="min-w-0">
                  <span className="text-[11px] text-[var(--text-tertiary)] block">Primary Contact</span>
                  <span className="font-medium text-[var(--text-primary)] truncate block">
                    {deal.contact_name ? `${deal.contact_name} (${deal.contact_email || ''})` : 'None associated'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Note Input */}
            <form onSubmit={handleAddNote} className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                <span>Add Timeline Note</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Log stage progression note or update..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="flex-1 h-9 px-3 text-xs bg-[var(--bg-input)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                />
                <Button
                  variant="primary"
                  type="submit"
                  disabled={submittingNote || !noteContent.trim()}
                  loading={submittingNote}
                  icon={Plus}
                >
                  Post
                </Button>
              </div>
            </form>

            {/* Unified Activity Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                <span>Activity & Progression Timeline</span>
              </h4>

              <div className="space-y-2.5 relative pl-4 border-l border-[var(--border-subtle)]">
                {(deal.activities || []).length === 0 ? (
                  <p className="text-xs text-[var(--text-tertiary)] py-2">No activities recorded yet.</p>
                ) : (
                  deal.activities.map((act) => {
                    const payload = typeof act.payload_json === 'string' ? JSON.parse(act.payload_json) : act.payload_json;
                    return (
                      <div key={act.id} className="relative text-xs">
                        <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-[var(--accent)]" />
                        <div className="p-3 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-[var(--text-primary)] capitalize">
                              {act.activity_type.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] text-[var(--text-tertiary)]">
                              {new Date(act.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-[var(--text-secondary)] leading-relaxed">
                            {payload?.content || payload?.message || JSON.stringify(payload)}
                          </p>
                          {act.actor_name && (
                            <span className="text-[10px] text-[var(--text-tertiary)] block pt-0.5">
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
