import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  MessageSquare,
  FileText,
  Mail,
  ShieldAlert,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Copy,
  Check,
  User,
  Building2,
  Briefcase,
  ChevronRight,
  Plus,
  Flame,
  Activity,
  Layers,
  HelpCircle,
  Trash2,
  CornerDownLeft,
  SlidersHorizontal,
  TrendingUp,
  Cpu
} from 'lucide-react';
import {
  askAiCopilot,
  getAiConversations,
  getAiMessages,
  summarizeRecordWithAi,
  draftEmailWithAi,
  getAiAgents,
  runAiAgent,
  getAiAgentRuns,
  getDeals,
  getContacts,
  getCompanies
} from '../services/api';

export default function AiCopilotView() {
  const [activeTab, setActiveTab] = useState('copilot'); // 'copilot' | 'summarizer' | 'drafter' | 'agents'
  
  // Copilot Chat State
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatBottomRef = useRef(null);

  // Smart Summarizer State
  const [entityType, setEntityType] = useState('deal');
  const [availableRecords, setAvailableRecords] = useState([]);
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState(null);
  const [summaryError, setSummaryError] = useState(null);

  // Email Drafter State
  const [drafterContactId, setDrafterContactId] = useState('');
  const [drafterContactsList, setDrafterContactsList] = useState([]);
  const [drafterForm, setDrafterForm] = useState({
    recipientName: '',
    recipientEmail: '',
    intent: 'Follow-up on product demonstration',
    tone: 'Professional & Consultative',
    contextDetails: 'Client was impressed with custom fields and automated workflows. Needs quote by Friday.'
  });
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftResult, setDraftResult] = useState(null);
  const [draftCopied, setDraftCopied] = useState(false);

  // Autonomous Agents State
  const [agents, setAgents] = useState([]);
  const [agentRuns, setAgentRuns] = useState([]);
  const [isRunningAgent, setIsRunningAgent] = useState({});
  const [lastAgentResult, setLastAgentResult] = useState(null);
  const [loadingAgents, setLoadingAgents] = useState(false);

  // Suggestion Prompts for Copilot
  const suggestionChips = [
    'Show me all deals over $50,000 in our pipeline',
    'What tasks are urgent or due today?',
    'List all companies in the Enterprise tier',
    'Which contacts belong to TechCorp Dynamics?',
    'Summarize our deal pipeline health and risk'
  ];

  // Load initial conversations & agents
  useEffect(() => {
    loadConversations();
    loadAgentsAndRuns();
  }, []);

  // Scroll to bottom on message updates
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isSending]);

  // Load records for summarizer when entityType changes
  useEffect(() => {
    loadEntityRecords(entityType);
  }, [entityType]);

  // Load contacts for email drafter
  useEffect(() => {
    getContacts({ limit: 50 })
      .then(res => {
        if (res.data) {
          setDrafterContactsList(res.data);
          if (res.data.length > 0 && !drafterForm.recipientEmail) {
            setDrafterContactId(res.data[0].id);
            setDrafterForm(prev => ({
              ...prev,
              recipientName: `${res.data[0].first_name} ${res.data[0].last_name}`,
              recipientEmail: res.data[0].email
            }));
          }
        }
      })
      .catch(err => console.error('Failed to load contacts for drafter:', err));
  }, []);

  const loadConversations = async () => {
    try {
      const res = await getAiConversations();
      if (res.data) {
        setConversations(res.data);
        if (res.data.length > 0 && !currentConversationId) {
          selectConversation(res.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const selectConversation = async (convId) => {
    setCurrentConversationId(convId);
    try {
      const res = await getAiMessages(convId);
      if (res.data) {
        setMessages(res.data);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([
      {
        id: 'welcome-0',
        sender: 'assistant',
        content: `👋 **Hello! I'm your Enterprise CRM Copilot.**\n\nI can analyze your deals, query contacts, inspect pipelines, evaluate task priorities, and generate instant summaries. Ask me anything about your CRM data or try one of the prompt suggestions below!`,
        tool_invocations: null,
        created_at: new Date().toISOString()
      }
    ]);
  };

  const loadAgentsAndRuns = async () => {
    setLoadingAgents(true);
    try {
      const [agentsRes, runsRes] = await Promise.all([
        getAiAgents().catch(() => ({ data: [] })),
        getAiAgentRuns().catch(() => ({ data: [] }))
      ]);
      setAgents(agentsRes.data || []);
      setAgentRuns(runsRes.data || []);
    } catch (err) {
      console.error('Failed to load agents/runs:', err);
    } finally {
      setLoadingAgents(false);
    }
  };

  const loadEntityRecords = async (type) => {
    try {
      setSelectedRecordId('');
      setSummaryResult(null);
      if (type === 'deal') {
        const res = await getDeals({ limit: 50 });
        if (res.data) {
          setAvailableRecords(res.data.map(d => ({ id: d.id, name: `${d.title} ($${Number(d.value).toLocaleString()})` })));
          if (res.data.length > 0) setSelectedRecordId(res.data[0].id);
        }
      } else if (type === 'contact') {
        const res = await getContacts({ limit: 50 });
        if (res.data) {
          setAvailableRecords(res.data.map(c => ({ id: c.id, name: `${c.first_name} ${c.last_name} (${c.email})` })));
          if (res.data.length > 0) setSelectedRecordId(res.data[0].id);
        }
      } else if (type === 'company') {
        const res = await getCompanies({ limit: 50 });
        if (res.data) {
          setAvailableRecords(res.data.map(co => ({ id: co.id, name: `${co.name} (${co.domain || 'No domain'})` })));
          if (res.data.length > 0) setSelectedRecordId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load entity records:', err);
    }
  };

  const handleSendMessage = async (customPrompt = null) => {
    const textToSend = customPrompt || inputMessage;
    if (!textToSend || !textToSend.trim() || isSending) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: textToSend.trim(),
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsSending(true);

    try {
      const res = await askAiCopilot({
        message: textToSend.trim(),
        conversationId: currentConversationId
      });

      if (res.data) {
        if (!currentConversationId && res.data.conversationId) {
          setCurrentConversationId(res.data.conversationId);
          loadConversations();
        }

        const assistantMsg = {
          id: res.data.messageId || `ai-${Date.now()}`,
          sender: 'assistant',
          content: res.data.reply,
          tool_invocations: res.data.toolInvocations,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (err) {
      const errorMsg = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        content: `⚠️ Sorry, I encountered an error communicating with the AI Engine: ${err.message || 'Network error'}`,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleTriggerSummary = async () => {
    if (!selectedRecordId) return;
    setIsSummarizing(true);
    setSummaryError(null);
    setSummaryResult(null);

    try {
      const res = await summarizeRecordWithAi({
        entityType,
        recordId: selectedRecordId
      });
      if (res.data) {
        setSummaryResult(res.data);
      }
    } catch (err) {
      setSummaryError(err.response?.data?.message || err.message || 'Failed to generate summary');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleDrafterContactSelect = (contactId) => {
    setDrafterContactId(contactId);
    const found = drafterContactsList.find(c => c.id === contactId);
    if (found) {
      setDrafterForm(prev => ({
        ...prev,
        recipientName: `${found.first_name} ${found.last_name}`,
        recipientEmail: found.email
      }));
    }
  };

  const handleGenerateDraft = async (e) => {
    e.preventDefault();
    if (!drafterForm.recipientEmail) return;
    setIsDrafting(true);
    setDraftResult(null);
    setDraftCopied(false);

    try {
      const res = await draftEmailWithAi(drafterForm);
      if (res.data) {
        setDraftResult(res.data);
      }
    } catch (err) {
      console.error('Draft error:', err);
    } finally {
      setIsDrafting(false);
    }
  };

  const handleCopyDraft = () => {
    if (!draftResult) return;
    const fullText = `Subject: ${draftResult.subject}\n\n${draftResult.body}`;
    navigator.clipboard.writeText(fullText);
    setDraftCopied(true);
    setTimeout(() => setDraftCopied(false), 2500);
  };

  const handleRunAgent = async (agentId) => {
    setIsRunningAgent(prev => ({ ...prev, [agentId]: true }));
    try {
      const res = await runAiAgent(agentId);
      if (res.data) {
        setLastAgentResult(res.data);
        await loadAgentsAndRuns();
      }
    } catch (err) {
      alert(`Agent execution failed: ${err.message}`);
    } finally {
      setIsRunningAgent(prev => ({ ...prev, [agentId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Module Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-200">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">AI Copilot & Autonomous Agents</h2>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                Spec §3, §16, §20, §47, §56
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Live conversational intelligence, dynamic record summarization, smart email drafting & deal health auditing.
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('copilot')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'copilot'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>CRM Copilot</span>
          </button>

          <button
            onClick={() => setActiveTab('summarizer')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'summarizer'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Smart Summarizer</span>
          </button>

          <button
            onClick={() => setActiveTab('drafter')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'drafter'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-indigo-500" />
            <span>AI Email Drafter</span>
          </button>

          <button
            onClick={() => setActiveTab('agents')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'agents'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-600" />
            <span>Autonomous Agents ({agents.length || 3})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CRM COPILOT CONVERSATIONAL CHAT */}
      {activeTab === 'copilot' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar: Conversations & Quick Prompts */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
              <button
                onClick={startNewConversation}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-all shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>New Conversation</span>
              </button>

              <div className="border-t border-slate-100 pt-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Conversation History
                </span>
                <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                  {conversations.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">No prior chats saved</p>
                  ) : (
                    conversations.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => selectConversation(c.id)}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium truncate transition-colors flex items-center gap-2 ${
                          currentConversationId === c.id
                            ? 'bg-purple-50 text-purple-700 font-semibold'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                        <span className="truncate">{c.title || 'Untitled Session'}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50/50 p-4 rounded-xl border border-purple-100/80 space-y-2">
              <div className="flex items-center gap-2 text-purple-900 font-semibold text-xs">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Copilot Suggestions</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Click any prompt to execute real-time CRM queries:
              </p>
              <div className="space-y-1.5 pt-1">
                {suggestionChips.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(chip)}
                    disabled={isSending}
                    className="w-full text-left p-2 rounded-lg bg-white/80 hover:bg-white border border-purple-200/60 text-slate-700 hover:text-purple-700 text-xs transition-all shadow-2xs group flex items-start gap-1.5"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-600 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{chip}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Main Chat Window */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col h-[680px]">
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-bold text-slate-800">
                  AI CRM Engine · Real-Time Natural Language Model
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {messages.length} messages in context
              </span>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-20">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-slate-800">Welcome to your AI Sales Copilot</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Ask questions about your deals, contacts, pipeline health, or tasks.
                  </p>
                </div>
              )}

              {messages.map((msg, index) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id || index}
                    className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-1">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div className={`max-w-[80%] space-y-2`}>
                      <div
                        className={`p-4 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                          isUser
                            ? 'bg-purple-600 text-white rounded-tr-xs'
                            : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-xs whitespace-pre-wrap'
                        }`}
                      >
                        {msg.content}
                      </div>

                      {/* Tool Invocation Badge */}
                      {msg.tool_invocations && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/60 inline-flex">
                          <Activity className="w-3 h-3 text-purple-600" />
                          <span>Tool executed: </span>
                          <span className="font-mono font-semibold text-purple-700">
                            {typeof msg.tool_invocations === 'string'
                              ? JSON.parse(msg.tool_invocations).tool
                              : msg.tool_invocations.tool}
                          </span>
                        </div>
                      )}

                      <div className={`text-[10px] text-slate-400 ${isUser ? 'text-right' : 'text-left'}`}>
                        {new Date(msg.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-2xs mt-1">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}

              {isSending && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-2xs animate-pulse">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-xs flex items-center gap-2 text-xs text-purple-700 font-medium">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-600" />
                    <span>Analyzing CRM graph and synthesizing response...</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-slate-200 bg-white rounded-b-xl">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask CRM Copilot... (e.g. 'Show deals closing this month' or 'Who is at TechCorp?')"
                  disabled={isSending}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={isSending || !inputMessage.trim()}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SMART RECORD SUMMARIZER */}
      {activeTab === 'summarizer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Card */}
          <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Executive Record Digest</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Synthesize historical notes, deal values, and buying signals into a concise 3-bullet summary.
              </p>
            </div>

            {/* Entity Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Entity Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'deal', label: 'Deal', icon: Briefcase },
                  { id: 'contact', label: 'Contact', icon: User },
                  { id: 'company', label: 'Company', icon: Building2 }
                ].map(item => {
                  const Icon = item.icon;
                  const isSel = entityType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setEntityType(item.id)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition-all ${
                        isSel
                          ? 'border-purple-600 bg-purple-50 text-purple-700 font-semibold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-1" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Record Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Select Record to Summarize</label>
              <select
                value={selectedRecordId}
                onChange={(e) => setSelectedRecordId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-white"
              >
                {availableRecords.length === 0 ? (
                  <option value="">No {entityType} records available</option>
                ) : (
                  availableRecords.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <button
              onClick={handleTriggerSummary}
              disabled={isSummarizing || !selectedRecordId}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all"
            >
              {isSummarizing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Record History...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Smart Summary</span>
                </>
              )}
            </button>

            {summaryError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{summaryError}</span>
              </div>
            )}
          </div>

          {/* Results Card */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
            {!summaryResult ? (
              <div className="h-full min-h-[350px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-xl">
                <FileText className="w-12 h-12 text-slate-300 mb-3" />
                <h4 className="text-sm font-bold text-slate-700">No Summary Generated Yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Select a deal, contact, or company on the left and click "Generate Smart Summary" to extract instant insights.
                </p>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                      AI Digest Generated
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      {summaryResult.recordName}
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    Confidence: 96% · Model: Gemini 1.5 Pro
                  </span>
                </div>

                {/* 3-Bullet Executive Digest */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>3-Bullet Executive Digest</span>
                  </h4>
                  <ul className="space-y-2 bg-slate-50/70 p-4 rounded-xl border border-slate-200/60">
                    {summaryResult.bullets?.map((b, i) => (
                      <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Buying Signals & Risk Assessment Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                      <Flame className="w-4 h-4 text-emerald-600" />
                      <span>Key Buying Signals</span>
                    </div>
                    <ul className="space-y-1.5">
                      {summaryResult.buyingSignals?.map((sig, i) => (
                        <li key={i} className="text-xs text-emerald-900 flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{sig}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                      <span>Risk & Blocker Assessment</span>
                    </div>
                    <ul className="space-y-1.5">
                      {summaryResult.risks?.map((r, i) => (
                        <li key={i} className="text-xs text-amber-900 flex items-start gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Recommended Next Action */}
                <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                      Recommended Next-Best-Action
                    </span>
                    <p className="text-xs font-semibold text-purple-950">
                      {summaryResult.recommendedAction || 'Schedule a technical validation review before Friday close.'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('drafter');
                      setDrafterForm(prev => ({
                        ...prev,
                        contextDetails: `Referencing summary recommendations for ${summaryResult.recordName}: ${summaryResult.recommendedAction}`
                      }));
                    }}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors shadow-2xs inline-flex items-center gap-1.5"
                  >
                    <span>Draft Follow-up Email</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CONTEXT-AWARE AI EMAIL DRAFTER */}
      {activeTab === 'drafter' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Drafter Config Form */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600" />
                <span>Context-Aware AI Email Generator</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Personalized email drafting informed by customer relationship history and deal stage.
              </p>
            </div>

            <form onSubmit={handleGenerateDraft} className="space-y-3.5">
              {/* Select from existing contacts */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Pre-fill From Contact</label>
                <select
                  value={drafterContactId}
                  onChange={(e) => handleDrafterContactSelect(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-white"
                >
                  <option value="">-- Choose Contact (or type manually below) --</option>
                  {drafterContactsList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Recipient Name</label>
                  <input
                    type="text"
                    required
                    value={drafterForm.recipientName}
                    onChange={(e) => setDrafterForm(prev => ({ ...prev, recipientName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                    placeholder="e.g. Sarah Jenkins"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Recipient Email</label>
                  <input
                    type="email"
                    required
                    value={drafterForm.recipientEmail}
                    onChange={(e) => setDrafterForm(prev => ({ ...prev, recipientEmail: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                    placeholder="s.jenkins@example.com"
                  />
                </div>
              </div>

              {/* Email Intent Objective */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Email Goal / Intent</label>
                <select
                  value={drafterForm.intent}
                  onChange={(e) => setDrafterForm(prev => ({ ...prev, intent: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-white"
                >
                  <option value="Follow-up on product demonstration">Follow-up on product demonstration</option>
                  <option value="Proposal review & commercial terms">Proposal review & commercial terms</option>
                  <option value="Re-engagement for stalled prospect">Re-engagement for stalled prospect</option>
                  <option value="Contract renewal & expansion check-in">Contract renewal & expansion check-in</option>
                  <option value="Executive introduction & discovery call">Executive introduction & discovery call</option>
                </select>
              </div>

              {/* Tone Selector */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Tone of Voice</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Professional & Consultative',
                    'Friendly & Casual',
                    'Urgent & Time-Sensitive',
                    'Executive C-Suite Concise'
                  ].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDrafterForm(prev => ({ ...prev, tone: t }))}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium text-left transition-all ${
                        drafterForm.tone === t
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Specific Deal/Context Details */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Context & Key Points to Include</label>
                <textarea
                  rows={3}
                  value={drafterForm.contextDetails}
                  onChange={(e) => setDrafterForm(prev => ({ ...prev, contextDetails: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  placeholder="Mention their custom fields setup, the 15% discount valid until end-of-quarter..."
                />
              </div>

              <button
                type="submit"
                disabled={isDrafting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all"
              >
                {isDrafting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Composing Personalized Email...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate AI Draft</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Draft Preview Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            {!draftResult ? (
              <div className="h-full min-h-[350px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-xl">
                <Mail className="w-12 h-12 text-slate-300 mb-3" />
                <h4 className="text-sm font-bold text-slate-700">Ready to Draft</h4>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Configure recipient details and tone on the left to generate an engaging, ready-to-send email.
                </p>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-800">Email Draft Ready</span>
                  </div>
                  <button
                    onClick={handleCopyDraft}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
                  >
                    {draftCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Draft</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Subject Line
                    </span>
                    <span className="text-xs font-semibold text-slate-900 mt-0.5 block">
                      {draftResult.subject}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Body Content
                    </span>
                    <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {draftResult.body}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-lg text-[11px] text-indigo-900 flex items-center justify-between">
                  <span>Tone: <strong>{draftResult.tone}</strong> · Recipient: <strong>{draftResult.recipientName}</strong></span>
                  <span className="text-indigo-600 font-mono">~{draftResult.body?.length || 0} characters</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: AUTONOMOUS SALES AGENTS & DEAL SENTINEL */}
      {activeTab === 'agents' && (
        <div className="space-y-6">
          {/* Active Agents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-purple-300 transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                      <Bot className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{agent.status.toUpperCase()}</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                      {agent.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {agent.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Trigger Mode:</span>
                      <span className="font-medium capitalize">{agent.trigger_type}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">AI Model:</span>
                      <span className="font-mono text-purple-700 font-semibold">{agent.model_provider}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleRunAgent(agent.id)}
                    disabled={isRunningAgent[agent.id]}
                    className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all"
                  >
                    {isRunningAgent[agent.id] ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Evaluating Deals...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Run Evaluation Audit</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Live Evaluation Audit Results Banner (if just run) */}
          {lastAgentResult && (
            <div className="p-6 bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-md border border-purple-500/30 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-purple-400/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Autonomous Audit Execution Complete</h4>
                    <p className="text-xs text-slate-300">
                      Processed <strong>{lastAgentResult.summary?.recordsProcessed || 0} deals</strong> across all active sales pipelines.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-purple-300">
                  Anomalies Flagged: {lastAgentResult.summary?.anomaliesDetected || 0}
                </span>
              </div>

              {/* Deal Health Scores Grid */}
              {lastAgentResult.dealHealthScores && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {lastAgentResult.dealHealthScores.map((score, i) => (
                    <div key={i} className="bg-white/10 backdrop-blur-xs p-4 rounded-xl border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold truncate">{score.title}</span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          score.healthScore >= 70
                            ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40'
                            : score.healthScore >= 40
                            ? 'bg-amber-500/30 text-amber-300 border border-amber-400/40'
                            : 'bg-rose-500/30 text-rose-300 border border-rose-400/40'
                        }`}>
                          Score: {score.healthScore}/100
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        Value: ${Number(score.value).toLocaleString()} · Risk: <strong className="text-white capitalize">{score.riskLevel}</strong>
                      </div>
                      <p className="text-[11px] text-purple-200 line-clamp-2">
                        {score.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Historical Agent Execution Runs Log Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Agent Execution History</h3>
                <p className="text-xs text-slate-500">Autonomous evaluation logs recorded in MySQL database.</p>
              </div>
              <button
                onClick={loadAgentsAndRuns}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Logs</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Agent Name</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Trigger</th>
                    <th className="py-3 px-4">Processed</th>
                    <th className="py-3 px-4">Anomalies</th>
                    <th className="py-3 px-4">Executed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {agentRuns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                        No agent execution runs recorded yet. Click "Run Evaluation Audit" above.
                      </td>
                    </tr>
                  ) : (
                    agentRuns.map((run) => (
                      <tr key={run.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {run.agent_name || 'Autonomous Agent'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            run.status === 'succeeded'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{run.status.toUpperCase()}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 capitalize font-mono text-[11px]">
                          {run.trigger_source || 'manual'}
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {run.records_processed || 0} records
                        </td>
                        <td className="py-3 px-4">
                          <span className={`font-semibold ${run.anomalies_detected > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                            {run.anomalies_detected || 0} flagged
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(run.started_at || run.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
