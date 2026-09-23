import React, { useState, useEffect } from 'react';
import {
  getWorkflows,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  getWorkflowExecutions,
  testRunWorkflow,
  getDeals,
  getContacts,
  getCustomObjects,
  getCustomRecords,
} from '../services/api';
import {
  Zap,
  Bot,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Plus,
  Trash2,
  RefreshCw,
  Layers,
  ArrowRight,
  Filter,
  FileText,
  Loader2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  History,
  X,
} from 'lucide-react';

export default function WorkflowsView() {
  const [workflows, setWorkflows] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [activeTab, setActiveTab] = useState('workflows'); // 'workflows' | 'executions'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterObject, setFilterObject] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [testModalWf, setTestModalWf] = useState(null);
  const [testRecords, setTestRecords] = useState([]);
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [testingRunning, setTestingRunning] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // New Workflow Form State
  const [newWf, setNewWf] = useState({
    name: '',
    description: '',
    objectType: 'deal',
    triggerType: 'stage_changed',
    status: 'published',
    conditions: [
      { field: 'value', operator: 'greater_than', value: '50000', logic: 'AND' },
    ],
    actions: [
      { actionType: 'create_note', config: { note: '⚡ [Automated Alert] Workflow executed for {{title}}.' } },
    ],
  });
  const [savingWf, setSavingWf] = useState(false);

  // Expanded executions in history tab
  const [expandedExecId, setExpandedExecId] = useState(null);

  const fetchData = async () => {
    try {
      const [wfRes, execRes] = await Promise.all([
        getWorkflows(),
        getWorkflowExecutions(null, 40),
      ]);
      if (wfRes.success) setWorkflows(wfRes.data);
      if (execRes.success) setExecutions(execRes.data);
    } catch (err) {
      console.error('Failed to load workflows data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleToggleStatus = async (wf) => {
    const nextStatus = wf.status === 'published' ? 'paused' : 'published';
    try {
      await updateWorkflow(wf.id, { status: nextStatus });
      setWorkflows((prev) =>
        prev.map((w) => (w.id === wf.id ? { ...w, status: nextStatus } : w))
      );
    } catch (err) {
      alert('Failed to update workflow status: ' + err.message);
    }
  };

  const handleDelete = async (wf) => {
    if (!window.confirm(`Delete workflow "${wf.name}"?`)) return;
    try {
      await deleteWorkflow(wf.id);
      setWorkflows((prev) => prev.filter((w) => w.id !== wf.id));
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  // Open Test Modal
  const openTestModal = async (wf) => {
    setTestModalWf(wf);
    setTestResult(null);
    setSelectedRecordId('');
    setTestRecords([]);

    try {
      if (wf.object_type === 'deal') {
        const res = await getDeals({ limit: 10 });
        if (res.success) setTestRecords(res.data.deals || []);
      } else if (wf.object_type === 'contact') {
        const res = await getContacts({ limit: 10 });
        if (res.success) setTestRecords(res.data.contacts || []);
      } else if (wf.object_type === 'custom_record') {
        const objs = await getCustomObjects();
        if (objs.success && objs.data.length > 0) {
          const recs = await getCustomRecords(objs.data[0].id);
          if (recs.success) setTestRecords(recs.data || []);
        }
      }
    } catch (e) {
      console.error('Error fetching sample test records:', e);
    }
  };

  const handleRunTest = async () => {
    if (!selectedRecordId) return;
    setTestingRunning(true);
    setTestResult(null);
    try {
      const res = await testRunWorkflow(testModalWf.id, selectedRecordId);
      if (res.success) {
        setTestResult(res.data);
        fetchData(); // refresh execution history
      }
    } catch (err) {
      setTestResult({ status: 'failed', error: err.response?.data?.message || err.message });
    } finally {
      setTestingRunning(false);
    }
  };

  // Create Workflow handlers
  const handleAddCondition = () => {
    setNewWf((prev) => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        { field: 'value', operator: 'greater_than', value: '10000', logic: 'AND' },
      ],
    }));
  };

  const handleRemoveCondition = (index) => {
    setNewWf((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index),
    }));
  };

  const handleAddAction = () => {
    setNewWf((prev) => ({
      ...prev,
      actions: [
        ...prev.actions,
        { actionType: 'create_note', config: { note: '⚡ Automated notice: {{title}} updated.' } },
      ],
    }));
  };

  const handleRemoveAction = (index) => {
    setNewWf((prev) => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index),
    }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newWf.name.trim()) return;
    setSavingWf(true);
    try {
      const res = await createWorkflow(newWf);
      if (res.success) {
        setShowCreateModal(false);
        setNewWf({
          name: '',
          description: '',
          objectType: 'deal',
          triggerType: 'stage_changed',
          status: 'published',
          conditions: [
            { field: 'value', operator: 'greater_than', value: '50000', logic: 'AND' },
          ],
          actions: [
            { actionType: 'create_note', config: { note: '⚡ [Automated Alert] Opportunity prioritized.' } },
          ],
        });
        fetchData();
      }
    } catch (err) {
      alert('Failed to create workflow: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingWf(false);
    }
  };

  const filteredWorkflows = workflows.filter((w) => {
    if (filterObject === 'all') return true;
    return w.object_type === filterObject;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-600 fill-amber-500" />
              <span>Spec §15 Automation Core</span>
            </span>
            <span className="text-xs text-slate-400">Event-Driven Architecture</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
            Workflow Automation Engine
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Autonomous multi-step triggers, visual rule evaluation, and automated activity logging across Deals, Contacts, and Custom Entities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-xs"
            title="Refresh Automations"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-sm hover:shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Automation</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs & Object Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('workflows')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'workflows'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Active Workflows</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {workflows.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('executions')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'executions'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Execution Audit Logs</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {executions.length}
            </span>
          </button>
        </div>

        {activeTab === 'workflows' && (
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            {['all', 'deal', 'contact', 'custom_record'].map((obj) => (
              <button
                key={obj}
                onClick={() => setFilterObject(obj)}
                className={`px-3 py-1 text-[11px] font-semibold rounded-lg capitalize transition-colors ${
                  filterObject === obj
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {obj === 'all' ? 'All Objects' : obj.replace('_', ' ')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TAB 1: WORKFLOWS LIST */}
      {activeTab === 'workflows' && (
        <div>
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
              <span className="text-sm">Loading automations engine...</span>
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No workflows found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Create your first automated workflow to trigger actions when deals move or contacts sign up.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-semibold hover:bg-amber-700"
              >
                Create Workflow
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredWorkflows.map((wf) => (
                <div
                  key={wf.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:border-amber-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Object & Status */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                          {wf.object_type.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          ID #{wf.id}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            wf.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {wf.status}
                        </span>
                        <button
                          onClick={() => handleToggleStatus(wf)}
                          title={`Toggle ${wf.status === 'published' ? 'Pause' : 'Activate'}`}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          {wf.status === 'published' ? (
                            <ToggleRight className="w-6 h-6 text-emerald-600 cursor-pointer" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-slate-400 cursor-pointer" />
                          )}
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                      {wf.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {wf.description || 'No description configured.'}
                    </p>

                    {/* Trigger & Rules Badges */}
                    <div className="mt-4 p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">Trigger Event:</span>
                        <span className="font-semibold text-slate-800 capitalize bg-white px-2 py-0.5 rounded border border-slate-200">
                          {wf.trigger_type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">Rule Conditions:</span>
                        <span className="font-semibold text-amber-700">
                          {wf.conditions_count || 1} rule(s) configured
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">Actions Chain:</span>
                        <span className="font-semibold text-indigo-700">
                          {wf.actions_count || 1} step(s) automated
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      {wf.executions_count > 0
                        ? `${wf.executions_count} execution(s)`
                        : 'No executions yet'}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openTestModal(wf)}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-lg border border-amber-200 flex items-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <Play className="w-3 h-3 text-amber-600 fill-amber-600" />
                        <span>Test Run</span>
                      </button>
                      <button
                        onClick={() => handleDelete(wf)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Workflow"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EXECUTION AUDIT LOGS (§15 requirement) */}
      {activeTab === 'executions' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Execution History & Step Analytics
              </h3>
            </div>
            <span className="text-xs text-slate-500">
              Showing last {executions.length} executions
            </span>
          </div>

          {executions.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs">No execution history logged yet.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Use the "Test Run" button on any workflow card to test-fire an automation.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {executions.map((exec) => {
                const isExpanded = expandedExecId === exec.id;
                return (
                  <div key={exec.id} className="hover:bg-slate-50/50 transition-colors">
                    <div
                      onClick={() => setExpandedExecId(isExpanded ? null : exec.id)}
                      className="p-4 flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <button className="text-slate-400">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">
                              {exec.workflow_name || `Workflow #${exec.workflow_id}`}
                            </span>
                            <span className="text-[10px] px-2 py-0.2 rounded bg-slate-100 text-slate-600 uppercase font-semibold">
                              {exec.record_type} #{exec.record_id}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Trigger: {exec.trigger_event} · {new Date(exec.started_at).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                            exec.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : exec.status === 'skipped'
                              ? 'bg-slate-100 text-slate-600 border border-slate-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {exec.status === 'completed' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : exec.status === 'skipped' ? (
                            <AlertCircle className="w-3 h-3 text-slate-400" />
                          ) : (
                            <XCircle className="w-3 h-3 text-rose-600" />
                          )}
                          <span>{exec.status}</span>
                        </span>
                      </div>
                    </div>

                    {/* Step Drilldown */}
                    {isExpanded && (
                      <div className="px-10 pb-4 pt-1 bg-slate-50/70 border-t border-slate-100">
                        {exec.error_message && (
                          <div className="mb-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                            <span className="font-bold">Execution Note:</span> {exec.error_message}
                          </div>
                        )}

                        <div className="space-y-2">
                          {(exec.steps || []).length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic">
                              No steps executed (conditions evaluated false).
                            </p>
                          ) : (
                            exec.steps.map((st, i) => (
                              <div
                                key={st.id || i}
                                className="p-3 bg-white border border-slate-200 rounded-xl flex items-start justify-between text-xs shadow-2xs"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800 capitalize">
                                      Step {i + 1}: {st.action_type.replace('_', ' ')}
                                    </span>
                                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded">
                                      {st.status}
                                    </span>
                                  </div>
                                  {st.output && (
                                    <p className="text-[11px] text-slate-600 font-mono bg-slate-50 p-1.5 rounded border border-slate-100">
                                      {st.output.content || st.output.message || JSON.stringify(st.output)}
                                    </p>
                                  )}
                                  {st.error_message && (
                                    <p className="text-[11px] text-rose-600 font-medium">
                                      Error: {st.error_message}
                                    </p>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {st.duration_ms}ms
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: CREATE WORKFLOW */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                  <Zap className="w-5 h-5 fill-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Create Automation Workflow
                  </h3>
                  <span className="text-xs text-slate-500">Spec §15 Automation Engine</span>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Name & Object */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Workflow Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Enterprise Opportunity Deal Desk Alert"
                  value={newWf.name}
                  onChange={(e) => setNewWf({ ...newWf, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Description
                </label>
                <textarea
                  rows="2"
                  placeholder="Purpose of this automation..."
                  value={newWf.description}
                  onChange={(e) => setNewWf({ ...newWf, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Target Object *
                  </label>
                  <select
                    value={newWf.objectType}
                    onChange={(e) => setNewWf({ ...newWf, objectType: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-amber-600"
                  >
                    <option value="deal">Deals / Opportunities</option>
                    <option value="contact">Contacts</option>
                    <option value="company">Companies</option>
                    <option value="custom_record">Custom Objects</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Trigger Event *
                  </label>
                  <select
                    value={newWf.triggerType}
                    onChange={(e) => setNewWf({ ...newWf, triggerType: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-amber-600"
                  >
                    <option value="record_created">Record Created</option>
                    <option value="stage_changed">Stage Changed</option>
                    <option value="record_updated">Field Updated</option>
                  </select>
                </div>
              </div>

              {/* Conditions Section */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-amber-600" />
                    <span>Rule Conditions</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAddCondition}
                    className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Rule</span>
                  </button>
                </div>

                {newWf.conditions.map((cond, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <input
                      type="text"
                      placeholder="Field (e.g. value)"
                      value={cond.field}
                      onChange={(e) => {
                        const copy = [...newWf.conditions];
                        copy[idx].field = e.target.value;
                        setNewWf({ ...newWf, conditions: copy });
                      }}
                      className="w-1/3 px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                    <select
                      value={cond.operator}
                      onChange={(e) => {
                        const copy = [...newWf.conditions];
                        copy[idx].operator = e.target.value;
                        setNewWf({ ...newWf, conditions: copy });
                      }}
                      className="w-1/3 px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="greater_than">&gt; Greater Than</option>
                      <option value="less_than">&lt; Less Than</option>
                      <option value="equals">== Equals</option>
                      <option value="not_equals">!= Not Equals</option>
                      <option value="contains">Contains</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Value (e.g. 50000)"
                      value={cond.value}
                      onChange={(e) => {
                        const copy = [...newWf.conditions];
                        copy[idx].value = e.target.value;
                        setNewWf({ ...newWf, conditions: copy });
                      }}
                      className="w-1/3 px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                    {newWf.conditions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCondition(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Actions Chain Section */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Automated Action Chain</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAddAction}
                    className="text-xs font-semibold text-indigo-700 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Action</span>
                  </button>
                </div>

                {newWf.actions.map((act, idx) => (
                  <div key={idx} className="space-y-2 p-3 bg-white border border-slate-200 rounded-lg">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">Action #{idx + 1}</span>
                      {newWf.actions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAction(idx)}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <select
                      value={act.actionType}
                      onChange={(e) => {
                        const copy = [...newWf.actions];
                        copy[idx].actionType = e.target.value;
                        setNewWf({ ...newWf, actions: copy });
                      }}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="create_note">Post Note on Timeline (§10)</option>
                      <option value="send_notification">Log System Notification</option>
                      <option value="webhook">Call Webhook Endpoint</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Note Template (e.g. ⚡ Opportunity {{title}} reached $50k)"
                      value={act.config?.note || act.config?.content || ''}
                      onChange={(e) => {
                        const copy = [...newWf.actions];
                        copy[idx].config = { ...copy[idx].config, note: e.target.value };
                        setNewWf({ ...newWf, actions: copy });
                      }}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono bg-white"
                    />
                  </div>
                ))}
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingWf}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingWf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Save & Publish</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TEST RUN WORKFLOW */}
      {testModalWf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-amber-600 fill-amber-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Test Workflow Execution
                  </h3>
                  <span className="text-xs text-slate-500">{testModalWf.name}</span>
                </div>
              </div>
              <button
                onClick={() => setTestModalWf(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Select Target {testModalWf.object_type.replace('_', ' ')} Record:
                </label>
                <select
                  value={selectedRecordId}
                  onChange={(e) => setSelectedRecordId(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-amber-600"
                >
                  <option value="">-- Choose a record to test on --</option>
                  {testRecords.map((r) => (
                    <option key={r.id} value={r.id}>
                      #{r.id} — {r.title || r.first_name ? `${r.first_name} ${r.last_name}` : r.record_name || r.name}
                      {r.value ? ` ($${Number(r.value).toLocaleString()})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleRunTest}
                disabled={!selectedRecordId || testingRunning}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {testingRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Executing Engine Rules...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Execute Workflow Now</span>
                  </>
                )}
              </button>

              {/* Result Display */}
              {testResult && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-2 animate-in fade-in duration-200 ${
                    testResult.status === 'completed'
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : testResult.status === 'skipped'
                      ? 'bg-slate-100 border-slate-200 text-slate-800'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {testResult.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : testResult.status === 'skipped' ? (
                      <AlertCircle className="w-5 h-5 text-slate-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600" />
                    )}
                    <span className="capitalize">Execution {testResult.status}!</span>
                  </div>

                  {testResult.status === 'completed' && (
                    <p className="text-xs text-emerald-800">
                      ✅ All conditions met! Automated actions executed and logged to timeline.
                    </p>
                  )}
                  {testResult.status === 'skipped' && (
                    <p className="text-xs text-slate-600">
                      ℹ️ Conditions were not met for this record. Workflow skipped action execution.
                    </p>
                  )}
                  {testResult.error && (
                    <p className="text-xs text-rose-700 font-medium">
                      Error: {testResult.error}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
