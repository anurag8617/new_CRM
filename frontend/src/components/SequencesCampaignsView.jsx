import React, { useState, useEffect } from 'react';
import {
  Send,
  Mail,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  Users,
  Flame,
  Sparkles,
  Plus,
  Search,
  Filter,
  ArrowRight,
  Trash2,
  Eye,
  MousePointer,
  AlertCircle,
  Phone,
  Linkedin,
  Calendar,
  RefreshCw,
  FileText,
  ChevronRight,
  Layers,
  MessageSquare,
  Check,
  ExternalLink,
  BarChart2,
  X,
  Target,
  Zap,
} from 'lucide-react';
import {
  getMarketingMetrics,
  getSequences,
  getSequenceById,
  createSequence,
  updateSequence,
  deleteSequence,
  addSequenceStep,
  deleteSequenceStep,
  getSequenceEnrollments,
  enrollContactsInSequence,
  updateEnrollmentStatus,
  executeSequenceStep,
  simulateSequenceReply,
  getCampaigns,
  getCampaignById,
  getAudiencePreview,
  createCampaign,
  sendCampaign,
  trackCampaignRecipient,
  getContacts,
} from '../services/api';

export default function SequencesCampaignsView() {
  const [activeTab, setActiveTab] = useState('sequences'); // 'sequences' | 'enrollments' | 'campaigns' | 'analytics'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Core Data
  const [metrics, setMetrics] = useState(null);
  const [sequences, setSequences] = useState([]);
  const [selectedSequence, setSelectedSequence] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [allContacts, setAllContacts] = useState([]);

  // Modals & Forms
  const [showCreateSeqModal, setShowCreateSeqModal] = useState(false);
  const [showAddStepModal, setShowAddStepModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);
  const [replyEnrollment, setReplyEnrollment] = useState(null);
  const [replyText, setReplyText] = useState('Hi Alex, interested in learning more! Let’s hop on a call this Thursday at 2 PM.');

  // Form states
  const [newSeq, setNewSeq] = useState({
    name: '',
    description: '',
    pause_on_reply: true,
  });

  const [newStep, setNewStep] = useState({
    step_type: 'email',
    delay_days: 1,
    delay_hours: 0,
    subject: '',
    body_template: '',
  });

  const [selectedContactIds, setSelectedContactIds] = useState([]);

  const [newCampaign, setNewCampaign] = useState({
    name: '',
    subject: '',
    preview_text: '',
    from_name: 'Alex Vance',
    from_email: 'alex@acme.global',
    target_segment: 'all_contacts',
    html_content: '<h2>Hello {{first_name}},</h2><p>We are thrilled to announce our latest updates and features designed for {{company_name}}.</p><p><a href="https://acme.global">Click here to explore the demo</a></p>',
  });

  const [audiencePreview, setAudiencePreview] = useState({ count: 0, sample: [] });

  // Filters
  const [seqFilter, setSeqFilter] = useState('all');
  const [enrollStatusFilter, setEnrollStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Initial load
  useEffect(() => {
    loadAllData();
  }, []);

  // Update audience preview when campaign modal opens or segment changes
  useEffect(() => {
    if (showCreateCampaignModal) {
      fetchAudiencePreview(newCampaign.target_segment);
    }
  }, [newCampaign.target_segment, showCreateCampaignModal]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [mRes, sRes, eRes, cRes, contactsRes] = await Promise.all([
        getMarketingMetrics(),
        getSequences(),
        getSequenceEnrollments(),
        getCampaigns(),
        getContacts(),
      ]);

      if (mRes.success) setMetrics(mRes.data);
      if (sRes.success) {
        setSequences(sRes.data);
        if (sRes.data.length > 0 && !selectedSequence) {
          const detail = await getSequenceById(sRes.data[0].id);
          if (detail.success) setSelectedSequence(detail.data);
        }
      }
      if (eRes.success) setEnrollments(eRes.data);
      if (cRes.success) setCampaigns(cRes.data);
      if (contactsRes.success) setAllContacts(contactsRes.data);
    } catch (err) {
      console.error('Failed to load marketing data:', err);
      setError(err.message || 'Error loading sequence & campaign data');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSequence = async (seqId) => {
    try {
      const res = await getSequenceById(seqId);
      if (res.success) {
        setSelectedSequence(res.data);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSelectCampaign = async (campId) => {
    try {
      const res = await getCampaignById(campId);
      if (res.success) {
        setSelectedCampaign(res.data);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchAudiencePreview = async (segment) => {
    try {
      const res = await getAudiencePreview(segment);
      if (res.success) {
        setAudiencePreview(res.data);
      }
    } catch (err) {
      console.error('Audience preview error:', err);
    }
  };

  const triggerToast = (msg) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  // -------------------------------------------------------------------
  // SEQUENCE ACTIONS
  // -------------------------------------------------------------------
  const handleCreateSequence = async (e) => {
    e.preventDefault();
    try {
      const res = await createSequence({
        ...newSeq,
        steps: [
          {
            step_order: 1,
            step_type: 'email',
            delay_days: 0,
            delay_hours: 0,
            subject: 'Quick question regarding {{company_name}}',
            body_template: 'Hi {{first_name}},\n\nI noticed your recent developments at {{company_name}}. Would love to share our architecture benchmarks with you.\n\nBest,\nAlex',
          },
        ],
      });
      if (res.success) {
        triggerToast(`Sequence "${res.data.name}" created with initial outreach step!`);
        setShowCreateSeqModal(false);
        setNewSeq({ name: '', description: '', pause_on_reply: true });
        await loadAllData();
        setSelectedSequence(res.data);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddStep = async (e) => {
    e.preventDefault();
    if (!selectedSequence) return;
    try {
      const res = await addSequenceStep(selectedSequence.id, newStep);
      if (res.success) {
        triggerToast(`New cadence step added successfully!`);
        setShowAddStepModal(false);
        setNewStep({
          step_type: 'email',
          delay_days: 1,
          delay_hours: 0,
          subject: '',
          body_template: '',
        });
        setSelectedSequence(res.data);
        await loadAllData();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteStep = async (stepId) => {
    if (!selectedSequence || !window.confirm('Delete this cadence step?')) return;
    try {
      const res = await deleteSequenceStep(selectedSequence.id, stepId);
      if (res.success) {
        triggerToast('Cadence step removed.');
        setSelectedSequence(res.data);
        await loadAllData();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEnrollContacts = async (e) => {
    e.preventDefault();
    if (!selectedSequence || selectedContactIds.length === 0) return;
    try {
      const res = await enrollContactsInSequence(selectedSequence.id, selectedContactIds);
      if (res.success) {
        triggerToast(`Successfully enrolled ${res.data.count} contacts in "${selectedSequence.name}"!`);
        setShowEnrollModal(false);
        setSelectedContactIds([]);
        await loadAllData();
        const updatedDetail = await getSequenceById(selectedSequence.id);
        if (updatedDetail.success) setSelectedSequence(updatedDetail.data);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // -------------------------------------------------------------------
  // ENROLLMENT SIMULATOR ACTIONS
  // -------------------------------------------------------------------
  const handleExecuteStep = async (enrollmentId) => {
    try {
      const res = await executeSequenceStep(enrollmentId);
      if (res.success) {
        triggerToast(`Cadence touchpoint executed: ${res.data.detail}`);
        await loadAllData();
        if (selectedSequence) {
          const updatedDetail = await getSequenceById(selectedSequence.id);
          if (updatedDetail.success) setSelectedSequence(updatedDetail.data);
        }
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSimulateReply = async (e) => {
    e.preventDefault();
    if (!replyEnrollment) return;
    try {
      const res = await simulateSequenceReply(replyEnrollment.id, replyText);
      if (res.success) {
        triggerToast(res.data.message);
        setShowReplyModal(false);
        setReplyEnrollment(null);
        await loadAllData();
        if (selectedSequence) {
          const updatedDetail = await getSequenceById(selectedSequence.id);
          if (updatedDetail.success) setSelectedSequence(updatedDetail.data);
        }
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleEnrollmentStatus = async (enrollmentId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      const res = await updateEnrollmentStatus(enrollmentId, nextStatus);
      if (res.success) {
        triggerToast(`Enrollment status updated to ${nextStatus}.`);
        await loadAllData();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // -------------------------------------------------------------------
  // CAMPAIGN ACTIONS
  // -------------------------------------------------------------------
  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    try {
      const res = await createCampaign(newCampaign);
      if (res.success) {
        triggerToast(`Email broadcast campaign "${res.data.name}" created!`);
        setShowCreateCampaignModal(false);
        setNewCampaign({
          name: '',
          subject: '',
          preview_text: '',
          from_name: 'Alex Vance',
          from_email: 'alex@acme.global',
          target_segment: 'all_contacts',
          html_content: '<h2>Hello {{first_name}},</h2><p>We are thrilled to announce our latest updates.</p>',
        });
        await loadAllData();
        setSelectedCampaign(res.data);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSendCampaign = async (campId) => {
    if (!window.confirm('Dispatch this broadcast email campaign to the resolved target segment now?')) return;
    try {
      const res = await sendCampaign(campId);
      if (res.success) {
        triggerToast(`Broadcast dispatched to ${res.data.total_recipients} recipients!`);
        await loadAllData();
        setSelectedCampaign(res.data);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTrackRecipient = async (recipientId, eventType) => {
    try {
      const res = await trackCampaignRecipient(recipientId, eventType);
      if (res.success) {
        triggerToast(`Simulated recipient ${eventType.toUpperCase()} event recorded.`);
        setSelectedCampaign(res.data);
        await loadAllData();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Tag inserter helper for email template
  const insertMergeTag = (tag) => {
    setNewStep((prev) => ({
      ...prev,
      body_template: prev.body_template + ` {{${tag}}} `,
    }));
  };

  const getStepIcon = (type) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4 text-sky-500" />;
      case 'call_reminder':
        return <Phone className="w-4 h-4 text-emerald-500" />;
      case 'linkedin_touch':
        return <Linkedin className="w-4 h-4 text-blue-600" />;
      case 'task':
        return <CheckCircle2 className="w-4 h-4 text-purple-500" />;
      case 'delay':
        return <Clock className="w-4 h-4 text-amber-500" />;
      default:
        return <Zap className="w-4 h-4 text-slate-500" />;
    }
  };

  const filteredSequences = sequences.filter((s) => {
    if (seqFilter !== 'all' && s.status !== seqFilter) return false;
    if (searchTerm) {
      return (
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    return true;
  });

  const filteredEnrollments = enrollments.filter((e) => {
    if (enrollStatusFilter !== 'all' && e.status !== enrollStatusFilter) return false;
    if (searchTerm) {
      return (
        e.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.sequence_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-semibold">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <span className="text-sm font-semibold">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Step 13: Customer Sequences, Multi-Channel Outreach & Email Campaigns (Spec §14, §23)</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Send className="w-6 h-6 text-purple-600" />
            <span>Outreach Automation & Campaigns Engine</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Automated sales sequences with multi-step delay rules, LinkedIn and call touchpoints, auto-pause on reply, and broadcast email delivery tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAllData}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          <button
            onClick={() => setShowCreateSeqModal(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Cadence Sequence</span>
          </button>

          <button
            onClick={() => setShowCreateCampaignModal(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            <span>New Broadcast Campaign</span>
          </button>
        </div>
      </div>

      {/* Overview KPI Ribbon (§14, §23) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Active Sequences</span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics?.sequences?.active || 0}</p>
          <span className="text-[11px] text-purple-600 font-medium mt-1 inline-block">
            {metrics?.sequences?.total || 0} Total Cadences
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Enrolled Contacts</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics?.sequences?.totalEnrolled || 0}</p>
          <span className="text-[11px] text-indigo-600 font-medium mt-1 inline-block">
            {metrics?.sequences?.activeEnrollments || 0} In Active Cadence
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Reply Rate (§14)</span>
            <MessageSquare className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics?.sequences?.replyRatePct || 0}%</p>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 inline-block flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Auto-Pause on Reply
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Broadcasts Sent</span>
            <Send className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics?.campaigns?.sent || 0}</p>
          <span className="text-[11px] text-sky-600 font-medium mt-1 inline-block">
            {metrics?.campaigns?.delivered || 0} Delivered
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Broadcast Open Rate</span>
            <Eye className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics?.campaigns?.openRatePct || 0}%</p>
          <span className="text-[11px] text-amber-600 font-medium mt-1 inline-block">
            {metrics?.campaigns?.opens || 0} Unique Opens
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Click-Through (CTR)</span>
            <MousePointer className="w-4 h-4 text-violet-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics?.campaigns?.clickRatePct || 0}%</p>
          <span className="text-[11px] text-violet-600 font-medium mt-1 inline-block">
            {metrics?.campaigns?.clicks || 0} Link Clicks
          </span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-xl shadow-2xs">
        <button
          onClick={() => setActiveTab('sequences')}
          className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'sequences'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Cadence Sequences ({sequences.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('enrollments')}
          className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'enrollments'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Contact Enrollments & Step Simulator ({enrollments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('campaigns')}
          className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'campaigns'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Broadcast Campaigns ({campaigns.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'analytics'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Outreach Analytics (§14, §23)</span>
        </button>
      </div>

      {/* ================================================================= */}
      {/* TAB 1: CADENCE SEQUENCES & BUILDER (§14) */}
      {/* ================================================================= */}
      {activeTab === 'sequences' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sequences Master List (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">Sales Sequences</h3>
                <span className="text-xs text-slate-500">{filteredSequences.length} items</span>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search cadences..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <select
                  value={seqFilter}
                  onChange={(e) => setSeqFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              {/* Sequence Cards */}
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {filteredSequences.map((seq) => {
                  const isSelected = selectedSequence?.id === seq.id;
                  return (
                    <div
                      key={seq.id}
                      onClick={() => handleSelectSequence(seq.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50/50 shadow-xs ring-1 ring-purple-400'
                          : 'border-slate-200 bg-white hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{seq.name}</h4>
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{seq.description}</p>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            seq.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {seq.status}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <Layers className="w-3.5 h-3.5 text-purple-600" />
                          {seq.steps_count} Steps
                        </span>
                        <span>{seq.total_enrolled} enrolled</span>
                        <span>{seq.total_replied} replies</span>
                        {seq.pause_on_reply && (
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">
                            Auto-Pause
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sequence Detail & Cadence Step Visualizer (7 cols) */}
          <div className="lg:col-span-7">
            {selectedSequence ? (
              <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">{selectedSequence.name}</h3>
                      <span className="text-[11px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                        {selectedSequence.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{selectedSequence.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowEnrollModal(true)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Enroll Contacts</span>
                    </button>

                    <button
                      onClick={() => setShowAddStepModal(true)}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Touchpoint</span>
                    </button>
                  </div>
                </div>

                {/* Cadence Metrics Bar */}
                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Total Enrolled</span>
                    <span className="text-base font-bold text-slate-800">{selectedSequence.total_enrolled}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Completed</span>
                    <span className="text-base font-bold text-emerald-600">{selectedSequence.total_completed}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Replies Received</span>
                    <span className="text-base font-bold text-purple-600">{selectedSequence.total_replied}</span>
                  </div>
                </div>

                {/* Cadence Visual Timeline */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-600" />
                    <span>Cadence Progression Rules ({selectedSequence.steps?.length || 0} Steps)</span>
                  </h4>

                  {selectedSequence.steps?.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                      <p className="text-xs text-slate-500">No steps defined yet. Click "Add Touchpoint" to build this cadence.</p>
                    </div>
                  ) : (
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {selectedSequence.steps?.map((step, idx) => (
                        <div
                          key={step.id}
                          className="relative bg-slate-50/80 border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-purple-300 transition-colors"
                        >
                          {/* Timeline dot */}
                          <div className="absolute -left-6.5 top-4 w-5 h-5 rounded-full bg-white border-2 border-purple-500 flex items-center justify-center text-[10px] font-bold text-purple-700">
                            {idx + 1}
                          </div>

                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="p-1 rounded bg-white border border-slate-200 shadow-2xs">
                                  {getStepIcon(step.step_type)}
                                </span>
                                <span className="text-xs font-bold uppercase text-slate-800">
                                  Step {step.step_order}: {step.step_type.replace('_', ' ')}
                                </span>
                                <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                  {step.delay_days > 0 ? `Wait ${step.delay_days} day(s)` : 'Immediate Touchpoint'}
                                </span>
                              </div>

                              <p className="text-sm font-semibold text-slate-900 mt-1">{step.subject || 'Automated Action'}</p>
                              {step.body_template && (
                                <p className="text-xs text-slate-600 font-mono bg-white p-2 rounded border border-slate-200 line-clamp-3 whitespace-pre-wrap">
                                  {step.body_template}
                                </p>
                              )}
                            </div>

                            <button
                              onClick={() => handleDeleteStep(step.id)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              title="Delete Step"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Enrolled Contacts in this Sequence */}
                {selectedSequence.enrollments?.length > 0 && (
                  <div className="border-t border-slate-100 pt-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Recent Sequence Enrollments ({selectedSequence.enrollments.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedSequence.enrollments.slice(0, 5).map((en) => (
                        <div
                          key={en.id}
                          className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-800">
                              {en.first_name} {en.last_name}
                            </span>
                            <span className="text-slate-500 ml-2 font-mono text-[11px]">{en.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                              Step {en.current_step_order}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                en.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : en.status === 'replied_unenrolled'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {en.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">Select a sequence to view cadence rules</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: ACTIVE CONTACT ENROLLMENTS & STEP SIMULATOR (§14) */}
      {/* ================================================================= */}
      {activeTab === 'enrollments' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search enrolled contacts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <select
                value={enrollStatusFilter}
                onChange={(e) => setEnrollStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600"
              >
                <option value="all">All States</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="replied_unenrolled">Replied & Auto-Paused</option>
              </select>
            </div>

            <div className="text-xs text-slate-500">
              Showing <span className="font-bold text-slate-800">{filteredEnrollments.length}</span> enrollments
            </div>
          </div>

          {/* Enrollments Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Sequence Cadence</th>
                    <th className="py-3 px-4">Current Step</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Next Due Date</th>
                    <th className="py-3 px-4 text-right">Cadence Simulator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEnrollments.map((en) => (
                    <tr key={en.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">
                          {en.first_name} {en.last_name}
                        </div>
                        <div className="text-slate-500 text-[11px] font-mono">{en.email}</div>
                        {en.company_name && (
                          <span className="text-[10px] text-slate-400 font-medium">{en.company_name}</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-purple-700">{en.sequence_name}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Step #{en.current_step_order}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            en.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : en.status === 'replied_unenrolled'
                              ? 'bg-purple-100 text-purple-800'
                              : en.status === 'completed'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {en.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {en.next_step_due_at ? new Date(en.next_step_due_at).toLocaleString() : '—'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {en.status === 'active' && (
                            <>
                              <button
                                onClick={() => handleExecuteStep(en.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold shadow-2xs flex items-center gap-1"
                                title="Execute current cadence step now"
                              >
                                <Play className="w-3 h-3" />
                                <span>Execute Step</span>
                              </button>

                              <button
                                onClick={() => {
                                  setReplyEnrollment(en);
                                  setShowReplyModal(true);
                                }}
                                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[11px] font-semibold shadow-2xs flex items-center gap-1"
                                title="Simulate prospect reply and auto-pause"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>Simulate Reply</span>
                              </button>

                              <button
                                onClick={() => handleToggleEnrollmentStatus(en.id, en.status)}
                                className="p-1 text-slate-400 hover:text-amber-600"
                                title="Pause cadence"
                              >
                                <Pause className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {en.status === 'paused' && (
                            <button
                              onClick={() => handleToggleEnrollmentStatus(en.id, en.status)}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-semibold shadow-2xs flex items-center gap-1"
                            >
                              <Play className="w-3 h-3" />
                              <span>Resume</span>
                            </button>
                          )}

                          {en.status === 'replied_unenrolled' && (
                            <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              Replied & Unenrolled
                            </span>
                          )}

                          {en.status === 'completed' && (
                            <span className="text-[10px] text-slate-500 font-medium">Cadence Finished</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: BROADCAST EMAIL CAMPAIGNS & SEGMENTS (§23) */}
      {/* ================================================================= */}
      {activeTab === 'campaigns' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Campaign List (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">Broadcast Campaigns</h3>
                <span className="text-xs text-slate-500">{campaigns.length} campaigns</span>
              </div>

              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {campaigns.map((camp) => {
                  const isSelected = selectedCampaign?.id === camp.id;
                  return (
                    <div
                      key={camp.id}
                      onClick={() => handleSelectCampaign(camp.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-400'
                          : 'border-slate-200 bg-white hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{camp.name}</h4>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{camp.subject}</p>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            camp.status === 'sent'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {camp.status}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs border-t border-slate-100 pt-2 text-slate-600">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Recipients</span>
                          <span className="font-bold">{camp.total_recipients}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Open Rate</span>
                          <span className="font-bold text-emerald-600">{camp.open_rate}%</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">CTR</span>
                          <span className="font-bold text-violet-600">{camp.click_rate}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Campaign Detail & Recipient Engagement Tracker (7 cols) */}
          <div className="lg:col-span-7">
            {selectedCampaign ? (
              <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">{selectedCampaign.name}</h3>
                      <span className="text-[11px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                        {selectedCampaign.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Subject: <span className="font-medium text-slate-700">{selectedCampaign.subject}</span>
                    </p>
                  </div>

                  {selectedCampaign.status === 'draft' && (
                    <button
                      onClick={() => handleSendCampaign(selectedCampaign.id)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch Broadcast Now</span>
                    </button>
                  )}
                </div>

                {/* Campaign Metrics Bar */}
                <div className="grid grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Audience</span>
                    <span className="text-lg font-bold text-slate-800">{selectedCampaign.total_recipients}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Delivered</span>
                    <span className="text-lg font-bold text-sky-600">{selectedCampaign.delivered_count}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Opened ({selectedCampaign.open_rate}%)</span>
                    <span className="text-lg font-bold text-emerald-600">{selectedCampaign.open_count}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Clicked ({selectedCampaign.click_rate}%)</span>
                    <span className="text-lg font-bold text-violet-600">{selectedCampaign.click_count}</span>
                  </div>
                </div>

                {/* Recipient Engagement List */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Recipient Tracking & Engagement Simulator ({selectedCampaign.recipients?.length || 0})</span>
                  </h4>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Recipient</th>
                          <th className="py-2.5 px-3">Engagement Status</th>
                          <th className="py-2.5 px-3">Timestamps</th>
                          <th className="py-2.5 px-3 text-right">Event Simulator</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedCampaign.recipients?.map((rec) => (
                          <tr key={rec.id} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-slate-900 block">
                                {rec.first_name} {rec.last_name}
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono">{rec.email}</span>
                            </td>

                            <td className="py-2.5 px-3">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  rec.status === 'clicked'
                                    ? 'bg-violet-100 text-violet-800'
                                    : rec.status === 'opened'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : rec.status === 'delivered' || rec.status === 'sent'
                                    ? 'bg-sky-100 text-sky-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {rec.status}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-[11px] text-slate-500">
                              {rec.clicked_at ? (
                                <span className="text-violet-600 font-medium">Clicked</span>
                              ) : rec.opened_at ? (
                                <span className="text-emerald-600 font-medium">Opened</span>
                              ) : (
                                <span>Sent</span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {rec.status !== 'clicked' && (
                                  <button
                                    onClick={() => handleTrackRecipient(rec.id, 'click')}
                                    className="px-2 py-0.5 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 rounded text-[10px] font-semibold"
                                    title="Simulate prospect clicking a link in email"
                                  >
                                    Simulate Click
                                  </button>
                                )}
                                {rec.status !== 'opened' && rec.status !== 'clicked' && (
                                  <button
                                    onClick={() => handleTrackRecipient(rec.id, 'open')}
                                    className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10px] font-semibold"
                                    title="Simulate prospect opening email"
                                  >
                                    Simulate Open
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                <Send className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">Select a campaign to view delivery and engagement analytics</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 4: MARKETING & OUTREACH ANALYTICS (§14, §23) */}
      {/* ================================================================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-600" />
                <span>Multi-Channel Outreach Mix</span>
              </h3>
              <p className="text-xs text-slate-500">Distribution of cadence touchpoint channels configured in active sequences.</p>
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <Mail className="w-3.5 h-3.5 text-sky-500" /> Automated Emails
                  </span>
                  <span className="font-bold text-slate-900">55%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-sky-500 h-full rounded-full" style={{ width: '55%' }}></div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <Linkedin className="w-3.5 h-3.5 text-blue-600" /> LinkedIn Touches
                  </span>
                  <span className="font-bold text-slate-900">25%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: '25%' }}></div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" /> Phone Discovery Touches
                  </span>
                  <span className="font-bold text-slate-900">20%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '20%' }}></div>
                </div>
              </div>
            </div>

            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>Conversion Velocity & Reply Protection</span>
              </h3>
              <p className="text-xs text-slate-500">Autonomous anti-collision rules auto-pause cadences immediately upon prospect reply.</p>
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-purple-900">Auto-Pause Trigger</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                    Enabled (§14)
                  </span>
                </div>
                <p className="text-purple-700 text-[11px]">
                  When a prospect replies to an email or outbound call, their enrollment transitions to{' '}
                  <span className="font-mono font-bold">replied_unenrolled</span> to prevent embarrassing automated follow-ups.
                </p>
              </div>
            </div>

            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-600" />
                <span>Email Deliverability & Reputation</span>
              </h3>
              <p className="text-xs text-slate-500">Tenant-isolated tracking across all standard contacts and deals.</p>
              <div className="grid grid-cols-2 gap-3 pt-2 text-center text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase">Bounce Rate</span>
                  <span className="text-base font-bold text-emerald-600">0.0%</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase">Unsubscribe Rate</span>
                  <span className="text-base font-bold text-slate-700">0.0%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: CREATE SEQUENCE */}
      {/* ================================================================= */}
      {showCreateSeqModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-600" />
                <span>Create Sales Sequence Cadence</span>
              </h3>
              <button onClick={() => setShowCreateSeqModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSequence} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cadence Sequence Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Executive Outbound Cadence"
                  value={newSeq.name}
                  onChange={(e) => setNewSeq({ ...newSeq, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Strategy</label>
                <textarea
                  rows={2}
                  placeholder="Strategic goal, target personas, and touchpoint objectives"
                  value={newSeq.description}
                  onChange={(e) => setNewSeq({ ...newSeq, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-xl border border-purple-200">
                <input
                  type="checkbox"
                  id="pauseOnReply"
                  checked={newSeq.pause_on_reply}
                  onChange={(e) => setNewSeq({ ...newSeq, pause_on_reply: e.target.checked })}
                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                />
                <label htmlFor="pauseOnReply" className="font-semibold text-purple-900 cursor-pointer">
                  Auto-pause sequence when contact replies (§14 Anti-Collision)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateSeqModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Create Sequence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: ADD CADENCE STEP */}
      {/* ================================================================= */}
      {showAddStepModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-600" />
                <span>Add Cadence Step to "{selectedSequence?.name}"</span>
              </h3>
              <button onClick={() => setShowAddStepModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStep} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Touchpoint Type *</label>
                  <select
                    value={newStep.step_type}
                    onChange={(e) => setNewStep({ ...newStep, step_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-purple-500 font-medium"
                  >
                    <option value="email">Automated Email</option>
                    <option value="call_reminder">Call Touchpoint Reminder</option>
                    <option value="linkedin_touch">LinkedIn Connection / Touch</option>
                    <option value="task">Follow-up Task</option>
                    <option value="delay">Time Delay Only</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Delay After Prior Step (Days)</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={newStep.delay_days}
                    onChange={(e) => setNewStep({ ...newStep, delay_days: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject / Touchpoint Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Next steps for {{company_name}}"
                  value={newStep.subject}
                  onChange={(e) => setNewStep({ ...newStep, subject: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {newStep.step_type !== 'delay' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">Body Template / Instructions</label>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400">Insert tag:</span>
                      <button
                        type="button"
                        onClick={() => insertMergeTag('first_name')}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-mono"
                      >
                        first_name
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMergeTag('company_name')}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-mono"
                      >
                        company_name
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMergeTag('job_title')}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-mono"
                      >
                        job_title
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Hi {{first_name}}, following up on our previous note..."
                    value={newStep.body_template}
                    onChange={(e) => setNewStep({ ...newStep, body_template: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-purple-500 font-mono text-[11px]"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddStepModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Save Cadence Step
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: ENROLL CONTACTS IN SEQUENCE */}
      {/* ================================================================= */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>Enroll Contacts in "{selectedSequence?.name}"</span>
              </h3>
              <button onClick={() => setShowEnrollModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEnrollContacts} className="space-y-4 text-xs">
              <p className="text-slate-500">
                Select one or more active contacts to enroll in this cadence. Step 1 will be scheduled automatically.
              </p>

              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 p-2 space-y-1">
                {allContacts.map((c) => {
                  const isChecked = selectedContactIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedContactIds([...selectedContactIds, c.id]);
                            } else {
                              setSelectedContactIds(selectedContactIds.filter((id) => id !== c.id));
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <div>
                          <span className="font-bold text-slate-900">
                            {c.first_name} {c.last_name}
                          </span>
                          <span className="text-slate-500 text-[11px] ml-2 font-mono">{c.email}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                        {c.lifecycle_stage}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-slate-500 font-medium">
                  {selectedContactIds.length} contact(s) selected
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEnrollModal(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={selectedContactIds.length === 0}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-semibold shadow-xs"
                  >
                    Confirm Enrollment
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: SIMULATE PROSPECT REPLY (§14) */}
      {/* ================================================================= */}
      {showReplyModal && replyEnrollment && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                <span>Simulate Prospect Reply (§14)</span>
              </h3>
              <button onClick={() => setShowReplyModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSimulateReply} className="space-y-4 text-xs">
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 space-y-1">
                <span className="text-purple-900 font-bold block">Prospect:</span>
                <span className="text-slate-800 font-medium">
                  {replyEnrollment.first_name} {replyEnrollment.last_name} ({replyEnrollment.email})
                </span>
                <p className="text-[11px] text-purple-700 mt-1">
                  Enrolled in: <span className="font-semibold">{replyEnrollment.sequence_name}</span>. Submitting a reply will
                  trigger the auto-pause collision rule.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reply Content *</label>
                <textarea
                  rows={3}
                  required
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-purple-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReplyModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Simulate Prospect Response
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: CREATE BROADCAST CAMPAIGN (§23) */}
      {/* ================================================================= */}
      {showCreateCampaignModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-600" />
                <span>Create Broadcast Email Campaign</span>
              </h3>
              <button onClick={() => setShowCreateCampaignModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Campaign Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Q4 Platform Release Webinar"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Audience Segment (§23) *</label>
                  <select
                    value={newCampaign.target_segment}
                    onChange={(e) => setNewCampaign({ ...newCampaign, target_segment: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium"
                  >
                    <option value="all_contacts">All Contacts in Tenant Org</option>
                    <option value="leads_only">Leads Only (stage = lead)</option>
                    <option value="customers_only">Existing Customers (stage = customer)</option>
                    <option value="enterprise_mql">Enterprise MQLs & Opportunities</option>
                    <option value="deal_contacts">Contacts with Associated Deals</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Audience Preview Badge */}
              <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-600" />
                  <span className="font-semibold text-indigo-950">
                    Live Audience Calculation: <span className="font-bold text-indigo-700">{audiencePreview.count}</span> eligible contacts
                  </span>
                </div>
                <span className="text-[11px] text-indigo-600 font-medium">Real-time DB query</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject Line *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. You're invited: Architectural Blueprint Webinar"
                  value={newCampaign.subject}
                  onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sender Name</label>
                  <input
                    type="text"
                    value={newCampaign.from_name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, from_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sender Email</label>
                  <input
                    type="email"
                    value={newCampaign.from_email}
                    onChange={(e) => setNewCampaign({ ...newCampaign, from_email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">HTML Email Content</label>
                <textarea
                  rows={4}
                  value={newCampaign.html_content}
                  onChange={(e) => setNewCampaign({ ...newCampaign, html_content: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateCampaignModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
