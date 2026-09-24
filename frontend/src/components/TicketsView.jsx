import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  Headphones,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Star,
  Search,
  Filter,
  Plus,
  Send,
  Lock,
  MessageSquare,
  Mail,
  Globe,
  Phone,
  BookOpen,
  Zap,
  ShieldAlert,
  ChevronRight,
  X,
  ExternalLink,
  ThumbsUp,
  User,
  Building2,
  Tag,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Sliders,
  Check,
  Calendar
} from 'lucide-react';
import {
  getTickets,
  getTicketById,
  createTicket,
  updateTicketStatus,
  addTicketMessage,
  submitTicketCsat,
  getSupportMetrics,
  getSlaPolicies,
  getCannedResponses,
  createCannedResponse,
  getKbArticles,
  getKbArticleById,
  markKbArticleHelpful,
  getContacts,
  getCompanies
} from '../services/api';

export default function TicketsView() {
  const [tickets, setTickets] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);

  // Filters & Tabs
  const [statusTab, setStatusTab] = useState('open_all'); // 'all', 'open_all', 'pending_customer', 'resolved'
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');

  // Modals & Panels
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showKbModal, setShowKbModal] = useState(false);
  const [showCannedModal, setShowCannedModal] = useState(false);
  const [showSlaModal, setShowSlaModal] = useState(false);

  // SLA & Canned Data
  const [slaPolicies, setSlaPolicies] = useState([]);
  const [cannedResponses, setCannedResponses] = useState([]);
  const [kbArticles, setKbArticles] = useState([]);
  const [activeKbArticle, setActiveKbArticle] = useState(null);

  // New Message Form state
  const [replyText, setReplyText] = useState('');
  const [messageType, setMessageType] = useState('public_reply'); // 'public_reply' | 'internal_note'
  const [csatRating, setCsatRating] = useState(5);
  const [csatComment, setCsatComment] = useState('');

  // New Ticket Form state
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    priority: 'medium',
    category: 'Technical Issue',
    channel: 'web_portal',
    contactId: '',
    companyId: '',
    tags: []
  });

  // Load Initial Support Data
  useEffect(() => {
    loadAllData();
  }, [statusTab, priorityFilter, channelFilter]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [ticketsRes, metricsRes, slaRes, cannedRes, kbRes] = await Promise.all([
        getTickets({
          status: statusTab,
          priority: priorityFilter !== 'all' ? priorityFilter : undefined,
          channel: channelFilter !== 'all' ? channelFilter : undefined,
          search: searchQuery || undefined
        }),
        getSupportMetrics(),
        getSlaPolicies(),
        getCannedResponses(),
        getKbArticles()
      ]);

      if (ticketsRes.success) setTickets(ticketsRes.data || []);
      if (metricsRes.success) setMetrics(metricsRes.data || null);
      if (slaRes.success) setSlaPolicies(slaRes.data || []);
      if (cannedRes.success) setCannedResponses(cannedRes.data || []);
      if (kbRes.success) setKbArticles(kbRes.data || []);

      // Pre-load contacts & companies for new ticket dropdowns
      const [contRes, compRes] = await Promise.all([
        getContacts({ limit: 100 }),
        getCompanies({ limit: 100 })
      ]);
      if (contRes.data) setContacts(contRes.data);
      if (compRes.data) setCompanies(compRes.data);
    } catch (err) {
      console.error('Failed to load support data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTicket = async (ticketId) => {
    try {
      setActionLoading(true);
      const res = await getTicketById(ticketId);
      if (res.success) {
        setSelectedTicket(res.data);
        setReplyText('');
        setMessageType('public_reply');
      }
    } catch (err) {
      console.error('Failed to fetch ticket details:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedTicket) return;
    try {
      setActionLoading(true);
      const res = await updateTicketStatus(selectedTicket.id, newStatus);
      if (res.success) {
        setSelectedTicket(res.data);
        await loadAllData();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = async (customNextStatus = null) => {
    if (!selectedTicket || !replyText.trim()) return;
    try {
      setActionLoading(true);
      const payload = {
        bodyText: replyText.trim(),
        messageType,
        channel: selectedTicket.channel,
        newStatus: customNextStatus || undefined
      };
      const res = await addTicketMessage(selectedTicket.id, payload);
      if (res.success) {
        setSelectedTicket(res.data);
        setReplyText('');
        await loadAllData();
      }
    } catch (err) {
      console.error('Failed to dispatch message:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleInsertCanned = (snippetText) => {
    setReplyText((prev) => (prev ? `${prev}\n\n${snippetText}` : snippetText));
  };

  const handleSubmitCsat = async () => {
    if (!selectedTicket) return;
    try {
      setActionLoading(true);
      const res = await submitTicketCsat(selectedTicket.id, {
        csatScore: csatRating,
        csatComment: csatComment.trim()
      });
      if (res.success) {
        setSelectedTicket(res.data);
        setCsatComment('');
        await loadAllData();
      }
    } catch (err) {
      console.error('Failed to submit CSAT:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateTicketSubmit = async (e) => {
    e.preventDefault();
    if (!newTicket.subject.trim() || !newTicket.description.trim()) return;
    try {
      setActionLoading(true);
      const payload = {
        ...newTicket,
        contactId: newTicket.contactId ? parseInt(newTicket.contactId) : null,
        companyId: newTicket.companyId ? parseInt(newTicket.companyId) : null,
        tags: newTicket.tags
      };
      const res = await createTicket(payload);
      if (res.success) {
        setShowCreateModal(false);
        setNewTicket({
          subject: '',
          description: '',
          priority: 'medium',
          category: 'Technical Issue',
          channel: 'web_portal',
          contactId: '',
          companyId: '',
          tags: []
        });
        await loadAllData();
        if (res.data?.id) {
          handleSelectTicket(res.data.id);
        }
      }
    } catch (err) {
      console.error('Failed to create ticket:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewKbArticle = async (articleId) => {
    try {
      const res = await getKbArticleById(articleId);
      if (res.success) {
        setActiveKbArticle(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch KB article:', err);
    }
  };

  const handleHelpfulClick = async (articleId) => {
    try {
      const res = await markKbArticleHelpful(articleId);
      if (res.success) {
        setActiveKbArticle(res.data);
        const kbRes = await getKbArticles();
        if (kbRes.success) setKbArticles(kbRes.data);
      }
    } catch (err) {
      console.error('Failed to mark helpful:', err);
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800"><AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400 animate-pulse" /> Urgent</span>;
      case 'high':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">High</span>;
      case 'medium':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">Medium</span>;
      case 'low':
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">Low</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'new':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300">New</span>;
      case 'open':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">Open</span>;
      case 'pending_customer':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">Pending Customer</span>;
      case 'on_hold':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">On Hold</span>;
      case 'resolved':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">Resolved</span>;
      case 'closed':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">Closed</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{status}</span>;
    }
  };

  const getSlaBadge = (slaStatus) => {
    switch (slaStatus) {
      case 'within_sla':
        return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Within SLA</span>;
      case 'approaching_breach':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded"><Clock className="w-3.5 h-3.5 animate-spin" /> Approaching Breach</span>;
      case 'breached':
        return <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded"><ShieldAlert className="w-3.5 h-3.5" /> SLA Breached</span>;
      default:
        return null;
    }
  };

  const getChannelIcon = (channel) => {
    switch (channel) {
      case 'email':
        return <Mail className="w-3.5 h-3.5 text-blue-500" title="Email" />;
      case 'chat':
        return <MessageSquare className="w-3.5 h-3.5 text-emerald-500" title="Live Chat" />;
      case 'phone':
        return <Phone className="w-3.5 h-3.5 text-purple-500" title="Phone Call" />;
      case 'web_portal':
      default:
        return <Globe className="w-3.5 h-3.5 text-indigo-500" title="Customer Portal" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden transition-colors">
      {/* Top Header & Support Action Ribbon */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Headphones className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Omnichannel Support & SLA Engine</h1>
            <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 rounded-full">Spec §23, §26</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time multi-channel support tickets, SLA policy timers, customer conversation thread, and knowledge base.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => setShowKbModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Knowledge Base ({kbArticles.length})
          </button>
          <button
            onClick={() => setShowCannedModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Canned Replies
          </button>
          <button
            onClick={() => setShowSlaModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            SLA Policies ({slaPolicies.length})
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            New Ticket
          </button>
        </div>
      </div>

      {/* Operational KPI Ribbon (§26) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 px-6 py-3 bg-slate-100 dark:bg-transparent border-b border-slate-200 dark:border-slate-800">
        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3 transition-colors">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Queue</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">{metrics?.openTickets ?? 0} Tickets</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3 transition-colors">
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-lg">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Urgent Backlog</div>
            <div className="text-lg font-bold text-rose-600 dark:text-rose-400">{metrics?.urgentBacklog ?? 0} Urgent</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3 transition-colors">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">SLA Compliance</div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{metrics?.slaCompliancePercent ?? 100}%</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3 transition-colors">
          <div className="p-2.5 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Avg Resolution</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">{metrics?.avgResolutionHours ?? '1.2'}h</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3 col-span-2 md:col-span-1 transition-colors">
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 text-amber-500 rounded-lg">
            <Star className="w-5 h-5 fill-amber-400" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">CSAT Score</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">{metrics?.avgCsatScore ?? '5.0'} / 5.0</div>
          </div>
        </div>
      </div>

      {/* Main Content Area: Left Tickets List, Right Detail & Omnichannel Conversation */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Ticket Filter Bar & Table List */}
        <div className={`flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden border-r border-slate-200 dark:border-slate-800 transition-colors ${selectedTicket ? 'hidden lg:flex lg:w-1/2 xl:w-5/12' : 'w-full'}`}>
          {/* Filter Toolbar */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
            {/* Status Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 text-xs font-medium">
              {[
                { id: 'open_all', label: 'Open Queue' },
                { id: 'pending_customer', label: 'Pending Customer' },
                { id: 'resolved', label: 'Resolved / Closed' },
                { id: 'all', label: 'All Tickets' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusTab(tab.id)}
                  className={`pb-2 transition relative ${statusTab === tab.id ? 'text-indigo-600 dark:text-indigo-400 font-semibold border-b-2 border-indigo-600 dark:border-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search and Dropdown Filters */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Search ticket #, subject, client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadAllData()}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                <option value="all">All Channels</option>
                <option value="email">Email</option>
                <option value="web_portal">Portal</option>
                <option value="chat">Chat</option>
                <option value="phone">Phone</option>
              </select>

              <button
                onClick={loadAllData}
                title="Refresh Tickets"
                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Tickets List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                Loading support tickets...
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-12 text-center text-slate-400 dark:text-slate-500">
                <LifeBuoy className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No support tickets found</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try adjusting your filters or open a new ticket.</p>
              </div>
            ) : (
              tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => handleSelectTicket(ticket.id)}
                  className={`p-4 cursor-pointer transition flex flex-col gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${selectedTicket?.id === ticket.id ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-l-4 border-indigo-600 dark:border-indigo-500' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">{ticket.ticket_number}</span>
                      <span className="p-1 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300">
                        {getChannelIcon(ticket.channel)}
                      </span>
                      {getStatusBadge(ticket.status)}
                    </div>
                    {getPriorityBadge(ticket.priority)}
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {ticket.subject}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                    {ticket.description}
                  </p>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <div className="flex items-center gap-2 truncate">
                      {ticket.company_name ? (
                        <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1 truncate">
                          <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                          {ticket.company_name}
                        </span>
                      ) : (
                        <span>{ticket.contact_name || ticket.contact_email || 'Unassigned Customer'}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {getSlaBadge(ticket.sla_status)}
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {ticket.message_count || 1}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel: Selected Ticket Details & Omnichannel Conversation Thread */}
        {selectedTicket ? (
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden transition-colors">
            {/* Drawer Header */}
            <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="lg:hidden p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                      {selectedTicket.ticket_number}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 capitalize">
                      {getChannelIcon(selectedTicket.channel)} {selectedTicket.channel.replace('_', ' ')}
                    </span>
                    {getPriorityBadge(selectedTicket.priority)}
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {selectedTicket.subject}
                  </h2>
                </div>
              </div>

              {/* Status Switcher Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={selectedTicket.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-xs focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="new">New</option>
                  <option value="open">Open</option>
                  <option value="pending_customer">Pending Customer</option>
                  <option value="on_hold">On Hold</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="hidden lg:flex p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sub-header: Requester Context & SLA Countdown Banner */}
            <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center flex-wrap gap-4 text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <strong>Requester:</strong> {selectedTicket.contact_name || 'Sarah Connor'} ({selectedTicket.contact_email || 'customer@client.com'})
                </span>
                {selectedTicket.company_name && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <strong>Account:</strong> {selectedTicket.company_name}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <strong>Category:</strong> {selectedTicket.category}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 font-medium">
                  {getSlaBadge(selectedTicket.sla_status)}
                </span>
                {selectedTicket.sla_policy_name && (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    Policy: {selectedTicket.sla_policy_name}
                  </span>
                )}
              </div>
            </div>

            {/* Conversation Messages Thread */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 dark:bg-slate-950/50">
              {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                selectedTicket.messages.map((msg) => {
                  const isInternal = msg.message_type === 'internal_note';
                  const isCustomer = msg.sender_type === 'customer';

                  return (
                    <div
                      key={msg.id}
                      className={`rounded-xl border p-4 shadow-2xs transition ${
                        isInternal
                          ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
                          : isCustomer
                          ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                          : 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/60 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-inherit mb-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              isInternal
                                ? 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200'
                                : isCustomer
                                ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                                : 'bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200'
                            }`}
                          >
                            {msg.sender_name?.charAt(0) || 'U'}
                          </span>
                          <span className="text-xs font-semibold text-slate-900 dark:text-white">
                            {msg.sender_name}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {isInternal ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                                <Lock className="w-3 h-3" /> Internal Agent Note
                              </span>
                            ) : isCustomer ? (
                              <span className="text-slate-500 dark:text-slate-400 font-medium">Customer Inquiry</span>
                            ) : (
                              <span className="text-indigo-600 dark:text-indigo-400 font-medium">Support Agent Reply</span>
                            )}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </div>

                      <div className="text-xs leading-relaxed whitespace-pre-wrap">
                        {msg.body_text}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                  {selectedTicket.description}
                </div>
              )}

              {/* CSAT Feedback Banner (If Ticket Resolved/Closed) */}
              {['resolved', 'closed'].includes(selectedTicket.status) && (
                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-lg">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                          Issue Resolved & Ticket Verified
                        </h4>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                          Resolved at: {selectedTicket.resolved_at ? new Date(selectedTicket.resolved_at).toLocaleString() : 'Just now'}
                        </p>
                      </div>
                    </div>

                    {/* Star Rating Display or Interactive CSAT Input */}
                    {selectedTicket.csat_score ? (
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${star <= selectedTicket.csat_score ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
                          />
                        ))}
                        <span className="ml-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                          {selectedTicket.csat_score}.0 / 5.0
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Simulate CSAT:</span>
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setCsatRating(star)}
                              className="p-0.5 hover:scale-110 transition"
                            >
                              <Star
                                className={`w-4 h-4 ${star <= csatRating ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
                              />
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={handleSubmitCsat}
                          className="px-2 py-1 text-xs font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700"
                        >
                          Submit CSAT
                        </button>
                      </div>
                    )}
                  </div>

                  {selectedTicket.csat_comment && (
                    <div className="mt-2 text-xs text-slate-700 dark:text-slate-300 italic border-t border-emerald-200/60 dark:border-emerald-800/60 pt-2">
                      "{selectedTicket.csat_comment}"
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Omnichannel Reply Composer Box */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-colors">
              {/* Type Switcher: Public Reply vs Internal Note */}
              <div className="flex items-center justify-between pb-2 mb-2">
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => setMessageType('public_reply')}
                    className={`px-3 py-1 rounded-md font-semibold transition ${messageType === 'public_reply' ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                  >
                    Public Reply (to Customer)
                  </button>
                  <button
                    onClick={() => setMessageType('internal_note')}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-md font-semibold transition ${messageType === 'internal_note' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                  >
                    <Lock className="w-3 h-3" /> Internal Agent Note
                  </button>
                </div>

                {/* Canned Response Dropdown */}
                {cannedResponses.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Quick Snippets:</span>
                    <select
                      onChange={(e) => {
                        if (e.target.value) handleInsertCanned(e.target.value);
                      }}
                      className="text-xs px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      <option value="">Insert template...</option>
                      {cannedResponses.map((cr) => (
                        <option key={cr.id} value={cr.body_text}>
                          {cr.shortcut} - {cr.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Text Area */}
              <textarea
                rows={3}
                placeholder={
                  messageType === 'internal_note'
                    ? 'Write private note for your engineering/support colleagues (invisible to client)...'
                    : 'Compose reply to send to client via email/portal...'
                }
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className={`w-full p-2.5 text-xs rounded-lg border focus:outline-hidden focus:ring-2 transition ${
                  messageType === 'internal_note'
                    ? 'border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/20 text-slate-900 dark:text-white placeholder-amber-700/50 dark:placeholder-amber-400/50 focus:ring-amber-500'
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-indigo-500'
                }`}
              />

              {/* Dispatch Action Buttons */}
              <div className="flex items-center justify-between pt-2 mt-1">
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  {messageType === 'internal_note' ? '🔒 Team-only audit log' : '📧 Client will be notified immediately'}
                </span>

                <div className="flex items-center gap-2">
                  {messageType === 'public_reply' ? (
                    <>
                      <button
                        disabled={actionLoading || !replyText.trim()}
                        onClick={() => handleSendMessage('pending_customer')}
                        className="px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/60 disabled:opacity-50 transition"
                      >
                        Reply & Set Pending
                      </button>
                      <button
                        disabled={actionLoading || !replyText.trim()}
                        onClick={() => handleSendMessage('resolved')}
                        className="px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/60 disabled:opacity-50 transition"
                      >
                        Reply & Resolve
                      </button>
                      <button
                        disabled={actionLoading || !replyText.trim()}
                        onClick={() => handleSendMessage()}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 shadow-sm transition"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Send Reply
                      </button>
                    </>
                  ) : (
                    <button
                      disabled={actionLoading || !replyText.trim()}
                      onClick={() => handleSendMessage()}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50 shadow-sm transition"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Save Internal Note
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center p-12 bg-slate-50 dark:bg-slate-950 text-center transition-colors">
            <div>
              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
                <LifeBuoy className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Support Workspace Ready</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                Select a support ticket on the left to inspect conversation history, post replies, add internal notes, and monitor SLA countdown timers.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* CREATE TICKET MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 rounded-lg">
                  <LifeBuoy className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Open Support Ticket</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicketSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ticket Subject / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SSO SAML 2.0 Auth Error or Invoice Query"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Priority & SLA Level
                  </label>
                  <select
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="urgent">Urgent (15m response / 2h resolution)</option>
                    <option value="high">High (1h response / 8h resolution)</option>
                    <option value="medium">Medium (4h response / 24h resolution)</option>
                    <option value="low">Low (12h response / 72h resolution)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Channel Origin
                  </label>
                  <select
                    value={newTicket.channel}
                    onChange={(e) => setNewTicket({ ...newTicket, channel: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="web_portal">Customer Web Portal</option>
                    <option value="email">Inbound Email</option>
                    <option value="chat">Live Chat</option>
                    <option value="phone">Phone / Telephony</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Requester Contact
                  </label>
                  <select
                    value={newTicket.contactId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      const matched = contacts.find((c) => String(c.id) === String(cid));
                      setNewTicket({
                        ...newTicket,
                        contactId: cid,
                        companyId: matched?.company_id ? String(matched.company_id) : newTicket.companyId
                      });
                    }}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="">Select contact...</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.first_name} {c.last_name} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Customer Account (Company)
                  </label>
                  <select
                    value={newTicket.companyId}
                    onChange={(e) => setNewTicket({ ...newTicket, companyId: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="">Select company...</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.domain})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={newTicket.category}
                  onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Technical Issue">Technical Issue</option>
                  <option value="Security & Identity">Security & Identity (SAML / SSO)</option>
                  <option value="Billing & Invoicing">Billing & Invoicing</option>
                  <option value="Integrations & APIs">Integrations & APIs</option>
                  <option value="Feature Request">Feature Request</option>
                  <option value="General Support">General Support</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Issue Description & Initial Notes *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detail the customer request, reproduction steps, or error logs..."
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  className="w-full text-xs p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {actionLoading ? 'Creating...' : 'Create Ticket & Start SLA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KNOWLEDGE BASE MODAL */}
      {showKbModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 rounded-lg">
                  <BookOpen className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Knowledge Base & AI Grounding</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Verified solution guides and documentation for agents and customer self-service.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowKbModal(false);
                  setActiveKbArticle(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Articles Directory */}
              <div className="w-2/5 border-r border-slate-200 dark:border-slate-800 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-2">
                {kbArticles.map((art) => (
                  <div
                    key={art.id}
                    onClick={() => handleViewKbArticle(art.id)}
                    className={`p-3 rounded-lg cursor-pointer transition ${activeKbArticle?.id === art.id ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
                  >
                    <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-100/60 dark:bg-indigo-950/80 px-1.5 py-0.5 rounded">
                      {art.category}
                    </span>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white mt-1 line-clamp-2">
                      {art.title}
                    </h4>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                      <span className="flex items-center gap-0.5">
                        <ThumbsUp className="w-3 h-3" /> {art.helpful_count} helpful
                      </span>
                      <span>{art.view_count} views</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Article Content Viewer */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950/50">
                {activeKbArticle ? (
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                        {activeKbArticle.category}
                      </span>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-2">
                        {activeKbArticle.title}
                      </h2>
                      <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500 mt-1 border-b border-slate-200 dark:border-slate-800 pb-3">
                        <span>Published: {new Date(activeKbArticle.created_at).toLocaleDateString()}</span>
                        <span>Views: {activeKbArticle.view_count}</span>
                        <span>Helpful Votes: {activeKbArticle.helpful_count}</span>
                      </div>
                    </div>

                    <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                      {activeKbArticle.content}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Was this article helpful?</span>
                      <button
                        onClick={() => handleHelpfulClick(activeKbArticle.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        Mark as Helpful (+1)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs">
                    Select an article on the left to read full guide.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CANNED RESPONSES MODAL */}
      {showCannedModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded-lg">
                  <Zap className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Canned Replies & Shortcuts</h3>
              </div>
              <button
                onClick={() => setShowCannedModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 space-y-3">
              {cannedResponses.map((cr) => (
                <div key={cr.id} className="pt-3 first:pt-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{cr.title}</span>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded">
                      {cr.shortcut}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    {cr.body_text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SLA POLICIES MODAL */}
      {showSlaModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-lg">
                  <Clock className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Service Level Agreements (SLA Matrix)</h3>
              </div>
              <button
                onClick={() => setShowSlaModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 divide-y divide-slate-100 dark:divide-slate-800 space-y-3">
              {slaPolicies.map((sp) => (
                <div key={sp.id} className="pt-3 first:pt-0 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{sp.name}</span>
                      {getPriorityBadge(sp.priority)}
                      {sp.is_default ? (
                        <span className="text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded">
                          Default
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sp.description}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      1st Response: {sp.first_response_time_minutes} min
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      Resolution: {(sp.resolution_time_minutes / 60).toFixed(0)} hours
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
