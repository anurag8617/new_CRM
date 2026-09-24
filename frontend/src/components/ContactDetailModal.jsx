import React, { useState, useEffect } from 'react';
import { getContactById, createActivity, updateContact } from '../services/api';
import { 
  X, 
  Mail, 
  Phone, 
  Building2, 
  User, 
  Clock, 
  Plus, 
  Loader2,
  FileText
} from 'lucide-react';
import { Button, Badge } from './ui';

/**
 * UI.md §7.2 Record page modal
 * Unified timeline, inline property editing, and clean surfaces.
 */
export default function ContactDetailModal({ contactId, onClose, onUpdated }) {
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noteContent, setNoteContent] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [changingStage, setChangingStage] = useState(false);

  const fetchContact = async () => {
    if (!contactId) return;
    setLoading(true);
    try {
      const res = await getContactById(contactId);
      if (res.success) {
        setContact(res.data);
      }
    } catch (e) {
      console.error('Failed to load contact:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContact();
  }, [contactId]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setSubmittingNote(true);
    try {
      await createActivity({
        recordType: 'contact',
        recordId: contactId,
        activityType: 'note',
        payload: { content: noteContent.trim() },
      });
      setNoteContent('');
      await fetchContact();
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleStageChange = async (newStage) => {
    setChangingStage(true);
    try {
      await updateContact(contactId, { lifecycleStage: newStage });
      await fetchContact();
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Failed to update stage:', err);
    } finally {
      setChangingStage(false);
    }
  };

  if (!contactId) return null;

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
              <span>Loading record...</span>
            </div>
          ) : contact ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--bg-surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center justify-center font-medium text-sm">
                {contact.first_name[0]}{contact.last_name[0]}
              </div>
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  {contact.first_name} {contact.last_name}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {contact.job_title || 'Team Member'} {contact.company_name ? `at ${contact.company_name}` : ''}
                </p>
              </div>
            </div>
          ) : null}

          <button
            onClick={onClose}
            className="p-1 rounded-full text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        {contact && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Quick Details & Stage Pill */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-[var(--bg-surface-sunken)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] text-xs">
              <div>
                <span className="text-[var(--text-tertiary)] block mb-0.5">Email</span>
                <span className="font-medium text-[var(--text-primary)] break-all">{contact.email}</span>
              </div>
              <div>
                <span className="text-[var(--text-tertiary)] block mb-0.5">Phone</span>
                <span className="font-medium text-[var(--text-primary)]">{contact.phone || '—'}</span>
              </div>
              <div>
                <span className="text-[var(--text-tertiary)] block mb-0.5">Lifecycle Stage</span>
                <select
                  disabled={changingStage}
                  value={contact.lifecycle_stage}
                  onChange={(e) => handleStageChange(e.target.value)}
                  className="bg-[var(--bg-input)] border border-[var(--border-default)] rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)] cursor-pointer"
                >
                  <option value="subscriber">Subscriber</option>
                  <option value="lead">Lead</option>
                  <option value="marketing_qualified_lead">MQL</option>
                  <option value="sales_qualified_lead">SQL</option>
                  <option value="opportunity">Opportunity</option>
                  <option value="customer">Customer</option>
                  <option value="evangelist">Evangelist</option>
                </select>
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
                  placeholder="Log a call, meeting summary, or next step..."
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

            {/* Chronological Unified Activity Feed (§7.2) */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                <span>Unified Activity Timeline</span>
              </h4>

              <div className="space-y-2.5 relative pl-4 border-l border-[var(--border-subtle)]">
                {(contact.activities || []).length === 0 ? (
                  <p className="text-xs text-[var(--text-tertiary)] py-2">No activities recorded yet.</p>
                ) : (
                  contact.activities.map((act) => {
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
