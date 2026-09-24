import React, { useState, useEffect } from 'react';
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getEmailMessages,
  sendEmailMessage,
  getEmailTemplates,
  createEmailTemplate,
  getPhoneCalls,
  logPhoneCall,
  getContacts,
  getDeals,
} from '../services/api';
import {
  CheckSquare,
  Square,
  Clock,
  Calendar,
  AlertCircle,
  Plus,
  Mail,
  Phone,
  PhoneCall,
  Send,
  FileText,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  X,
  Loader2,
  ArrowUpRight,
  User,
  Briefcase,
  Building2,
  Tag
} from 'lucide-react';

export default function ActivitiesTasksView() {
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'comms' | 'templates'
  const [tasks, setTasks] = useState([]);
  const [emails, setEmails] = useState([]);
  const [calls, setCalls] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [taskFilterStatus, setTaskFilterStatus] = useState('all');
  const [taskFilterPriority, setTaskFilterPriority] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Entities for dropdowns
  const [contactsList, setContactsList] = useState([]);
  const [dealsList, setDealsList] = useState([]);

  // Form states
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    recordType: 'contact',
    recordId: '',
    priority: 'medium',
    dueDate: '',
  });

  const [newEmail, setNewEmail] = useState({
    toEmail: '',
    subject: '',
    bodyHtml: '',
    recordType: 'contact',
    recordId: '',
  });

  const [newCall, setNewCall] = useState({
    toNumber: '',
    direction: 'outbound',
    durationSeconds: 120,
    status: 'completed',
    notes: '',
    recordType: 'contact',
    recordId: '',
  });

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    subject: '',
    category: 'sales',
    bodyTemplate: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [tRes, eRes, cRes, tplRes, contRes, dealRes] = await Promise.all([
        getTasks({ status: taskFilterStatus !== 'all' ? taskFilterStatus : undefined }),
        getEmailMessages({ limit: 25 }),
        getPhoneCalls({ limit: 25 }),
        getEmailTemplates(),
        getContacts({ limit: 30 }),
        getDeals({ limit: 30 }),
      ]);

      if (tRes.success) setTasks(tRes.data.tasks || []);
      if (eRes.success) setEmails(eRes.data || []);
      if (cRes.success) setCalls(cRes.data || []);
      if (tplRes.success) setTemplates(tplRes.data || []);
      if (contRes.success) setContactsList(contRes.data.contacts || []);
      if (dealRes.success) setDealsList(dealRes.data.deals || []);
    } catch (err) {
      console.error('Failed to load communication and tasks data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [taskFilterStatus]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Toggle Task Completion
  const handleToggleTaskStatus = async (task) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const res = await updateTask(task.id, { status: nextStatus });
      if (res.success) {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
        );
      }
    } catch (e) {
      alert('Error updating task: ' + e.message);
    }
  };

  // Delete Task
  const handleDeleteTask = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      alert('Error deleting task: ' + e.message);
    }
  };

  // Create Task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    setSubmitting(true);
    try {
      const res = await createTask(newTask);
      if (res.success) {
        setShowTaskModal(false);
        setNewTask({ title: '', description: '', recordType: 'contact', recordId: '', priority: 'medium', dueDate: '' });
        fetchData();
      }
    } catch (err) {
      alert('Failed to create task: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // Send Email
  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!newEmail.toEmail || !newEmail.subject || !newEmail.bodyHtml) return;
    setSubmitting(true);
    try {
      const res = await sendEmailMessage(newEmail);
      if (res.success) {
        setShowEmailModal(false);
        setNewEmail({ toEmail: '', subject: '', bodyHtml: '', recordType: 'contact', recordId: '' });
        fetchData();
      }
    } catch (err) {
      alert('Failed to send email: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // Log Call
  const handleLogCall = async (e) => {
    e.preventDefault();
    if (!newCall.toNumber) return;
    setSubmitting(true);
    try {
      const res = await logPhoneCall(newCall);
      if (res.success) {
        setShowCallModal(false);
        setNewCall({ toNumber: '', direction: 'outbound', durationSeconds: 120, status: 'completed', notes: '', recordType: 'contact', recordId: '' });
        fetchData();
      }
    } catch (err) {
      alert('Failed to log call: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // Create Template
  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    if (!newTemplate.name || !newTemplate.subject || !newTemplate.bodyTemplate) return;
    setSubmitting(true);
    try {
      const res = await createEmailTemplate(newTemplate);
      if (res.success) {
        setShowTemplateModal(false);
        setNewTemplate({ name: '', subject: '', category: 'sales', bodyTemplate: '' });
        fetchData();
      }
    } catch (err) {
      alert('Failed to create template: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (taskFilterPriority !== 'all' && t.priority !== taskFilterPriority) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
    }
    return true;
  });

  const getPriorityBadge = (p) => {
    switch (p) {
      case 'urgent': return 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'high': return 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'medium': return 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5">
              <CheckSquare className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>Spec §10, §12, §13, §23</span>
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-400">Communication & Action Center</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
            Activities, Tasks & Communications Hub
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Unified action queues, omnichannel communications (Email, Telephony, In-App Alerts) seamlessly normalized into the central activity timeline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
          </button>
          <button
            onClick={() => setShowCallModal(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs shadow-2xs transition-colors"
          >
            <PhoneCall className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Log Call</span>
          </button>
          <button
            onClick={() => setShowEmailModal(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs shadow-2xs transition-colors"
          >
            <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Compose Email</span>
          </button>
          <button
            onClick={() => setShowTaskModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm hover:shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'tasks'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Tasks & Reminders</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 dark:bg-slate-800">
              {tasks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('comms')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'comms'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Email & Telephony Stream</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 dark:bg-slate-800">
              {emails.length + calls.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'templates'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Email Templates</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 dark:bg-slate-800">
              {templates.length}
            </span>
          </button>
        </div>

        {/* Task Filters */}
        {activeTab === 'tasks' && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <select
              value={taskFilterStatus}
              onChange={(e) => setTaskFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            <select
              value={taskFilterPriority}
              onChange={(e) => setTaskFilterPriority(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: TASKS */}
      {activeTab === 'tasks' && (
        <div>
          {loading ? (
            <div className="p-12 text-center text-slate-400 dark:text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm">Loading action queue...</span>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
              <CheckSquare className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">No tasks in this view</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">All clear or no tasks match your filters.</p>
              <button
                onClick={() => setShowTaskModal(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
              >
                Create First Task
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTasks.map((t) => {
                const isDone = t.status === 'completed';
                return (
                  <div
                    key={t.id}
                    className={`p-4 flex items-start justify-between gap-4 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                      isDone ? 'bg-slate-50/40 dark:bg-slate-950/40 opacity-75' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleTaskStatus(t)}
                        className="mt-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        title={isDone ? 'Mark as pending' : 'Mark as completed'}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950/40" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400" />
                        )}
                      </button>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-bold text-slate-900 dark:text-white ${isDone ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
                            {t.title}
                          </h4>
                          <span className={`px-2 py-0.2 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getPriorityBadge(t.priority)}`}>
                            {t.priority}
                          </span>
                          <span className={`px-2 py-0.2 rounded-md text-[10px] font-semibold capitalize ${
                            t.status === 'completed'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}>
                            {t.status.replace('_', ' ')}
                          </span>
                        </div>

                        {t.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                            {t.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500 pt-1">
                          {t.due_date && (
                            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                              <span>Due: {new Date(t.due_date).toLocaleDateString()}</span>
                            </span>
                          )}
                          {t.assigned_to_name && (
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              <span>Assigned to {t.assigned_to_name}</span>
                            </span>
                          )}
                          {t.record_type && (
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-semibold text-[9px]">
                              Attached to {t.record_type} #{t.record_id}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteTask(t.id)}
                      className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                      title="Delete Task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COMMS STREAM */}
      {activeTab === 'comms' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sent Emails Column */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Email Messages (§13)</h3>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">Outbound tracking & status</span>
                </div>
              </div>
              <button
                onClick={() => setShowEmailModal(true)}
                className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Compose</span>
              </button>
            </div>

            <div className="space-y-3">
              {emails.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">No emails sent yet.</p>
              ) : (
                emails.map((m) => (
                  <div key={m.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{m.subject}</span>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded">
                        {m.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">To: {m.to_email}</p>
                    <p className="text-slate-600 dark:text-slate-300 line-clamp-2 italic">{m.body_text || 'HTML Message'}</p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block pt-1">
                      Sent on {new Date(m.sent_at).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Calls Log Column */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Phone Calls (§23 Telephony)</h3>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">Normalized call interactions</span>
                </div>
              </div>
              <button
                onClick={() => setShowCallModal(true)}
                className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Log Call</span>
              </button>
            </div>

            <div className="space-y-3">
              {calls.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">No calls logged yet.</p>
              ) : (
                calls.map((c) => (
                  <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {c.direction === 'inbound' ? '📥 Inbound Call' : '📤 Outbound Call'}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        {Math.floor(c.duration_seconds / 60)}m {c.duration_seconds % 60}s
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Contact: {c.to_number}</p>
                    {c.notes && <p className="text-slate-600 dark:text-slate-300 text-xs">{c.notes}</p>}
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block pt-1">
                      Logged by {c.caller_name || 'Admin'} on {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EMAIL TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowTemplateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>New Template</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.map((tpl) => (
              <div key={tpl.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                      {tpl.category}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">ID #{tpl.id}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{tpl.name}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1">
                    Subject: {tpl.subject}
                  </p>
                  <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 font-mono line-clamp-4">
                    {tpl.body_template.replace(/<[^>]+>/g, '')}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                  <span>By {tpl.creator_name || 'Admin'}</span>
                  <button
                    onClick={() => {
                      setNewEmail((prev) => ({
                        ...prev,
                        subject: tpl.subject,
                        bodyHtml: tpl.body_template,
                      }));
                      setShowEmailModal(true);
                    }}
                    className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>Use Template</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: NEW TASK */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Task & Reminder</h3>
              </div>
              <button onClick={() => setShowTaskModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Follow up on proposal contract"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">Description</label>
                <textarea
                  rows="2"
                  placeholder="Details, checklist items, or deliverables..."
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">Attach to Record</label>
                  <select
                    value={newTask.recordType}
                    onChange={(e) => setNewTask({ ...newTask, recordType: e.target.value, recordId: '' })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="contact">Contact</option>
                    <option value="deal">Deal</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">Select Record</label>
                  <select
                    value={newTask.recordId}
                    onChange={(e) => setNewTask({ ...newTask, recordId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="">-- None / General --</option>
                    {newTask.recordType === 'contact'
                      ? contactsList.map((c) => (
                          <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                        ))
                      : dealsList.map((d) => (
                          <option key={d.id} value={d.title ? d.title : d.id}>{d.title}</option>
                        ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-xs flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Save Task</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: COMPOSE EMAIL */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Compose Email Message</h3>
              </div>
              <button onClick={() => setShowEmailModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">Recipient Email *</label>
                <input
                  type="email"
                  required
                  placeholder="client@enterprise.com"
                  value={newEmail.toEmail}
                  onChange={(e) => setNewEmail({ ...newEmail, toEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">Subject Line *</label>
                <input
                  type="text"
                  required
                  placeholder="Platform Expansion Architecture Review"
                  value={newEmail.subject}
                  onChange={(e) => setNewEmail({ ...newEmail, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">Message Content (HTML) *</label>
                <textarea
                  rows="5"
                  required
                  placeholder="<p>Hi Sarah,</p><p>Here are the details...</p>"
                  value={newEmail.bodyHtml}
                  onChange={(e) => setNewEmail({ ...newEmail, bodyHtml: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-mono placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Send & Log</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: LOG CALL */}
      {showCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Log Phone Interaction</h3>
              </div>
              <button onClick={() => setShowCallModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogCall} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+1 (555) 012-3456"
                    value={newCall.toNumber}
                    onChange={(e) => setNewCall({ ...newCall, toNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">Direction</label>
                  <select
                    value={newCall.direction}
                    onChange={(e) => setNewCall({ ...newCall, direction: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="outbound">Outbound Call</option>
                    <option value="inbound">Inbound Call</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">Duration (Seconds)</label>
                  <input
                    type="number"
                    value={newCall.durationSeconds}
                    onChange={(e) => setNewCall({ ...newCall, durationSeconds: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">Outcome</label>
                  <select
                    value={newCall.status}
                    onChange={(e) => setNewCall({ ...newCall, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="completed">Completed</option>
                    <option value="missed">Missed / Voicemail</option>
                    <option value="busy">Busy</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">Conversation Notes</label>
                <textarea
                  rows="3"
                  placeholder="Summary of discussion, objections, next steps..."
                  value={newCall.notes}
                  onChange={(e) => setNewCall({ ...newCall, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCallModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-xs flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PhoneCall className="w-3.5 h-3.5" />}
                  <span>Save Call</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: NEW TEMPLATE */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">New Email Template</h3>
              </div>
              <button onClick={() => setShowTemplateModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">Template Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Contract Signoff Follow-up"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">Category</label>
                  <select
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="sales">Sales</option>
                    <option value="onboarding">Onboarding</option>
                    <option value="follow_up">Follow Up</option>
                    <option value="support">Support</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">Subject Line *</label>
                  <input
                    type="text"
                    required
                    placeholder="Next steps for {{company_name}}"
                    value={newTemplate.subject}
                    onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">HTML Body Content *</label>
                <textarea
                  rows="4"
                  required
                  placeholder="<p>Hi {{first_name}},</p><p>...</p>"
                  value={newTemplate.bodyTemplate}
                  onChange={(e) => setNewTemplate({ ...newTemplate, bodyTemplate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-mono placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-xs flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Save Template</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
