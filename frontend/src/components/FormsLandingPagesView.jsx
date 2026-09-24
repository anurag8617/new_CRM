import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  getForms,
  getFormById,
  createForm,
  updateForm,
  deleteForm,
  submitPublicForm,
  getFormSubmissions,
  getRoutingRules,
  createRoutingRule,
  updateRoutingRule,
  deleteRoutingRule,
  simulateLeadRouting,
  getLandingPages,
  createLandingPage,
  updateLandingPage,
  deleteLandingPage,
} from '../services/api';
import {
  FileText as DocumentTextIcon,
  Plus as PlusIcon,
  Trash2 as TrashIcon,
  Edit3 as PencilSquareIcon,
  Eye as EyeIcon,
  RefreshCw as ArrowPathIcon,
  CheckCircle2 as CheckCircleIcon,
  XCircle as XCircleIcon,
  Code as CodeBracketIcon,
  Filter as FunnelIcon,
  Users as UserGroupIcon,
  Sparkles as SparklesIcon,
  Zap as BoltIcon,
  Globe as GlobeAltIcon,
  Building2 as BuildingOfficeIcon,
  DollarSign as CurrencyDollarIcon,
  ClipboardCheck as ClipboardDocumentCheckIcon,
  Inbox as InboxStackIcon,
  Share2 as ShareIcon,
  ExternalLink as ArrowTopRightOnSquareIcon,
} from 'lucide-react';

