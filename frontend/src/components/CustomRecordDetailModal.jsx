import React, { useState, useEffect } from 'react';
import { getCustomRecordById, createActivity, deleteCustomRecord } from '../services/api';
import { 
  X, 
  Database, 
  Building2, 
  User, 
  Calendar, 
  Clock, 
  Plus, 
  Loader2, 
  FileText,
  Trash2,
  Tag,
  Link as LinkIcon
} from 'lucide-react';

export default function CustomRecordDetailModal({ objectId, recordId, fields = [], onClose, onUpdated }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noteContent, setNoteContent] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  const fetchRecord = async () => {
    if (!objectId || !recordId) return;
    setLoading(true);
    try {
      const res = await getCustomRecordById(objectId, recordId);
      if (res.success) {
        setRecord(res.data);
      }
    } catch (e) {
      console.error('Failed to load custom record:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecord();
  }, [objectId, recordId]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setSubmittingNote(true);
    try {
      await createActivity({
        recordType: 'custom_record',
        recordId: recordId,
        activityType: 'note',
        payload: { content: noteContent.trim() },
      });
      setNoteContent('');
      await fetchRecord();
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Failed to add note to custom record:', err);
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete record "${record.record_name}"?`)) return;
    try {
      await deleteCustomRecord(objectId, recordId);
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
    }
  };

  if (!recordId) return null;

  const data = record?.data || {};

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
          ) : record ? (
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-xl shadow-sm">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800">
                    Custom Entity Record
                  </span>
                  <span className="text-xs text-slate-400">ID #{record.id}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  {record.record_name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Created by {record.created_by_name || 'Admin'} on {new Date(record.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Record not found</p>
          )}

          <div className="flex items-center gap-1">
            {record && (
              <button
                onClick={handleDelete}
                title="Delete Record"
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
        {record && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Dynamic Custom Fields Grid */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-sky-600" />
                <span>Entity Properties (Spec §2.3)</span>
              </h4>

              <div className="grid grid-cols-2 gap-3">
                {fields.map((field) => {
                  const val = data[field.field_key];
                  return (
                    <div key={field.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {field.label}
                      </span>
                      <span className="text-sm font-semibold text-slate-800 mt-0.5 block">
                        {val === undefined || val === null || val === '' ? (
                          <span className="text-slate-400 italic font-normal text-xs">Empty</span>
                        ) : field.field_type === 'currency' ? (
                          `$${parseFloat(val).toLocaleString('en-US', { minimumFractionDigits: 0 })}`
                        ) : field.field_type === 'number' ? (
                          parseFloat(val).toLocaleString('en-US')
                        ) : (
                          String(val)
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Linked Cross-Object Relationships */}
            {record.relationships && record.relationships.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Cross-Object Relationships (§2.4)</span>
                </h4>
                <div className="space-y-2">
                  {record.relationships.map((rel) => (
                    <div key={rel.id} className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <div>
                          <span className="font-semibold text-slate-800">{rel.company_name || 'Associated Record'}</span>
                          <span className="text-[10px] text-slate-500 block">{rel.relationship_name}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-indigo-700 border border-indigo-200">
                        Linked Account
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Note Input */}
            <form onSubmit={handleAddNote} className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-sky-600" />
                <span>Add Record Note (§10 Timeline)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Log maintenance notice, inspection report, or lease update..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                />
                <button
                  type="submit"
                  disabled={submittingNote || !noteContent.trim()}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50 transition-colors flex items-center gap-1.5"
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
                <span>Record Activity & History</span>
              </h4>

              <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {(record.activities || []).length === 0 ? (
                  <p className="text-xs text-slate-400 pl-8">No activities recorded yet on this record.</p>
                ) : (
                  record.activities.map((act) => {
                    const payload = typeof act.payload_json === 'string' ? JSON.parse(act.payload_json) : act.payload_json;
                    return (
                      <div key={act.id} className="relative pl-8 text-xs">
                        <div className="absolute left-1.5 top-1 w-3 h-3 rounded-full bg-white border-2 border-sky-600"></div>
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
                            <span className="text-[10px] text-sky-600 font-medium mt-1 inline-block">
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
