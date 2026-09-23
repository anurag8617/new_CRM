import React, { useState, useEffect } from 'react';
import { 
  getPipelines, 
  getDeals, 
  createDeal, 
  updateDealStage,
  getCompanies, 
  getContacts 
} from '../services/api';
import DealDetailModal from './DealDetailModal';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  DollarSign, 
  TrendingUp, 
  Building2, 
  User, 
  Calendar, 
  ChevronRight, 
  ChevronLeft,
  Loader2, 
  X, 
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal
} from 'lucide-react';

export default function DealsView() {
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState(null);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeDealId, setActiveDealId] = useState(null);

  // Companies & Contacts for New Deal modal
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);

  // Create Deal Form state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    value: '',
    stageId: '',
    companyId: '',
    contactId: '',
    expectedCloseDate: '',
  });

  const fetchPipelines = async () => {
    try {
      const res = await getPipelines();
      if (res.success && res.data.length > 0) {
        setPipelines(res.data);
        if (!selectedPipelineId) {
          setSelectedPipelineId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load pipelines:', err);
    }
  };

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedPipelineId) params.pipelineId = selectedPipelineId;
      if (search) params.search = search;
      const res = await getDeals(params);
      if (res.success) {
        setDeals(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load deals:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [compRes, contRes] = await Promise.all([
        getCompanies({ limit: 100 }),
        getContacts({ limit: 100 }),
      ]);
      if (compRes.success) setCompanies(compRes.data.companies || []);
      if (contRes.success) setContacts(contRes.data.contacts || []);
    } catch (err) {
      console.error('Failed to load dropdown records:', err);
    }
  };

  useEffect(() => {
    fetchPipelines();
    fetchDropdownData();
  }, []);

  useEffect(() => {
    if (selectedPipelineId) {
      fetchDeals();
    }
  }, [selectedPipelineId, search]);

  const currentPipeline = pipelines.find((p) => p.id === selectedPipelineId) || pipelines[0];
  const stages = currentPipeline?.stages || [];

  // Group deals by stage
  const dealsByStage = {};
  stages.forEach((st) => {
    dealsByStage[st.id] = [];
  });
  deals.forEach((d) => {
    if (dealsByStage[d.stage_id]) {
      dealsByStage[d.stage_id].push(d);
    }
  });

  // Calculate Metrics
  const totalPipelineValue = deals.reduce((acc, d) => acc + parseFloat(d.value || 0), 0);
  const weightedPipelineValue = deals.reduce(
    (acc, d) => acc + parseFloat(d.value || 0) * ((d.stage_probability || 0) / 100),
    0
  );
  const openDealsCount = deals.filter((d) => d.status === 'open').length;

  const handleStageMove = async (dealId, currentStageId, direction, e) => {
    e.stopPropagation();
    const currentIndex = stages.findIndex((s) => s.id === currentStageId);
    const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const targetStage = stages[targetIndex];
    try {
      await updateDealStage(dealId, targetStage.id);
      await fetchDeals();
      await fetchPipelines(); // refresh stage aggregations
    } catch (err) {
      console.error('Failed to move stage:', err);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    setCreateLoading(true);
    setCreateError(null);
    try {
      await createDeal({
        title: formData.title.trim(),
        value: parseFloat(formData.value) || 0,
        pipelineId: selectedPipelineId,
        stageId: formData.stageId || (stages[0]?.id || null),
        companyId: formData.companyId || null,
        contactId: formData.contactId || null,
        expectedCloseDate: formData.expectedCloseDate || null,
      });

      setIsCreateOpen(false);
      setFormData({
        title: '',
        value: '',
        stageId: '',
        companyId: '',
        contactId: '',
        expectedCloseDate: '',
      });
      await fetchDeals();
      await fetchPipelines();
    } catch (err) {
      setCreateError(err.response?.data?.message || err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Deals & Pipelines</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Spec §9
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Visual sales pipeline with stage progression, weighted forecasting, and multi-tenant isolation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Pipeline Switcher */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-300 rounded-lg shadow-2xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedPipelineId || ''}
              onChange={(e) => setSelectedPipelineId(Number(e.target.value))}
              className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            >
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              fetchDeals();
              fetchPipelines();
            }}
            disabled={loading}
            className="p-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs transition-all disabled:opacity-50"
            title="Refresh Deals"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-indigo-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Deal</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Pipeline Value
            </span>
            <span className="text-2xl font-bold text-slate-900 mt-0.5 block">
              ${totalPipelineValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">{deals.length} active opportunities</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Weighted Forecast (§9)
            </span>
            <span className="text-2xl font-bold text-indigo-600 mt-0.5 block">
              ${weightedPipelineValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Sum of (Value × Stage Probability)</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Pipeline Stages
            </span>
            <span className="text-2xl font-bold text-slate-900 mt-0.5 block">
              {stages.length} Stages
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">{openDealsCount} Open · 0 Lost</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search deals by title, company, or contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-white"
          />
        </div>
      </div>

      {/* Interactive Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-[1100px] items-start">
          {stages.map((stage, idx) => {
            const stageDeals = dealsByStage[stage.id] || [];
            const stageSubtotal = stageDeals.reduce((sum, d) => sum + parseFloat(d.value || 0), 0);

            return (
              <div
                key={stage.id}
                className="w-72 bg-slate-100/70 border border-slate-200/80 rounded-2xl flex flex-col max-h-[calc(100vh-22rem)] shrink-0 overflow-hidden"
              >
                {/* Stage Header */}
                <div className="p-3.5 bg-white border-b border-slate-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: stage.color || '#6366f1' }}
                      ></span>
                      <h4 className="text-xs font-bold text-slate-800 truncate" title={stage.name}>
                        {stage.name}
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {stageDeals.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">
                      ${stageSubtotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-indigo-600 font-medium">{stage.probability}% prob.</span>
                  </div>
                </div>

                {/* Stage Deals Cards */}
                <div className="p-2 space-y-2.5 overflow-y-auto flex-1">
                  {stageDeals.length === 0 ? (
                    <div className="h-24 border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-xs text-slate-400">
                      No deals in stage
                    </div>
                  ) : (
                    stageDeals.map((deal) => (
                      <div
                        key={deal.id}
                        onClick={() => setActiveDealId(deal.id)}
                        className="p-3.5 bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md rounded-xl transition-all cursor-pointer group space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h5 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                            {deal.title}
                          </h5>
                        </div>

                        <div className="flex items-baseline justify-between">
                          <span className="text-sm font-extrabold text-emerald-600">
                            ${parseFloat(deal.value).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400">
                            {deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString() : 'No date'}
                          </span>
                        </div>

                        {/* Associated Entities */}
                        <div className="space-y-1 pt-1 border-t border-slate-100 text-[11px] text-slate-600">
                          {deal.company_name && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{deal.company_name}</span>
                            </div>
                          )}
                          {deal.contact_name && (
                            <div className="flex items-center gap-1.5 truncate">
                              <User className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{deal.contact_name}</span>
                            </div>
                          )}
                        </div>

                        {/* Quick Stage Move Buttons */}
                        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                          <button
                            disabled={idx === 0}
                            onClick={(e) => handleStageMove(deal.id, stage.id, 'prev', e)}
                            title="Move to previous stage"
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>

                          <span className="text-[10px] text-slate-400 font-medium">
                            Stage {idx + 1} of {stages.length}
                          </span>

                          <button
                            disabled={idx === stages.length - 1}
                            onClick={(e) => handleStageMove(deal.id, stage.id, 'next', e)}
                            title="Advance to next stage"
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Deal Detail & Timeline Modal */}
      {activeDealId && (
        <DealDetailModal
          dealId={activeDealId}
          stages={stages}
          onClose={() => setActiveDealId(null)}
          onUpdated={() => {
            fetchDeals();
            fetchPipelines();
          }}
        />
      )}

      {/* Create Deal Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Create New Opportunity</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deal Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Cloud License (100 seats)"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Value (USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 50000"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pipeline Stage</label>
                  <select
                    value={formData.stageId}
                    onChange={(e) => setFormData({ ...formData, stageId: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-indigo-600"
                  >
                    {stages.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.probability}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Associated Company</label>
                  <select
                    value={formData.companyId}
                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-indigo-600"
                  >
                    <option value="">No Company</option>
                    {companies.map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Associated Contact</label>
                  <select
                    value={formData.contactId}
                    onChange={(e) => setFormData({ ...formData, contactId: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-indigo-600"
                  >
                    <option value="">No Contact</option>
                    {contacts.map((cont) => (
                      <option key={cont.id} value={cont.id}>
                        {cont.first_name} {cont.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Close Date</label>
                <input
                  type="date"
                  value={formData.expectedCloseDate}
                  onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                >
                  {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Create Opportunity</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
