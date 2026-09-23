import React, { useState, useEffect } from 'react';
import { getContactById, createActivity, updateContact } from '../services/api';
import { 
  X, 
  Mail, 
  Phone, 
  Building2, 
  User, 
  Calendar, 
  MessageSquare, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  Loader2,
  FileText
} from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50/50">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span>Loading record...</span>
            </div>
          ) : contact ? (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                {contact.first_name[0]}{contact.last_name[0]}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {contact.first_name} {contact.last_name}
                </h3>
                <p className="text-xs text-slate-500">
                  {contact.job_title || 'Team Member'} {contact.company_name ? `at ${contact.company_name}` : ''}
                </p>
              </div>
            </div>
          ) : null}

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {contact && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Quick Details & Stage Pill */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Email</span>
                <span className="font-semibold text-slate-800 break-all">{contact.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Phone</span>
                <span className="font-semibold text-slate-800">{contact.phone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Lifecycle Stage</span>
                <select
                  disabled={changingStage}
                  value={contact.lifecycle_stage}
                  onChange={(e) => handleStageChange(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-indigo-700 focus:outline-none focus:border-indigo-500"
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

            {/* Quick Note Input (Creates Activity) */}
            <form onSubmit={handleAddNote} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Add Timeline Note (§10)</span>
                </label>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Log a call, meeting summary, or next step..."
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

            {/* Chronological Unified Activity Feed */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Unified Activity Timeline Feed</span>
              </h4>

              <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {(contact.activities || []).length === 0 ? (
                  <p className="text-xs text-slate-400 pl-8">No activities recorded yet.</p>
                ) : (
                  contact.activities.map((act) => {
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
                            {payload?.content || payload?.message || JSON.stringify(payload)}
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
