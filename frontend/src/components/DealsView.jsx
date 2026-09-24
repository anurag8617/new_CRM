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
  RefreshCw, 
  DollarSign, 
  TrendingUp, 
  Building2, 
  User, 
  Calendar, 
  ChevronRight, 
  ChevronLeft,
  X, 
  AlertCircle
} from 'lucide-react';
import { Button, Card, Badge, Modal, Input } from './ui';

/**
 * UI.md §7.3 Deals Kanban
 * - Columns: width 300px, bg transparent, header = stage name + count + total value (--text-tertiary), + add.
 * - Cards: bg --bg-surface-raised, radius --radius-md (12px), padding 12px, border --border-subtle
 * - Values formatted with tabular-nums
 * - Won = --success-soft tint, Lost = --danger-soft tint
 */
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

  const activePipeline = pipelines.find((p) => p.id === selectedPipelineId) || pipelines[0];
  const stages = activePipeline?.stages || [];

  const handleStageMove = async (dealId, currentStageId, direction, e) => {
    e.stopPropagation();
    const currentIdx = stages.findIndex((s) => s.id === currentStageId);
    const nextIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1;
    if (nextIdx < 0 || nextIdx >= stages.length) return;

    const targetStage = stages[nextIdx];

    // Optimistic UI update (§9.4)
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage_id: targetStage.id } : d))
    );

    try {
      await updateDealStage(dealId, targetStage.id);
    } catch (err) {
      console.error('Failed to update stage:', err);
      fetchDeals(); // Rollback
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);

    try {
      if (!formData.title || !formData.value) {
        throw new Error('Title and value are required');
      }

      const payload = {
        title: formData.title,
        value: parseFloat(formData.value),
        pipeline_id: selectedPipelineId,
        stage_id: formData.stageId ? Number(formData.stageId) : stages[0]?.id,
        company_id: formData.companyId ? Number(formData.companyId) : null,
        contact_id: formData.contactId ? Number(formData.contactId) : null,
        expected_close_date: formData.expectedCloseDate || null,
      };

      const res = await createDeal(payload);
      if (res.success) {
        setIsCreateOpen(false);
        setFormData({
          title: '',
          value: '',
          stageId: '',
          companyId: '',
          contactId: '',
          expectedCloseDate: '',
        });
        fetchDeals();
      } else {
        throw new Error(res.message || 'Failed to create deal');
      }
    } catch (err) {
      setCreateError(err.message || 'Error creating deal');
    } finally {
      setCreateLoading(false);
    }
  };

  // Group deals by stage
  const dealsByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = deals.filter((d) => d.stage_id === stage.id);
    return acc;
  }, {});

  // Pipeline metrics
  const totalPipelineValue = deals.reduce((sum, d) => sum + parseFloat(d.value || 0), 0);
  const weightedPipelineValue = stages.reduce((total, stage) => {
    const stageSum = (dealsByStage[stage.id] || []).reduce(
      (sum, d) => sum + parseFloat(d.value || 0),
      0
    );
    return total + (stageSum * (stage.probability || 0)) / 100;
  }, 0);

  return (
    <div className="space-y-5">
      {/* Top Header & Pipeline Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Deals & Pipelines</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Visual opportunity stages, deal health, and weighted pipeline forecasting.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)]">
            <span className="text-[11px] text-[var(--text-tertiary)]">Pipeline:</span>
            <select
              value={selectedPipelineId || ''}
              onChange={(e) => setSelectedPipelineId(Number(e.target.value))}
              className="text-xs font-medium text-[var(--text-primary)] bg-transparent focus:outline-none cursor-pointer"
            >
              {pipelines.map((p) => (
                <option key={p.id} value={p.id} className="bg-[var(--bg-modal)] text-[var(--text-primary)]">
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
            className="p-2 text-[var(--text-secondary)] bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
            title="Refresh Deals"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Button
            variant="primary"
            onClick={() => setIsCreateOpen(true)}
            icon={Plus}
          >
            New Deal
          </Button>
        </div>
      </div>

      {/* KPI Metrics Ribbon (§7.4) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[var(--text-secondary)] block">
              Total Pipeline Value
            </span>
            <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums mt-1 block">
              ${totalPipelineValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)] mt-0.5 block">{deals.length} active deals</span>
          </div>
          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--bg-surface-sunken)] border border-[var(--border-subtle)] text-[var(--accent)] flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[var(--text-secondary)] block">
              Weighted Forecast
            </span>
            <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums mt-1 block">
              ${weightedPipelineValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)] mt-0.5 block">Sum of (Value × Probability)</span>
          </div>
          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--bg-surface-sunken)] border border-[var(--border-subtle)] text-[var(--info)] flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[var(--text-secondary)] block">
              Pipeline Stages
            </span>
            <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums mt-1 block">
              {stages.length} Stages
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)] mt-0.5 block">{deals.length} active opportunities</span>
          </div>
          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--bg-surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-secondary)] flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
          <input
            type="text"
            placeholder="Search deals by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs border border-[var(--border-default)] rounded-[var(--radius-md)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
          />
        </div>
      </div>

      {/* Kanban Board (§7.3) */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-[1000px] items-start">
          {stages.map((stage, idx) => {
            const stageDeals = dealsByStage[stage.id] || [];
            const stageSubtotal = stageDeals.reduce((sum, d) => sum + parseFloat(d.value || 0), 0);
            const isWon = stage.name.toLowerCase().includes('won');
            const isLost = stage.name.toLowerCase().includes('lost');

            return (
              <div
                key={stage.id}
                className="w-[300px] bg-transparent flex flex-col shrink-0 overflow-hidden"
              >
                {/* Stage Header (§7.3) */}
                <div className={`p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] mb-2.5 transition-colors ${
                  isWon ? 'bg-[var(--success-soft)] border-[var(--success)]/20' :
                  isLost ? 'bg-[var(--danger-soft)] border-[var(--danger)]/20' :
                  'bg-[var(--bg-surface-raised)]'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: stage.color || 'var(--accent)' }}
                      />
                      <h4 className="text-xs font-semibold text-[var(--text-primary)] truncate" title={stage.name}>
                        {stage.name}
                      </h4>
                    </div>
                    <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-full bg-[var(--bg-active)] text-[var(--text-secondary)]">
                      {stageDeals.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)]">
                    <span className="tabular-nums font-medium text-[var(--text-secondary)]">
                      ${stageSubtotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                    <span className="tabular-nums">{stage.probability}% prob.</span>
                  </div>
                </div>

                {/* Stage Deals Cards List */}
                <div className="space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
                  {stageDeals.length === 0 ? (
                    <div className="h-20 border border-dashed border-[var(--border-subtle)] rounded-[var(--radius-md)] flex items-center justify-center text-xs text-[var(--text-tertiary)]">
                      No deals
                    </div>
                  ) : (
                    stageDeals.map((deal) => (
                      <div
                        key={deal.id}
                        onClick={() => setActiveDealId(deal.id)}
                        className="p-3 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] rounded-[var(--radius-md)] transition-all cursor-pointer group space-y-2 select-none"
                      >
                        <h5 className="text-xs font-medium text-[var(--text-primary)] group-hover:text-[var(--text-link)] transition-colors line-clamp-2">
                          {deal.title}
                        </h5>

                        <div className="flex items-baseline justify-between">
                          <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                            ${parseFloat(deal.value).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                          </span>
                          <span className="text-[10px] text-[var(--text-tertiary)]">
                            {deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString() : 'No date'}
                          </span>
                        </div>

                        {/* Associated Entities */}
                        <div className="space-y-0.5 pt-1 text-[11px] text-[var(--text-secondary)]">
                          {deal.company_name && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Building2 className="w-3 h-3 text-[var(--text-tertiary)] shrink-0" />
                              <span className="truncate">{deal.company_name}</span>
                            </div>
                          )}
                          {deal.contact_name && (
                            <div className="flex items-center gap-1.5 truncate">
                              <User className="w-3 h-3 text-[var(--text-tertiary)] shrink-0" />
                              <span className="truncate">{deal.contact_name}</span>
                            </div>
                          )}
                        </div>

                        {/* Quick Stage Move Buttons */}
                        <div className="pt-2 flex items-center justify-between border-t border-[var(--border-subtle)]">
                          <button
                            disabled={idx === 0}
                            onClick={(e) => handleStageMove(deal.id, stage.id, 'prev', e)}
                            title="Move to previous stage"
                            className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded disabled:opacity-20 transition-colors"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>

                          <span className="text-[10px] text-[var(--text-tertiary)]">
                            Stage {idx + 1}/{stages.length}
                          </span>

                          <button
                            disabled={idx === stages.length - 1}
                            onClick={(e) => handleStageMove(deal.id, stage.id, 'next', e)}
                            title="Advance to next stage"
                            className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded disabled:opacity-20 transition-colors"
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

      {/* Deal Detail Modal */}
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
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Create New Opportunity"
          description="Add a new deal into your active sales pipeline."
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {createError && (
              <div className="p-3 bg-[var(--danger-soft)] border border-[var(--danger)]/30 rounded-[var(--radius-sm)] text-xs text-[var(--danger)] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Deal Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Enterprise Cloud License"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-focus)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Value ($) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="50000"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-focus)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Pipeline Stage</label>
              <select
                value={formData.stageId}
                onChange={(e) => setFormData({ ...formData, stageId: e.target.value })}
                className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.probability}%)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Associated Company</label>
              <select
                value={formData.companyId}
                onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
              >
                <option value="">No Company</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Primary Contact</label>
              <select
                value={formData.contactId}
                onChange={(e) => setFormData({ ...formData, contactId: e.target.value })}
                className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
              >
                <option value="">No Contact</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Expected Close Date</label>
              <input
                type="date"
                value={formData.expectedCloseDate}
                onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                loading={createLoading}
              >
                Save Deal
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