export default function FormsLandingPagesView() {
  const { isDark } = useTheme();

  // Navigation tabs
  const [activeTab, setActiveTab] = useState('forms'); // 'forms' | 'submissions' | 'routing' | 'landingPages'
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Data states
  const [formsList, setFormsList] = useState([]);
  const [submissionsList, setSubmissionsList] = useState([]);
  const [routingRules, setRoutingRules] = useState([]);
  const [landingPages, setLandingPages] = useState([]);

  // Modals & Panels
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingForm, setEditingForm] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewForm, setPreviewForm] = useState(null);
  const [previewFormData, setPreviewFormData] = useState({});
  const [previewSubmitting, setPreviewSubmitting] = useState(false);
  const [previewSuccess, setPreviewSuccess] = useState(null);

  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [embedForm, setEmbedForm] = useState(null);

  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  // Lead Routing Simulator state
  const [simPayload, setSimPayload] = useState({
    country: 'USA',
    deal_value: 65000,
    company_name: 'Apex Orbital Systems',
  });
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  // Landing Page Modals
  const [showPageModal, setShowPageModal] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [showPagePreviewModal, setShowPagePreviewModal] = useState(false);
  const [previewLandingPage, setPreviewLandingPage] = useState(null);

  // Form Builder dynamic state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    submit_button_text: 'Submit Inquiry',
    success_message: 'Thank you! A senior specialist will follow up shortly.',
    redirect_url: '',
    create_deal_on_submit: true,
    default_deal_value: 20000,
    fields: [
      { label: 'First Name', name: 'first_name', field_type: 'text', placeholder: 'Jane', is_required: 1, map_to_entity: 'contact', map_to_field: 'first_name' },
      { label: 'Last Name', name: 'last_name', field_type: 'text', placeholder: 'Doe', is_required: 1, map_to_entity: 'contact', map_to_field: 'last_name' },
      { label: 'Work Email', name: 'email', field_type: 'email', placeholder: 'jane@company.com', is_required: 1, map_to_entity: 'contact', map_to_field: 'email' },
      { label: 'Company Name', name: 'company_name', field_type: 'text', placeholder: 'Acme Corp', is_required: 1, map_to_entity: 'company', map_to_field: 'name' },
    ],
  });

  // Rule Builder state
  const [ruleData, setRuleData] = useState({
    name: '',
    description: '',
    routing_type: 'round_robin',
    priority: 10,
    conditions: [],
    assignee_user_ids: [1],
    is_active: true,
  });

  // Landing Page state
  const [pageData, setPageData] = useState({
    title: '',
    slug: '',
    headline: '',
    subheadline: '',
    hero_cta_text: 'Schedule Demonstration',
    body_content: '### Enterprise Performance\nAccelerate your entire pipeline with native CPQ, omnichannel ticketing, and webhook integrations.',
    form_id: '',
    status: 'published',
  });

  // Load initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [formsRes, subsRes, rulesRes, pagesRes] = await Promise.all([
        getForms().catch(() => ({ data: [] })),
        getFormSubmissions({ limit: 50 }).catch(() => ({ data: [] })),
        getRoutingRules().catch(() => ({ data: [] })),
        getLandingPages().catch(() => ({ data: [] })),
      ]);

      setFormsList(formsRes.data || []);
      setSubmissionsList(subsRes.data || []);
      setRoutingRules(rulesRes.data || []);
      setLandingPages(pagesRes.data || []);
    } catch (err) {
      console.error('Error loading Step 15 data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (msg, type = 'success') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  // ---------------------------------------------------------------------------
  // FORM HANDLERS
  // ---------------------------------------------------------------------------
  const handleOpenCreateForm = () => {
    setEditingForm(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      submit_button_text: 'Submit Inquiry',
      success_message: 'Thank you! A senior specialist will follow up shortly.',
      redirect_url: '',
      create_deal_on_submit: true,
      default_deal_value: 20000,
      fields: [
        { label: 'First Name', name: 'first_name', field_type: 'text', placeholder: 'Jane', is_required: 1, map_to_entity: 'contact', map_to_field: 'first_name' },
        { label: 'Last Name', name: 'last_name', field_type: 'text', placeholder: 'Doe', is_required: 1, map_to_entity: 'contact', map_to_field: 'last_name' },
        { label: 'Work Email', name: 'email', field_type: 'email', placeholder: 'jane@company.com', is_required: 1, map_to_entity: 'contact', map_to_field: 'email' },
        { label: 'Company Name', name: 'company_name', field_type: 'text', placeholder: 'Acme Corp', is_required: 1, map_to_entity: 'company', map_to_field: 'name' },
      ],
    });
    setShowFormModal(true);
  };

  const handleEditForm = async (f) => {
    try {
      const detailed = await getFormById(f.id);
      const target = detailed.data || f;
      setEditingForm(target);
      setFormData({
        name: target.name || '',
        slug: target.slug || '',
        description: target.description || '',
        submit_button_text: target.submit_button_text || 'Submit',
        success_message: target.success_message || '',
        redirect_url: target.redirect_url || '',
        create_deal_on_submit: Boolean(target.create_deal_on_submit),
        default_deal_value: target.default_deal_value || 15000,
        fields: target.fields || [],
      });
      setShowFormModal(true);
    } catch {
      showToast('Could not load form details', 'error');
    }
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    try {
      if (editingForm) {
        await updateForm(editingForm.id, formData);
        showToast('Form updated successfully');
      } else {
        await createForm(formData);
        showToast('Form created successfully');
      }
      setShowFormModal(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save form', 'error');
    }
  };

  const handleDeleteForm = async (id) => {
    if (!window.confirm('Delete this lead capture form? This will remove associated field rules.')) return;
    try {
      await deleteForm(id);
      showToast('Form deleted');
      fetchData();
    } catch (err) {
      showToast('Failed to delete form', 'error');
    }
  };

  const handleAddField = () => {
    const idx = formData.fields.length + 1;
    setFormData({
      ...formData,
      fields: [
        ...formData.fields,
        {
          label: `Custom Field ${idx}`,
          name: `custom_field_${idx}`,
          field_type: 'text',
          placeholder: '',
          is_required: 0,
          map_to_entity: 'contact',
          map_to_field: 'custom_field',
        },
      ],
    });
  };

  const handleRemoveField = (index) => {
    const updated = [...formData.fields];
    updated.splice(index, 1);
    setFormData({ ...formData, fields: updated });
  };

  const handleFieldChange = (index, key, val) => {
    const updated = [...formData.fields];
    updated[index] = { ...updated[index], [key]: val };
    setFormData({ ...formData, fields: updated });
  };

  // ---------------------------------------------------------------------------
  // INTERACTIVE TEST PREVIEW & LIVE SUBMISSION SIMULATOR
  // ---------------------------------------------------------------------------
  const handleOpenPreview = async (form) => {
    try {
      const detailed = await getFormById(form.id);
      const f = detailed.data || form;
      setPreviewForm(f);
      const initial = {};
      (f.fields || []).forEach((field) => {
        initial[field.name] = field.default_value || '';
      });
      setPreviewFormData(initial);
      setPreviewSuccess(null);
      setShowPreviewModal(true);
    } catch {
      showToast('Failed to load form preview', 'error');
    }
  };

  const handlePreviewSubmit = async (e) => {
    e.preventDefault();
    setPreviewSubmitting(true);
    try {
      const res = await submitPublicForm(previewForm.slug, previewFormData);
      setPreviewSuccess(res);
      showToast('Test Lead Captured & Routed Successfully!');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Submission failed', 'error');
    } finally {
      setPreviewSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // ROUTING RULES HANDLERS
  // ---------------------------------------------------------------------------
  const handleOpenCreateRule = () => {
    setEditingRule(null);
    setRuleData({
      name: '',
      description: '',
      routing_type: 'round_robin',
      priority: 10,
      conditions: [],
      assignee_user_ids: [1],
      is_active: true,
    });
    setShowRuleModal(true);
  };

  const handleSaveRule = async (e) => {
    e.preventDefault();
    try {
      if (editingRule) {
        await updateRoutingRule(editingRule.id, ruleData);
        showToast('Routing rule updated');
      } else {
        await createRoutingRule(ruleData);
        showToast('Routing rule created');
      }
      setShowRuleModal(false);
      fetchData();
    } catch (err) {
      showToast('Failed to save routing rule', 'error');
    }
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm('Delete this lead routing rule?')) return;
    try {
      await deleteRoutingRule(id);
      showToast('Routing rule deleted');
      fetchData();
    } catch {
      showToast('Failed to delete rule', 'error');
    }
  };

  const handleRunSimulation = async () => {
    setSimLoading(true);
    try {
      const res = await simulateLeadRouting(simPayload);
      setSimResult(res.data);
      showToast('Lead distribution evaluated');
    } catch {
      showToast('Simulation failed', 'error');
    } finally {
      setSimLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // LANDING PAGES HANDLERS
  // ---------------------------------------------------------------------------
  const handleOpenCreatePage = () => {
    setEditingPage(null);
    setPageData({
      title: '',
      slug: '',
      headline: '',
      subheadline: '',
      hero_cta_text: 'Get Started Free',
      body_content: '### Next-Gen Enterprise CRM\nUnify marketing attribution, sales pipelines, and CPQ quotes.',
      form_id: formsList.length > 0 ? formsList[0].id : '',
      status: 'published',
    });
    setShowPageModal(true);
  };

  const handleSavePage = async (e) => {
    e.preventDefault();
    try {
      if (editingPage) {
        await updateLandingPage(editingPage.id, pageData);
        showToast('Landing page updated');
      } else {
        await createLandingPage(pageData);
        showToast('Landing page published');
      }
      setShowPageModal(false);
      fetchData();
    } catch {
      showToast('Failed to save landing page', 'error');
    }
  };

  const handleDeletePage = async (id) => {
    if (!window.confirm('Delete this landing page?')) return;
    try {
      await deleteLandingPage(id);
      showToast('Landing page deleted');
      fetchData();
    } catch {
      showToast('Failed to delete landing page', 'error');
    }
  };

  // Aggregate metrics
  const totalViews = formsList.reduce((acc, f) => acc + (f.total_views || 0), 0);
  const totalSubs = formsList.reduce((acc, f) => acc + (f.total_submissions || 0), 0);
  const avgConversion = totalViews > 0 ? ((totalSubs / totalViews) * 100).toFixed(1) : 0;

  return (
    <div className={`min-h-full pb-16 ${isDark ? 'bg-transparent text-[var(--text-primary)]' : 'bg-transparent text-slate-800'}`}>
      {/* Toast Alert Banner */}
      {feedback && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl transition-all ${
            feedback.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-emerald-600 text-white'
          }`}
        >
          {feedback.type === 'error' ? <XCircleIcon className="w-5 h-5" /> : <CheckCircleIcon className="w-5 h-5" />}
          <span className="text-sm font-semibold">{feedback.msg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className={`border-b ${isDark ? 'border-[var(--border-subtle)] bg-[var(--bg-surface-raised)]/90 text-[var(--text-primary)]' : 'border-slate-200 bg-white/90 text-slate-900'} backdrop-blur-md sticky top-0 z-30 px-6 py-4`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20">
              <DocumentTextIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">Forms, Landing Pages & Lead Routing Engine</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Step 15 Active (Spec §23, §38)
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Visual drag-and-drop form designer, embeddable JS widget, round-robin lead allocation & hosted landing pages.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
                isDark
                  ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-600'
              }`}
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            {activeTab === 'forms' && (
              <button
                onClick={handleOpenCreateForm}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition"
              >
                <PlusIcon className="w-4 h-4" />
                Build Form
              </button>
            )}

            {activeTab === 'routing' && (
              <button
                onClick={handleOpenCreateRule}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition"
              >
                <PlusIcon className="w-4 h-4" />
                Add Routing Rule
              </button>
            )}

            {activeTab === 'landingPages' && (
              <button
                onClick={handleOpenCreatePage}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition"
              >
                <PlusIcon className="w-4 h-4" />
                New Landing Page
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mt-4">
          {[
            { id: 'forms', label: 'Lead Capture Forms', icon: DocumentTextIcon, count: formsList.length },
            { id: 'submissions', label: 'Submissions Inbox', icon: InboxStackIcon, count: submissionsList.length },
            { id: 'routing', label: 'Lead Routing & Round-Robin', icon: UserGroupIcon, count: routingRules.length },
            { id: 'landingPages', label: 'Hosted Landing Pages', icon: GlobeAltIcon, count: landingPages.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-indigo-700 text-white' : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-6 space-y-6">
        {/* KPI Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-[var(--bg-surface-raised)] border-[var(--border-subtle)] text-[var(--text-primary)]' : 'bg-white border-slate-200'} shadow-sm`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${isDark ? 'text-[var(--text-secondary)]' : 'text-slate-500'}`}>Active Lead Forms</span>
              <DocumentTextIcon className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-bold mt-1">{formsList.length}</p>
            <p className="text-[11px] text-emerald-500 font-medium mt-1">Live embeddable & hosted</p>
          </div>

          <div className={`p-4 rounded-xl border ${isDark ? 'bg-[var(--bg-surface-raised)] border-[var(--border-subtle)] text-[var(--text-primary)]' : 'bg-white border-slate-200'} shadow-sm`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${isDark ? 'text-[var(--text-secondary)]' : 'text-slate-500'}`}>Total Leads Captured</span>
              <InboxStackIcon className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold mt-1">{totalSubs}</p>
            <p className={`text-[11px] font-medium mt-1 ${isDark ? 'text-[var(--text-secondary)]' : 'text-slate-500'}`}>
              Across {totalViews} total views
            </p>
          </div>

          <div className={`p-4 rounded-xl border ${isDark ? 'bg-[var(--bg-surface-raised)] border-[var(--border-subtle)] text-[var(--text-primary)]' : 'bg-white border-slate-200'} shadow-sm`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${isDark ? 'text-[var(--text-secondary)]' : 'text-slate-500'}`}>Avg Conversion Rate</span>
              <SparklesIcon className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold mt-1">{avgConversion}%</p>
            <p className="text-[11px] text-emerald-500 font-medium mt-1">+3.2% vs industry benchmark</p>
          </div>

          <div className={`p-4 rounded-xl border ${isDark ? 'bg-[var(--bg-surface-raised)] border-[var(--border-subtle)] text-[var(--text-primary)]' : 'bg-white border-slate-200'} shadow-sm`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${isDark ? 'text-[var(--text-secondary)]' : 'text-slate-500'}`}>Active Routing Rules</span>
              <UserGroupIcon className="w-4 h-4 text-violet-500" />
            </div>
            <p className="text-2xl font-bold mt-1">{routingRules.filter((r) => r.is_active).length}</p>
            <p className="text-[11px] text-indigo-400 font-medium mt-1">Multi-tenant round-robin active</p>
          </div>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: LEAD CAPTURE FORMS & DESIGNER                                 */}
        {/* =================================================================== */}
        {activeTab === 'forms' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-500">Configured Forms Catalog</h2>
              <span className={`text-xs ${isDark ? 'text-[var(--text-secondary)]' : 'text-slate-500'}`}>
                {formsList.length} total lead forms
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {formsList.map((form) => (
                <div
                  key={form.id}
                  className={`rounded-xl border p-5 transition flex flex-col justify-between ${
                    isDark ? 'bg-[var(--bg-surface-raised)] border-[var(--border-subtle)] hover:border-indigo-500/50 text-[var(--text-primary)]' : 'bg-white border-slate-200 hover:border-indigo-300'
                  } shadow-sm`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                          {form.status || 'published'}
                        </span>
                        <h3 className="text-base font-bold mt-2">{form.name}</h3>
                        <p className={`text-xs mt-1 line-clamp-2 ${isDark ? 'text-[var(--text-secondary)]' : 'text-slate-500'}`}>
                          {form.description || 'Public lead generation and customer intake form.'}
                        </p>
                      </div>
                    </div>

                    <div className={`mt-4 p-3 rounded-lg border text-xs space-y-2 ${isDark ? 'bg-[var(--bg-surface-sunken)] border-[var(--border-subtle)] text-[var(--text-secondary)]' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex justify-between items-center">
                        <span className={isDark ? 'text-[var(--text-secondary)]' : 'text-slate-500'}>Public Slug:</span>
                        <code className="text-[11px] font-mono font-semibold text-indigo-400">/{form.slug}</code>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Fields Configured:</span>
                        <span className="font-semibold">{form.field_count || 0} fields</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Views / Submissions:</span>
                        <span className="font-semibold">
                          {form.total_views} / {form.total_submissions} ({form.conversion_rate || 0}%)
                        </span>
                      </div>
                      {form.create_deal_on_submit === 1 && (
                        <div className="flex justify-between items-center">
                          <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Auto Deal Desk:</span>
                          <span className="text-emerald-500 font-bold flex items-center gap-1">
                            <BoltIcon className="w-3.5 h-3.5" />
                            ${Number(form.default_deal_value || 0).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="mt-5 pt-4 border-t border-dashed flex items-center justify-between gap-2 text-xs">
                    <button
                      onClick={() => handleOpenPreview(form)}
                      className={`px-2.5 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition ${
                        isDark ? 'border-slate-700 hover:bg-slate-700 text-slate-200' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                      title="Test form submission live"
                    >
                      <EyeIcon className="w-3.5 h-3.5 text-indigo-400" />
                      Test Simulator
                    </button>

                    <button
                      onClick={() => {
                        setEmbedForm(form);
                        setShowEmbedModal(true);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition ${
                        isDark ? 'border-slate-700 hover:bg-slate-700 text-slate-200' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                      title="Get embed code & share links"
                    >
                      <CodeBracketIcon className="w-3.5 h-3.5 text-emerald-400" />
                      Embed
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditForm(form)}
                        className={`p-1.5 rounded-lg border transition ${
                          isDark ? 'border-slate-700 hover:bg-slate-700 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                        }`}
                        title="Edit form"
                      >
                        <PencilSquareIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteForm(form.id)}
                        className={`p-1.5 rounded-lg border transition ${
                          isDark ? 'border-slate-700 hover:bg-rose-500/20 text-rose-400' : 'border-slate-200 hover:bg-rose-50 text-rose-600'
                        }`}
                        title="Delete form"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: SUBMISSIONS INBOX & LEAD ATTRIBUTION                          */}
        {/* =================================================================== */}
        {activeTab === 'submissions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-500">Real-Time Lead Submissions Stream</h2>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Direct capture logs with deduplication matching, created deals, and round-robin sales attribution.
                </p>
              </div>
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {submissionsList.length} submissions logged
              </span>
            </div>

            <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-[var(--bg-surface-raised)] border-[var(--border-subtle)] text-[var(--text-primary)]' : 'bg-white border-slate-200'} shadow-sm`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className={`border-b ${isDark ? 'border-[var(--border-subtle)] bg-[var(--bg-surface-sunken)] text-[var(--text-secondary)]' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                    <tr>
                      <th className="py-3 px-4 font-semibold">Form Name</th>
                      <th className="py-3 px-4 font-semibold">Lead Contact</th>
                      <th className="py-3 px-4 font-semibold">Company</th>
                      <th className="py-3 px-4 font-semibold">Deal Created</th>
                      <th className="py-3 px-4 font-semibold">Routed Sales Rep</th>
                      <th className="py-3 px-4 font-semibold">UTM Source</th>
                      <th className="py-3 px-4 font-semibold">Timestamp</th>
                      <th className="py-3 px-4 font-semibold text-right">Payload</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-[var(--border-subtle)]' : 'divide-slate-100'}`}>
                    {submissionsList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                          No submissions captured yet. Test a form in the Forms tab!
                        </td>
                      </tr>
                    ) : (
                      submissionsList.map((sub) => {
                        let routingInfo = null;
                        try {
                          routingInfo = typeof sub.routing_result_json === 'string' ? JSON.parse(sub.routing_result_json) : sub.routing_result_json;
                        } catch {}

                        return (
                          <tr key={sub.id} className={`transition ${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}`}>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-indigo-400">{sub.form_name}</span>
                              <div className="text-[10px] text-slate-400 font-mono">/{sub.form_slug}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold">
                                {sub.contact_first_name || 'Anonymous'} {sub.contact_last_name || ''}
                              </div>
                              <div className="text-[11px] text-slate-400">{sub.contact_email || 'No email'}</div>
                            </td>
                            <td className="py-3 px-4">
                              {sub.company_name ? (
                                <span className="font-medium flex items-center gap-1">
                                  <BuildingOfficeIcon className="w-3.5 h-3.5 text-slate-400" />
                                  {sub.company_name}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Individual</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {sub.deal_title ? (
                                <div>
                                  <span className="font-semibold text-emerald-500">${Number(sub.deal_value || 0).toLocaleString()}</span>
                                  <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{sub.deal_title}</div>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">None</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                <span className="font-medium">
                                  {sub.assigned_rep_first_name ? `${sub.assigned_rep_first_name} ${sub.assigned_rep_last_name}` : 'Alex Vance (Admin)'}
                                </span>
                              </div>
                              {routingInfo && (
                                <span className="text-[10px] text-slate-400">{routingInfo.ruleName || routingInfo.ruleType}</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-slate-500/10 text-slate-400 border border-slate-500/20">
                                {sub.utm_source || 'organic'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                              {new Date(sub.created_at).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => setSelectedSubmission(sub)}
                                className={`px-2.5 py-1 rounded-lg border font-semibold transition ${
                                  isDark ? 'border-slate-700 hover:bg-slate-700 text-slate-200' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                                }`}
                              >
                                Inspect
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: LEAD ROUTING & ROUND-ROBIN RULES                             */}
        {/* =================================================================== */}
        {activeTab === 'routing' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-500">Active Routing Rules (§38)</h2>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Prioritized evaluation logic for automatically assigning new leads across your sales reps.
                  </p>
                </div>
                <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {routingRules.length} rules active
                </span>
              </div>

              <div className="space-y-3">
                {routingRules.map((rule, idx) => {
                  let conds = [];
                  try {
                    conds = typeof rule.conditions_json === 'string' ? JSON.parse(rule.conditions_json) : (rule.conditions_json || []);
                  } catch {}

                  return (
                    <div
                      key={rule.id}
                      className={`p-4 rounded-xl border transition ${
                        isDark ? 'bg-[var(--bg-surface-raised)] border-[var(--border-subtle)] hover:border-indigo-500/40 text-[var(--text-primary)]' : 'bg-white border-slate-200 hover:border-indigo-300'
                      } shadow-sm`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 font-bold text-xs flex items-center justify-center">
                            #{rule.priority}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold">{rule.name}</h3>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-violet-500/10 text-violet-400 border border-violet-500/20">
                                {rule.routing_type}
                              </span>
                            </div>
                            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {rule.description || 'Automated rule strategy.'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className={`p-1.5 rounded-lg border transition ${
                              isDark ? 'border-slate-700 hover:bg-rose-500/20 text-rose-400' : 'border-slate-200 hover:bg-rose-50 text-rose-600'
                            }`}
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Conditions list */}
                      <div className="mt-3 pt-3 border-t border-dashed flex flex-wrap items-center gap-2 text-xs">
                        <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Conditions:</span>
                        {conds.length === 0 ? (
                          <span className="text-emerald-500 font-mono text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            Always matches (Catch-all)
                          </span>
                        ) : (
                          conds.map((c, i) => (
                            <span key={i} className="font-mono text-[11px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">
                              {c.field} {c.operator} "{c.value}"
                            </span>
                          ))
                        )}
                        <span className="ml-auto text-[11px] text-slate-400">
                          Current round-robin index: <span className="font-bold text-indigo-400">{rule.current_index || 0}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Interactive Lead Routing Simulator */}
            <div className={`p-5 rounded-xl border h-fit ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'} shadow-sm`}>
              <div className="flex items-center gap-2 mb-3">
                <SparklesIcon className="w-5 h-5 text-indigo-500" />
                <h3 className="text-sm font-bold">Live Lead Route Simulator</h3>
              </div>
              <p className={`text-xs mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Simulate an incoming web form lead with specific attributes to test how your rules evaluate in real-time.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Company Name</label>
                  <input
                    type="text"
                    value={simPayload.company_name}
                    onChange={(e) => setSimPayload({ ...simPayload, company_name: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border outline-none ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Country / Territory</label>
                  <input
                    type="text"
                    value={simPayload.country}
                    onChange={(e) => setSimPayload({ ...simPayload, country: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border outline-none ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Estimated Deal Budget ($)</label>
                  <input
                    type="number"
                    value={simPayload.deal_value}
                    onChange={(e) => setSimPayload({ ...simPayload, deal_value: Number(e.target.value) })}
                    className={`w-full px-3 py-2 rounded-lg border outline-none ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>

                <button
                  onClick={handleRunSimulation}
                  disabled={simLoading}
                  className="w-full py-2.5 mt-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition"
                >
                  <BoltIcon className="w-4 h-4" />
                  {simLoading ? 'Evaluating...' : 'Run Simulation Test'}
                </button>
              </div>

              {simResult && (
                <div className={`mt-4 p-3.5 rounded-lg border text-xs space-y-1.5 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-400">Match Status:</span>
                    <span className="font-bold text-emerald-500">Rule Matched</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-400">Winning Rule:</span>
                    <span className="font-bold text-indigo-400">{simResult.ruleName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-400">Routing Strategy:</span>
                    <span className="font-mono">{simResult.routingType}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-400">Assigned User ID:</span>
                    <span className="font-bold text-violet-400">User #{simResult.assignedUserId} (Alex Vance)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: HOSTED LANDING PAGES                                         */}
        {/* =================================================================== */}
        {activeTab === 'landingPages' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-500">Standalone Landing Pages (§23)</h2>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Hosted responsive marketing pages with integrated lead capture forms and conversion tracking.
                </p>
              </div>
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {landingPages.length} landing pages published
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {landingPages.map((page) => (
                <div
                  key={page.id}
                  className={`rounded-xl border p-5 transition flex flex-col justify-between ${
                    isDark ? 'bg-[var(--bg-surface-raised)] border-[var(--border-subtle)] hover:border-indigo-500/40 text-[var(--text-primary)]' : 'bg-white border-slate-200 hover:border-indigo-300'
                  } shadow-sm`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          {page.status}
                        </span>
                        <h3 className="text-base font-bold mt-2">{page.title}</h3>
                        <p className={`text-xs mt-1 ${isDark ? 'text-[var(--text-secondary)]' : 'text-slate-500'}`}>
                          {page.subheadline || page.headline}
                        </p>
                      </div>
                    </div>

                    <div className={`mt-4 p-3 rounded-lg border text-xs space-y-2 ${isDark ? 'bg-[var(--bg-surface-sunken)] border-[var(--border-subtle)] text-[var(--text-secondary)]' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex justify-between items-center">
                        <span className={isDark ? 'text-[var(--text-secondary)]' : 'text-slate-500'}>URL Path:</span>
                        <code className="text-[11px] font-mono font-semibold text-indigo-400">/pages/{page.slug}</code>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Linked Lead Form:</span>
                        <span className="font-semibold text-emerald-400">{page.form_name || 'No form linked'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Performance:</span>
                        <span className="font-semibold">
                          {page.total_views} Views / {page.total_conversions} Conversions ({page.conversion_rate || 0}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-dashed flex items-center justify-between gap-2 text-xs">
                    <button
                      onClick={() => {
                        setPreviewLandingPage(page);
                        setShowPagePreviewModal(true);
                      }}
                      className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition ${
                        isDark ? 'border-slate-700 hover:bg-slate-700 text-slate-200' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <EyeIcon className="w-3.5 h-3.5 text-indigo-400" />
                      View Landing Page
                    </button>

                    <button
                      onClick={() => handleDeletePage(page.id)}
                      className={`p-1.5 rounded-lg border transition ${
                        isDark ? 'border-slate-700 hover:bg-rose-500/20 text-rose-400' : 'border-slate-200 hover:bg-rose-50 text-rose-600'
                      }`}
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* MODAL 1: FORM DESIGNER & BUILDER MODAL                              */}
      {/* =================================================================== */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl p-6 my-8 ${isDark ? 'bg-[var(--bg-modal)] border-[var(--border-subtle)] text-[var(--text-primary)]' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className={`flex items-center justify-between border-b pb-4 mb-5 ${isDark ? 'border-[var(--border-subtle)]' : 'border-slate-200'}`}>
              <div>
                <h3 className="text-lg font-bold">{editingForm ? 'Edit Lead Capture Form' : 'Design New Lead Capture Form'}</h3>
                <p className={`text-xs ${isDark ? 'text-[var(--text-secondary)]' : 'text-slate-500'}`}>
                  Configure input fields, CRM entity mappings, and automated opportunity deal creation.
                </p>
              </div>
              <button onClick={() => setShowFormModal(false)} className="p-1 rounded-lg hover:bg-slate-700/50">
                <XCircleIcon className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold block mb-1">Form Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Enterprise Cloud Consultation"
                    className={`w-full px-3 py-2 rounded-lg border outline-none ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Custom Slug (optional)</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="e.g. enterprise-cloud-demo"
                    className={`w-full px-3 py-2 rounded-lg border outline-none ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Description / Subhead</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tell visitors what they will receive upon submission"
                  className={`w-full px-3 py-2 rounded-lg border outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold block mb-1">Submit Button Label</label>
                  <input
                    type="text"
                    value={formData.submit_button_text}
                    onChange={(e) => setFormData({ ...formData, submit_button_text: e.target.value })}
                    placeholder="Schedule Demo"
                    className={`w-full px-3 py-2 rounded-lg border outline-none ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Success Message</label>
                  <input
                    type="text"
                    value={formData.success_message}
                    onChange={(e) => setFormData({ ...formData, success_message: e.target.value })}
                    placeholder="Thank you! We will reach out shortly."
                    className={`w-full px-3 py-2 rounded-lg border outline-none ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
              </div>

              {/* Automated Opportunity Deal Creation */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <span className="font-bold block">Auto-Create Pipeline Deal on Lead Capture</span>
                  <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Automatically creates an Opportunity in your Sales Pipeline linked to this lead and company.
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={formData.default_deal_value}
                    onChange={(e) => setFormData({ ...formData, default_deal_value: Number(e.target.value) })}
                    placeholder="Deal $"
                    className={`w-28 px-2 py-1.5 rounded border text-right font-mono ${
                      isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'
                    }`}
                  />
                  <input
                    type="checkbox"
                    checked={formData.create_deal_on_submit}
                    onChange={(e) => setFormData({ ...formData, create_deal_on_submit: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Dynamic Field Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold uppercase tracking-wider text-indigo-400">Form Fields Configuration</span>
                  <button
                    type="button"
                    onClick={handleAddField}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    Add Custom Field
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {formData.fields.map((f, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-lg border grid grid-cols-12 gap-2 items-center ${
                        isDark ? 'bg-slate-900/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={f.label}
                          onChange={(e) => handleFieldChange(i, 'label', e.target.value)}
                          placeholder="Field Label"
                          className={`w-full px-2 py-1 rounded border text-xs ${
                            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'
                          }`}
                        />
                      </div>
                      <div className="col-span-3">
                        <select
                          value={f.field_type}
                          onChange={(e) => handleFieldChange(i, 'field_type', e.target.value)}
                          className={`w-full px-2 py-1 rounded border text-xs ${
                            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'
                          }`}
                        >
                          <option value="text">Text</option>
                          <option value="email">Email</option>
                          <option value="phone">Phone</option>
                          <option value="number">Number</option>
                          <option value="textarea">Textarea</option>
                          <option value="select">Dropdown</option>
                        </select>
                      </div>
                      <div className="col-span-3">
                        <select
                          value={f.map_to_entity}
                          onChange={(e) => handleFieldChange(i, 'map_to_entity', e.target.value)}
                          className={`w-full px-2 py-1 rounded border text-xs ${
                            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'
                          }`}
                        >
                          <option value="contact">Map to Contact</option>
                          <option value="company">Map to Company</option>
                          <option value="deal">Map to Deal</option>
                        </select>
                      </div>
                      <div className="col-span-2 flex items-center justify-end gap-1">
                        <label className="flex items-center gap-1 cursor-pointer" title="Required field">
                          <input
                            type="checkbox"
                            checked={Boolean(f.is_required)}
                            onChange={(e) => handleFieldChange(i, 'is_required', e.target.checked ? 1 : 0)}
                            className="rounded text-indigo-600"
                          />
                          <span className="text-[10px]">Req</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemoveField(i)}
                          className="p-1 text-rose-400 hover:text-rose-300"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className={`px-4 py-2 rounded-lg border font-semibold ${
                    isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/30"
                >
                  {editingForm ? 'Save Changes' : 'Create Lead Form'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: INTERACTIVE TEST SIMULATOR MODAL                           */}
      {/* =================================================================== */}
      {showPreviewModal && previewForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl p-6 ${isDark ? 'bg-[var(--bg-modal)] border-[var(--border-subtle)] text-[var(--text-primary)]' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className={`flex items-center justify-between border-b pb-4 mb-5 ${isDark ? 'border-[var(--border-subtle)]' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold">Interactive Form Tester</h3>
              </div>
              <button onClick={() => setShowPreviewModal(false)}>
                <XCircleIcon className="w-6 h-6 text-slate-400 hover:text-slate-300" />
              </button>
            </div>

            {previewSuccess ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto">
                  <CheckCircleIcon className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-emerald-400">Lead Captured & Processed!</h4>
                <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {previewSuccess.message}
                </p>
                <div className={`p-3 rounded-lg border text-left text-xs font-mono space-y-1 ${isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                  <div>Submission ID: #{previewSuccess.submissionId}</div>
                  <div>Contact ID: #{previewSuccess.contactId}</div>
                  <div>Deal Created ID: #{previewSuccess.dealId || 'N/A'}</div>
                  <div>Routing Rule: {previewSuccess.routing?.ruleName}</div>
                  <div>Assigned User: User #{previewSuccess.assignedUserId} (Alex Vance)</div>
                </div>
                <button
                  onClick={() => setPreviewSuccess(null)}
                  className="px-4 py-2 mt-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs"
                >
                  Test Another Submission
                </button>
              </div>
            ) : (
              <form onSubmit={handlePreviewSubmit} className="space-y-4 text-xs">
                <div>
                  <h4 className="text-base font-bold">{previewForm.name}</h4>
                  <p className={`mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{previewForm.description}</p>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {(previewForm.fields || []).map((f) => (
                    <div key={f.id || f.name}>
                      <label className="font-semibold block mb-1">
                        {f.label} {f.is_required === 1 && <span className="text-rose-500">*</span>}
                      </label>
                      {f.field_type === 'textarea' ? (
                        <textarea
                          rows={2}
                          required={Boolean(f.is_required)}
                          placeholder={f.placeholder}
                          value={previewFormData[f.name] || ''}
                          onChange={(e) => setPreviewFormData({ ...previewFormData, [f.name]: e.target.value })}
                          className={`w-full px-3 py-2 rounded-lg border outline-none ${
                            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                          }`}
                        />
                      ) : (
                        <input
                          type={f.field_type}
                          required={Boolean(f.is_required)}
                          placeholder={f.placeholder}
                          value={previewFormData[f.name] || ''}
                          onChange={(e) => setPreviewFormData({ ...previewFormData, [f.name]: e.target.value })}
                          className={`w-full px-3 py-2 rounded-lg border outline-none ${
                            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-700/50 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPreviewModal(false)}
                    className={`px-4 py-2 rounded-lg border font-semibold ${
                      isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={previewSubmitting}
                    className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/30"
                  >
                    {previewSubmitting ? 'Submitting...' : previewForm.submit_button_text || 'Submit Lead'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 3: EMBED CODE & SHARE MODAL                                   */}
      {/* =================================================================== */}
      {showEmbedModal && embedForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-xl rounded-2xl border shadow-2xl p-6 ${isDark ? 'bg-[var(--bg-modal)] border-[var(--border-subtle)] text-[var(--text-primary)]' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className={`flex items-center justify-between border-b pb-4 mb-4 ${isDark ? 'border-[var(--border-subtle)]' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <CodeBracketIcon className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold">Embed Form Widget & Direct Link</h3>
              </div>
              <button onClick={() => setShowEmbedModal(false)}>
                <XCircleIcon className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Direct Hosted Form URL</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`http://localhost:5000/api/v1/forms/public/${embedForm.slug}`}
                    className={`w-full px-3 py-2 rounded-lg border font-mono ${
                      isDark ? 'bg-slate-900 border-slate-700 text-indigo-300' : 'bg-slate-50 border-slate-300 text-indigo-700'
                    }`}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`http://localhost:5000/api/v1/forms/public/${embedForm.slug}`);
                      showToast('URL copied to clipboard!');
                    }}
                    className="px-3 py-2 rounded-lg bg-indigo-600 text-white font-bold shrink-0"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Asynchronous JavaScript Embed Snippet</label>
                <div className="relative">
                  <textarea
                    rows={3}
                    readOnly
                    value={`<script src="http://localhost:5000/static/crm-form-widget.js" data-form-slug="${embedForm.slug}" async></script>\n<div id="crm-form-${embedForm.slug}"></div>`}
                    className={`w-full p-3 rounded-lg border font-mono ${
                      isDark ? 'bg-slate-900 border-slate-700 text-emerald-400' : 'bg-slate-50 border-slate-300 text-emerald-700'
                    }`}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`<script src="http://localhost:5000/static/crm-form-widget.js" data-form-slug="${embedForm.slug}" async></script>\n<div id="crm-form-${embedForm.slug}"></div>`);
                      showToast('Script snippet copied!');
                    }}
                    className="absolute top-2 right-2 px-2.5 py-1 rounded bg-slate-700 text-white font-semibold text-[10px]"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Standard iFrame Embed</label>
                <div className="relative">
                  <textarea
                    rows={2}
                    readOnly
                    value={`<iframe src="http://localhost:5000/forms/${embedForm.slug}" width="100%" height="520" frameborder="0"></iframe>`}
                    className={`w-full p-3 rounded-lg border font-mono ${
                      isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-300 text-slate-700'
                    }`}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`<iframe src="http://localhost:5000/forms/${embedForm.slug}" width="100%" height="520" frameborder="0"></iframe>`);
                      showToast('iFrame code copied!');
                    }}
                    className="absolute top-2 right-2 px-2.5 py-1 rounded bg-slate-700 text-white font-semibold text-[10px]"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SLIDE-OVER DRAWER: SUBMISSION PAYLOAD & ATTRIBUTION INSPECTOR         */}
      {/* =================================================================== */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto border-l ${isDark ? 'bg-[var(--bg-modal)] border-[var(--border-subtle)] text-[var(--text-primary)]' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div>
              <div className={`flex items-center justify-between border-b pb-4 mb-4 ${isDark ? 'border-[var(--border-subtle)]' : 'border-slate-200'}`}>
                <div>
                  <h3 className="text-base font-bold">Submission #{selectedSubmission.id}</h3>
                  <p className={`text-xs ${isDark ? 'text-[var(--text-secondary)]' : 'text-slate-500'}`}>{selectedSubmission.form_name}</p>
                </div>
                <button onClick={() => setSelectedSubmission(null)}>
                  <XCircleIcon className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-bold text-indigo-400 mb-1">Submitted Form Values</h4>
                  <pre className={`p-3 rounded-lg border font-mono overflow-x-auto text-[11px] ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    {JSON.stringify(
                      typeof selectedSubmission.submitted_data_json === 'string'
                        ? JSON.parse(selectedSubmission.submitted_data_json)
                        : selectedSubmission.submitted_data_json,
                      null,
                      2
                    )}
                  </pre>
                </div>

                <div>
                  <h4 className="font-bold text-violet-400 mb-1">Lead Routing Decision</h4>
                  <pre className={`p-3 rounded-lg border font-mono overflow-x-auto text-[11px] ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    {JSON.stringify(
                      typeof selectedSubmission.routing_result_json === 'string'
                        ? JSON.parse(selectedSubmission.routing_result_json)
                        : selectedSubmission.routing_result_json,
                      null,
                      2
                    )}
                  </pre>
                </div>

                <div>
                  <h4 className="font-bold text-emerald-400 mb-1">Browser Metadata & Attribution</h4>
                  <div className={`p-3 rounded-lg border space-y-1.5 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div><span className="font-semibold text-slate-400">IP Address:</span> {selectedSubmission.ip_address || '127.0.0.1'}</div>
                    <div><span className="font-semibold text-slate-400">UTM Source:</span> {selectedSubmission.utm_source || 'organic'}</div>
                    <div><span className="font-semibold text-slate-400">Referrer:</span> {selectedSubmission.referrer_url || 'Direct'}</div>
                    <div className="truncate"><span className="font-semibold text-slate-400">User Agent:</span> {selectedSubmission.user_agent}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-700/50 flex justify-end">
              <button
                onClick={() => setSelectedSubmission(null)}
                className={`px-4 py-2 rounded-lg border font-semibold text-xs ${
                  isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-100'
                }`}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 4: CREATE ROUTING RULE MODAL                                  */}
      {/* =================================================================== */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 ${isDark ? 'bg-[var(--bg-modal)] border-[var(--border-subtle)] text-[var(--text-primary)]' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className={`flex items-center justify-between border-b pb-4 mb-4 ${isDark ? 'border-[var(--border-subtle)]' : 'border-slate-200'}`}>
              <h3 className="text-base font-bold">Create Lead Routing Rule</h3>
              <button onClick={() => setShowRuleModal(false)}>
                <XCircleIcon className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Rule Name *</label>
                <input
                  type="text"
                  required
                  value={ruleData.name}
                  onChange={(e) => setRuleData({ ...ruleData, name: e.target.value })}
                  placeholder="e.g. High-Velocity Deal Desk"
                  className={`w-full px-3 py-2 rounded-lg border outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Routing Strategy</label>
                <select
                  value={ruleData.routing_type}
                  onChange={(e) => setRuleData({ ...ruleData, routing_type: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  <option value="round_robin">Equal Round-Robin</option>
                  <option value="deal_size">Deal Size Threshold ($50k+)</option>
                  <option value="territory">Geography / Territory Matching</option>
                  <option value="fallback">Fallback Assignment</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Priority Order (1 = Highest)</label>
                <input
                  type="number"
                  value={ruleData.priority}
                  onChange={(e) => setRuleData({ ...ruleData, priority: Number(e.target.value) })}
                  className={`w-full px-3 py-2 rounded-lg border outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
                  className="px-4 py-2 rounded-lg border font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 5: CREATE LANDING PAGE MODAL                                  */}
      {/* =================================================================== */}
      {showPageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl p-6 ${isDark ? 'bg-[var(--bg-modal)] border-[var(--border-subtle)] text-[var(--text-primary)]' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className={`flex items-center justify-between border-b pb-4 mb-4 ${isDark ? 'border-[var(--border-subtle)]' : 'border-slate-200'}`}>
              <h3 className="text-base font-bold">Publish New Landing Page</h3>
              <button onClick={() => setShowPageModal(false)}>
                <XCircleIcon className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSavePage} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Page Title *</label>
                <input
                  type="text"
                  required
                  value={pageData.title}
                  onChange={(e) => setPageData({ ...pageData, title: e.target.value })}
                  placeholder="e.g. Enterprise Cloud Sales Engine"
                  className={`w-full px-3 py-2 rounded-lg border outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Custom URL Slug</label>
                <input
                  type="text"
                  value={pageData.slug}
                  onChange={(e) => setPageData({ ...pageData, slug: e.target.value })}
                  placeholder="e.g. enterprise-suite"
                  className={`w-full px-3 py-2 rounded-lg border outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Headline</label>
                <input
                  type="text"
                  value={pageData.headline}
                  onChange={(e) => setPageData({ ...pageData, headline: e.target.value })}
                  placeholder="Modernize Revenue Velocity With AI"
                  className={`w-full px-3 py-2 rounded-lg border outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Linked Lead Form</label>
                <select
                  value={pageData.form_id}
                  onChange={(e) => setPageData({ ...pageData, form_id: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  <option value="">-- No form linked --</option>
                  {formsList.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} (/{f.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setShowPageModal(false)}
                  className="px-4 py-2 rounded-lg border font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Publish Landing Page
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 6: LANDING PAGE LIVE PREVIEW MOCKUP                           */}
      {/* =================================================================== */}
      {showPagePreviewModal && previewLandingPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl p-8 my-6 ${isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex justify-end mb-2">
              <button onClick={() => setShowPagePreviewModal(false)}>
                <XCircleIcon className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="text-center space-y-3 mb-8">
              <span className="text-xs font-bold tracking-wider px-3 py-1 rounded-full uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Hosted CRM Landing Page
              </span>
              <h2 className="text-2xl font-black">{previewLandingPage.headline || previewLandingPage.title}</h2>
              <p className={`text-sm max-w-lg mx-auto ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {previewLandingPage.subheadline || 'High-performance revenue and customer intelligence platform.'}
              </p>
            </div>

            <div className={`p-6 rounded-xl border mb-6 ${isDark ? 'bg-[var(--bg-surface-sunken)] border-[var(--border-subtle)] text-[var(--text-secondary)]' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {previewLandingPage.body_content || 'Comprehensive enterprise features ready for scale.'}
              </div>
            </div>

            {previewLandingPage.form_name && (
              <div className={`p-6 rounded-xl border text-center ${isDark ? 'bg-[var(--bg-surface-raised)] border-[var(--border-subtle)] text-[var(--text-primary)]' : 'bg-white border-slate-200'}`}>
                <h3 className="text-sm font-bold text-indigo-400 mb-1">Embedded Lead Intake</h3>
                <p className="text-xs text-slate-400 mb-4">{previewLandingPage.form_name}</p>
                <button
                  onClick={() => {
                    setShowPagePreviewModal(false);
                    const formObj = formsList.find((f) => f.id === previewLandingPage.form_id);
                    if (formObj) handleOpenPreview(formObj);
                  }}
                  className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/30"
                >
                  {previewLandingPage.hero_cta_text || 'Complete Demonstration Request'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
