import React, { useState, useEffect } from 'react';
import { 
  getCustomObjects, 
  getCustomObjectById, 
  createCustomObject, 
  deleteCustomObject,
  addCustomField, 
  deleteCustomField,
  getCustomRecords, 
  createCustomRecord 
} from '../services/api';
import CustomRecordDetailModal from './CustomRecordDetailModal';
import { 
  Database, 
  Plus, 
  Search, 
  Settings, 
  Table, 
  Trash2, 
  Eye, 
  RefreshCw, 
  Loader2, 
  X, 
  AlertCircle, 
  Check, 
  Layers, 
  FolderPlus,
  Sliders,
  DollarSign,
  Calendar,
  Tag
} from 'lucide-react';

export default function CustomObjectsView() {
  const [objects, setObjects] = useState([]);
  const [selectedObjectId, setSelectedObjectId] = useState(null);
  const [currentObject, setCurrentObject] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('data'); // 'data' | 'schema'
  const [activeRecordId, setActiveRecordId] = useState(null);

  // New Entity Modal State
  const [isNewEntityOpen, setIsNewEntityOpen] = useState(false);
  const [newEntityLoading, setNewEntityLoading] = useState(false);
  const [newEntityError, setNewEntityError] = useState(null);
  const [newEntityForm, setNewEntityForm] = useState({
    name: '',
    singularName: '',
    description: '',
    color: '#0ea5e9',
  });

  // New Field Modal State
  const [isNewFieldOpen, setIsNewFieldOpen] = useState(false);
  const [newFieldLoading, setNewFieldLoading] = useState(false);
  const [newFieldError, setNewFieldError] = useState(null);
  const [newFieldForm, setNewFieldForm] = useState({
    label: '',
    fieldType: 'text',
    optionsText: '',
    isRequired: false,
  });

  // New Record Modal State
  const [isNewRecordOpen, setIsNewRecordOpen] = useState(false);
  const [newRecordLoading, setNewRecordLoading] = useState(false);
  const [newRecordError, setNewRecordError] = useState(null);
  const [newRecordName, setNewRecordName] = useState('');
  const [newRecordData, setNewRecordData] = useState({});

  const fetchObjects = async () => {
    setLoading(true);
    try {
      const res = await getCustomObjects();
      if (res.success && res.data.length > 0) {
        setObjects(res.data);
        if (!selectedObjectId) {
          setSelectedObjectId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load custom objects:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchObjectDetails = async () => {
    if (!selectedObjectId) return;
    try {
      const res = await getCustomObjectById(selectedObjectId);
      if (res.success) {
        setCurrentObject(res.data);
      }
    } catch (err) {
      console.error('Failed to load object schema:', err);
    }
  };

  const fetchRecords = async () => {
    if (!selectedObjectId) return;
    setRecordsLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      const res = await getCustomRecords(selectedObjectId, params);
      if (res.success) {
        setRecords(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load custom records:', err);
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    fetchObjects();
  }, []);

  useEffect(() => {
    if (selectedObjectId) {
      fetchObjectDetails();
      fetchRecords();
    }
  }, [selectedObjectId, search]);

  const handleCreateEntity = async (e) => {
    e.preventDefault();
    if (!newEntityForm.name.trim()) return;
    setNewEntityLoading(true);
    setNewEntityError(null);
    try {
      const res = await createCustomObject(newEntityForm);
      if (res.success) {
        setIsNewEntityOpen(false);
        setNewEntityForm({ name: '', singularName: '', description: '', color: '#0ea5e9' });
        await fetchObjects();
        setSelectedObjectId(res.data.id);
      }
    } catch (err) {
      setNewEntityError(err.response?.data?.message || err.message);
    } finally {
      setNewEntityLoading(false);
    }
  };

  const handleAddField = async (e) => {
    e.preventDefault();
    if (!newFieldForm.label.trim()) return;
    setNewFieldLoading(true);
    setNewFieldError(null);
    try {
      let options = null;
      if (newFieldForm.fieldType === 'select' && newFieldForm.optionsText) {
        options = newFieldForm.optionsText.split(',').map((s) => s.trim()).filter(Boolean);
      }

      await addCustomField(selectedObjectId, {
        label: newFieldForm.label.trim(),
        fieldType: newFieldForm.fieldType,
        options,
        isRequired: newFieldForm.isRequired,
      });

      setIsNewFieldOpen(false);
      setNewFieldForm({ label: '', fieldType: 'text', optionsText: '', isRequired: false });
      await fetchObjectDetails();
      await fetchObjects();
    } catch (err) {
      setNewFieldError(err.response?.data?.message || err.message);
    } finally {
      setNewFieldLoading(false);
    }
  };

  const handleDeleteField = async (fieldId) => {
    if (!window.confirm('Are you sure you want to delete this field? Existing data for this field will be hidden.')) return;
    try {
      await deleteCustomField(selectedObjectId, fieldId);
      await fetchObjectDetails();
      await fetchObjects();
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    if (!newRecordName.trim()) return;
    setNewRecordLoading(true);
    setNewRecordError(null);
    try {
      await createCustomRecord(selectedObjectId, {
        recordName: newRecordName.trim(),
        customData: newRecordData,
      });

      setIsNewRecordOpen(false);
      setNewRecordName('');
      setNewRecordData({});
      await fetchRecords();
      await fetchObjects();
    } catch (err) {
      setNewRecordError(err.response?.data?.message || err.message);
    } finally {
      setNewRecordLoading(false);
    }
  };

  const fields = currentObject?.fields || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Custom Objects & Tables</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
              Spec §2 Core Differentiator
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            No-code database table builder. Create custom entities with dynamic fields, JSON datastores, and cross-object relationships.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsNewEntityOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-sky-100 transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            <span>New Custom Table</span>
          </button>
        </div>
      </div>

      {/* Entity Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        {objects.map((obj) => {
          const isSelected = obj.id === selectedObjectId;
          return (
            <button
              key={obj.id}
              onClick={() => setSelectedObjectId(obj.id)}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                isSelected
                  ? 'border-sky-600 text-sky-700 bg-sky-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Database className="w-3.5 h-3.5" style={{ color: obj.color || '#0ea5e9' }} />
              <span>{obj.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/70 text-slate-700 font-bold">
                {obj.record_count}
              </span>
            </button>
          );
        })}
      </div>

      {currentObject && (
        <div className="space-y-4">
          {/* Sub-view Switcher & Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded-xl shadow-2xs">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('data')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'data'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5 text-sky-600" />
                <span>Records Data ({records.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('schema')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'schema'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                <span>Schema Designer ({fields.length} Fields)</span>
              </button>
            </div>

            {activeTab === 'data' ? (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={`Search ${currentObject.name.toLowerCase()}...`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 w-56 bg-slate-50 focus:bg-white"
                  />
                </div>

                <button
                  onClick={() => setIsNewRecordOpen(true)}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add {currentObject.singular_name}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsNewFieldOpen(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Field</span>
              </button>
            )}
          </div>

          {/* TAB 1: DATA RECORDS DIRECTORY */}
          {activeTab === 'data' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                      <th className="py-3 px-4">Record Name</th>
                      {fields.map((f) => (
                        <th key={f.id} className="py-3 px-4">
                          {f.label}
                        </th>
                      ))}
                      <th className="py-3 px-4">Updated</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recordsLoading ? (
                      <tr>
                        <td colSpan={fields.length + 2} className="py-12 text-center text-slate-500">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto text-sky-600 mb-2" />
                          <span>Loading records...</span>
                        </td>
                      </tr>
                    ) : records.length === 0 ? (
                      <tr>
                        <td colSpan={fields.length + 2} className="py-12 text-center text-slate-400">
                          No records found. Click "Add {currentObject.singular_name}" to create the first one.
                        </td>
                      </tr>
                    ) : (
                      records.map((rec) => (
                        <tr
                          key={rec.id}
                          onClick={() => setActiveRecordId(rec.id)}
                          className="hover:bg-sky-50/30 transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-4 font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                            {rec.record_name}
                          </td>

                          {fields.map((f) => {
                            const val = rec.data?.[f.field_key];
                            return (
                              <td key={f.id} className="py-3 px-4 text-slate-600 font-medium">
                                {val === undefined || val === null || val === '' ? (
                                  <span className="text-slate-300 italic">—</span>
                                ) : f.field_type === 'currency' ? (
                                  <span className="font-semibold text-emerald-600">
                                    ${parseFloat(val).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                                  </span>
                                ) : f.field_type === 'number' ? (
                                  parseFloat(val).toLocaleString('en-US')
                                ) : f.field_type === 'select' ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                    {String(val)}
                                  </span>
                                ) : (
                                  String(val)
                                )}
                              </td>
                            );
                          })}

                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {new Date(rec.updated_at).toLocaleDateString()}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveRecordId(rec.id);
                              }}
                              className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors"
                              title="View Record & Timeline"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: SCHEMA DESIGNER */}
          {activeTab === 'schema' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Custom Entity Definition</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {currentObject.description || 'No description provided.'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Internal Database Slug</span>
                    <code className="text-xs text-indigo-600 font-mono bg-indigo-50 px-2 py-0.5 rounded">
                      {currentObject.slug}
                    </code>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Configured Attributes & Fields (Spec §2.3)
                  </h4>
                  <span className="text-xs text-slate-500">{fields.length} active columns</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {fields.map((f, i) => (
                    <div key={f.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{f.label}</span>
                            <code className="text-[10px] text-slate-400 font-mono">({f.field_key})</code>
                            {f.is_required ? (
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded">
                                Required
                              </span>
                            ) : null}
                          </div>
                          {f.options_json && (
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Options: {Array.isArray(f.options_json) ? f.options_json.join(', ') : JSON.stringify(f.options_json)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider bg-slate-100 text-slate-700">
                          {f.field_type}
                        </span>
                        <button
                          onClick={() => handleDeleteField(f.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete Field"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Record Detail Modal */}
      {activeRecordId && selectedObjectId && (
        <CustomRecordDetailModal
          objectId={selectedObjectId}
          recordId={activeRecordId}
          fields={fields}
          onClose={() => setActiveRecordId(null)}
          onUpdated={fetchRecords}
        />
      )}

      {/* Modal: New Custom Entity Table */}
      {isNewEntityOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-sky-600" />
                <h3 className="text-base font-bold text-slate-900">Define New Custom Entity</h3>
              </div>
              <button
                onClick={() => setIsNewEntityOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEntity} className="p-6 space-y-4">
              {newEntityError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{newEntityError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Entity Plural Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Subscriptions, Vehicles, Assets"
                  value={newEntityForm.name}
                  onChange={(e) => setNewEntityForm({ ...newEntityForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Singular Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Subscription, Vehicle, Asset"
                  value={newEntityForm.singularName}
                  onChange={(e) => setNewEntityForm({ ...newEntityForm, singularName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe what data this custom table holds..."
                  value={newEntityForm.description}
                  onChange={(e) => setNewEntityForm({ ...newEntityForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewEntityOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newEntityLoading}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                >
                  {newEntityLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Create Table</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Field Designer */}
      {isNewFieldOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Add Field to {currentObject.singular_name}</h3>
              </div>
              <button
                onClick={() => setIsNewFieldOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddField} className="p-6 space-y-4">
              {newFieldError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{newFieldError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Field Label *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Warranty Expiration, Engine Model"
                  value={newFieldForm.label}
                  onChange={(e) => setNewFieldForm({ ...newFieldForm, label: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Field Data Type *</label>
                <select
                  value={newFieldForm.fieldType}
                  onChange={(e) => setNewFieldForm({ ...newFieldForm, fieldType: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-indigo-600"
                >
                  <option value="text">Text (String)</option>
                  <option value="number">Number (Integer / Decimal)</option>
                  <option value="currency">Currency (USD)</option>
                  <option value="date">Date</option>
                  <option value="select">Dropdown Select (Single choice)</option>
                  <option value="boolean">Boolean (True / False)</option>
                </select>
              </div>

              {newFieldForm.fieldType === 'select' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Options (comma separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. Active, Pending, Expired"
                    value={newFieldForm.optionsText}
                    onChange={(e) => setNewFieldForm({ ...newFieldForm, optionsText: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isRequired"
                  checked={newFieldForm.isRequired}
                  onChange={(e) => setNewFieldForm({ ...newFieldForm, isRequired: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isRequired" className="text-xs text-slate-700">
                  Mark as required field
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewFieldOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newFieldLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                >
                  {newFieldLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Save Field</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Custom Record */}
      {isNewRecordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-sky-600" />
                <h3 className="text-base font-bold text-slate-900">Add New {currentObject.singular_name}</h3>
              </div>
              <button
                onClick={() => setIsNewRecordOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="p-6 space-y-4 overflow-y-auto flex-1">
              {newRecordError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{newRecordError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Record Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder={`e.g. Primary ${currentObject.singular_name} identifier`}
                  value={newRecordName}
                  onChange={(e) => setNewRecordName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                />
              </div>

              {/* Dynamic Field Inputs */}
              {fields.map((f) => (
                <div key={f.id}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {f.label} {f.is_required && <span className="text-rose-500">*</span>}
                  </label>

                  {f.field_type === 'select' && f.options_json ? (
                    <select
                      required={f.is_required}
                      value={newRecordData[f.field_key] || ''}
                      onChange={(e) =>
                        setNewRecordData({ ...newRecordData, [f.field_key]: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
                    >
                      <option value="">Select option...</option>
                      {(Array.isArray(f.options_json) ? f.options_json : []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : f.field_type === 'number' || f.field_type === 'currency' ? (
                    <input
                      type="number"
                      step={f.field_type === 'currency' ? '0.01' : '1'}
                      required={f.is_required}
                      value={newRecordData[f.field_key] || ''}
                      onChange={(e) =>
                        setNewRecordData({ ...newRecordData, [f.field_key]: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                    />
                  ) : f.field_type === 'date' ? (
                    <input
                      type="date"
                      required={f.is_required}
                      value={newRecordData[f.field_key] || ''}
                      onChange={(e) =>
                        setNewRecordData({ ...newRecordData, [f.field_key]: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                    />
                  ) : (
                    <input
                      type="text"
                      required={f.is_required}
                      value={newRecordData[f.field_key] || ''}
                      onChange={(e) =>
                        setNewRecordData({ ...newRecordData, [f.field_key]: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                    />
                  )}
                </div>
              ))}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewRecordOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newRecordLoading}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                >
                  {newRecordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Save Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
