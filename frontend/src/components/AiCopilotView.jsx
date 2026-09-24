import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Sparkles,
  ArrowUp,
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
  ChevronDown,
  Plus,
  Flame,
  Activity,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Paperclip
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
import { Button, Card, Badge, Input } from './ui';

/**
 * UI.md §8 AI Copilot — ChatGPT-Style Chat UI
 * - Centered 768px message column (max-w-[var(--chat-max-w)])
 * - Bubble-less assistant text with 28px sparkle avatar
 * - Right-aligned user message bubble (--bg-surface-raised, radius 18px)
 * - Pinned 24px pill composer with 32px circular send button
 * - Action row (Copy, feedback)
 * - Tool step disclosures
 * - Suggestion chips
 */
export default function AiCopilotView() {
  const [activeTab, setActiveTab] = useState('copilot'); // 'copilot' | 'summarizer' | 'drafter' | 'agents'
  
  // Copilot Chat State
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [expandedTools, setExpandedTools] = useState({});
  const chatBottomRef = useRef(null);
  const textareaRef = useRef(null);

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

  // Suggestion Prompts for Copilot (§8.4)
  const suggestionChips = [
    'Deals over $50K with no activity in 14 days',
    'Summarize my pipeline health and risk',
    'Draft a follow-up email for TechCorp',
    'What tasks are urgent or due today?'
  ];

  useEffect(() => {
    loadConversations();
    loadAgentsAndRuns();
  }, []);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isSending]);

  useEffect(() => {
    loadEntityRecords(entityType);
  }, [entityType]);

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
      console.error('Failed to load AI conversations:', err);
    }
  };

  const selectConversation = async (conversationId) => {
    setCurrentConversationId(conversationId);
    try {
      const res = await getAiMessages(conversationId);
      if (res.data) {
        setMessages(res.data);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setInputMessage('');
  };

  const loadAgentsAndRuns = async () => {
    try {
      const [agRes, runsRes] = await Promise.all([
        getAiAgents().catch(() => ({ data: [] })),
        getAiAgentRuns().catch(() => ({ data: [] }))
      ]);
      setAgents(agRes.data || []);
      setAgentRuns(runsRes.data || []);
    } catch (err) {
      console.error('Failed to load agents:', err);
    }
  };

  const loadEntityRecords = async (type) => {
    try {
      if (type === 'deal') {
        const res = await getDeals();
        const records = (res.data?.deals || res.data || []).map(d => ({ id: d.id, name: `${d.title} ($${d.amount})` }));
        setAvailableRecords(records);
        if (records.length > 0) setSelectedRecordId(records[0].id);
      } else if (type === 'contact') {
        const res = await getContacts({ limit: 50 });
        const records = (res.data || []).map(c => ({ id: c.id, name: `${c.first_name} ${c.last_name} (${c.email})` }));
        setAvailableRecords(records);
        if (records.length > 0) setSelectedRecordId(records[0].id);
      } else if (type === 'company') {
        const res = await getCompanies();
        const records = (res.data?.companies || res.data || []).map(c => ({ id: c.id, name: c.name }));
        setAvailableRecords(records);
        if (records.length > 0) setSelectedRecordId(records[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch records for summarizer:', err);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const msg = (textToSend || inputMessage).trim();
    if (!msg || isSending) return;

    const userMsg = {
      id: `temp-${Date.now()}`,
      sender: 'user',
      content: msg,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsSending(true);

    try {
      const res = await askAiCopilot({
        message: msg,
        conversationId: currentConversationId
      });

      if (res.data) {
        if (!currentConversationId && res.data.conversationId) {
          setCurrentConversationId(res.data.conversationId);
          loadConversations();
        }

        const aiMsg = {
          id: res.data.messageId || `ai-${Date.now()}`,
          sender: 'assistant',
          content: res.data.reply,
          tool_invocations: res.data.tool_invocations,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (err) {
      const errorMsg = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        content: `I encountered an error querying the CRM engine: ${err.message || 'Network error'}. Please check your connection or try again.`,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyMessage = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const toggleToolStep = (msgId) => {
    setExpandedTools(prev => ({ ...prev, [msgId]: !prev[msgId] }));
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
    <div className="flex flex-col h-full space-y-4">
      {/* Top Bar with View Mode Tabs (§6.6 Segmented) */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              AI Copilot & Agents
            </h2>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="inline-flex items-center p-1 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)]">
          <button
            onClick={() => setActiveTab('copilot')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-[var(--radius-xs)] transition-all ${
              activeTab === 'copilot'
                ? 'bg-[var(--bg-active)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Chat</span>
          </button>

          <button
            onClick={() => setActiveTab('summarizer')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-[var(--radius-xs)] transition-all ${
              activeTab === 'summarizer'
                ? 'bg-[var(--bg-active)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Summarizer</span>
          </button>

          <button
            onClick={() => setActiveTab('drafter')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-[var(--radius-xs)] transition-all ${
              activeTab === 'drafter'
                ? 'bg-[var(--bg-active)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email Drafter</span>
          </button>

          <button
            onClick={() => setActiveTab('agents')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-[var(--radius-xs)] transition-all ${
              activeTab === 'agents'
                ? 'bg-[var(--bg-active)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Autonomous Agents</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CHATGPT-STYLE FULL COPILOT CHAT (§8) */}
      {activeTab === 'copilot' && (
        <div className="flex-1 flex gap-4 min-h-[580px] h-[calc(100vh-170px)] overflow-hidden">
          {/* Left History Panel (Collapsible or 240px) */}
          <div className="w-60 shrink-0 hidden md:flex flex-col bg-[var(--bg-sidebar)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-3 overflow-hidden">
            <button
              onClick={startNewConversation}
              className="w-full h-9 flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--btn-secondary-border)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--btn-secondary-bg-hover)] transition-colors mb-3 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>New chat</span>
            </button>

            <span className="text-[11px] font-medium text-[var(--text-tertiary)] px-2 pb-1.5 shrink-0">
              Recent conversations
            </span>

            <div className="flex-1 overflow-y-auto space-y-0.5">
              {conversations.length === 0 ? (
                <p className="text-xs text-[var(--text-tertiary)] px-2 py-3">No conversations yet</p>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectConversation(c.id)}
                    className={`w-full text-left px-2.5 py-2 rounded-[var(--radius-sm)] text-xs truncate transition-colors flex items-center gap-2 ${
                      currentConversationId === c.id
                        ? 'bg-[var(--bg-selected)] text-[var(--text-primary)] font-medium'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 text-[var(--text-tertiary)]" />
                    <span className="truncate">{c.title || 'CRM Chat Session'}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Main Chat Column (Centered 768px UI.md §8.1) */}
          <div className="flex-1 flex flex-col bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] overflow-hidden relative">
            {/* Scrollable Messages Column */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="max-w-[768px] mx-auto w-full space-y-6">
                {/* Empty State (§8.4) */}
                {messages.length === 0 && (
                  <div className="py-16 text-center space-y-6">
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--accent)]">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <h3 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">
                        What can I help you with?
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
                        Ask questions in natural language to query deals, analyze accounts, look up contacts, or summarize pipeline health.
                      </p>
                    </div>

                    {/* 4 Suggestion Chips (§8.4) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl mx-auto pt-4 text-left">
                      {suggestionChips.map((chip, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(chip)}
                          className="p-3.5 rounded-[var(--radius-md)] bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center justify-between group"
                        >
                          <span className="line-clamp-2">{chip}</span>
                          <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] shrink-0 ml-2" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages Rendering (§8.2) */}
                {messages.map((msg, index) => {
                  const isUser = msg.sender === 'user';
                  const msgId = msg.id || index;

                  if (isUser) {
                    return (
                      <div key={msgId} className="flex justify-end">
                        <div className="max-w-[75%] rounded-[18px] px-4 py-2.5 bg-[var(--bg-surface-raised)] text-[var(--text-primary)] text-[14px] leading-relaxed select-text shadow-xs">
                          {msg.content}
                        </div>
                      </div>
                    );
                  }

                  // Assistant Message: Bubble-less, full width, 28px sparkle icon (§8.2)
                  const parsedTool = msg.tool_invocations
                    ? (typeof msg.tool_invocations === 'string' ? JSON.parse(msg.tool_invocations) : msg.tool_invocations)
                    : null;

                  return (
                    <div key={msgId} className="flex items-start gap-3 w-full group py-1">
                      {/* Avatar */}
                      <div className="w-7 h-7 rounded-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] shrink-0 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>

                      {/* Content Area */}
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Tool execution disclosure row (§8.2) */}
                        {parsedTool && (
                          <div className="mb-2">
                            <button
                              type="button"
                              onClick={() => toggleToolStep(msgId)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-hover)] text-xs text-[var(--text-secondary)] border border-[var(--border-subtle)] transition-colors"
                            >
                              <Activity className="w-3 h-3 text-[var(--accent)]" />
                              <span>Tool execution: <strong>{parsedTool.tool || 'CRM Query'}</strong></span>
                              {expandedTools[msgId] ? (
                                <ChevronDown className="w-3 h-3" />
                              ) : (
                                <ChevronRight className="w-3 h-3" />
                              )}
                            </button>

                            {expandedTools[msgId] && (
                              <div className="mt-1.5 p-3 rounded-[var(--radius-md)] bg-[var(--bg-surface-sunken)] border border-[var(--border-subtle)] font-mono text-[11px] text-[var(--text-secondary)] overflow-x-auto">
                                <pre>{JSON.stringify(parsedTool, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Text (Bubble-less) */}
                        <div className="text-[14px] leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap select-text">
                          {msg.content}
                        </div>

                        {/* Ghost Action Row on Hover (§8.2) */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-1 text-[var(--text-tertiary)]">
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.content, msgId)}
                            className="p-1 rounded-[var(--radius-xs)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                            title="Copy message"
                          >
                            {copiedMsgId === msgId ? (
                              <Check className="w-3.5 h-3.5 text-[var(--accent)]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            className="p-1 rounded-[var(--radius-xs)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                            title="Good response"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            className="p-1 rounded-[var(--radius-xs)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                            title="Bad response"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Streaming / Waiting Indicator */}
                {isSending && (
                  <div className="flex items-start gap-3 w-full">
                    <div className="w-7 h-7 rounded-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex items-center gap-2 pt-1 text-xs text-[var(--text-secondary)]">
                      <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-ping" />
                      <span>Thinking and analyzing CRM records...</span>
                    </div>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>
            </div>

            {/* Pinned ChatGPT Pill Composer (§8.3) */}
            <div className="p-4 bg-[var(--bg-app)] border-t border-[var(--border-subtle)] shrink-0">
              <div className="max-w-[768px] mx-auto w-full">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2 p-1.5 pl-4 rounded-[var(--radius-xl)] bg-[var(--bg-surface-raised)] border border-[var(--border-default)] shadow-xs transition-all focus-within:border-[var(--border-focus)] focus-within:ring-1 focus-within:ring-[var(--border-focus)]"
                >
                  <input
                    ref={textareaRef}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask anything about your CRM..."
                    disabled={isSending}
                    className="flex-1 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] text-sm focus:outline-none"
                  />

                  {/* High-Contrast Round Send Button (§8.3) */}
                  <button
                    type="submit"
                    disabled={isSending || !inputMessage.trim()}
                    className="w-8 h-8 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-sm"
                    title="Send message"
                  >
                    <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </form>

                {/* Disclaimer line (§8.1) */}
                <p className="text-[11px] text-[var(--text-tertiary)] text-center mt-2">
                  AI can make mistakes. Verify important CRM data.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SMART RECORD SUMMARIZER */}
      {activeTab === 'summarizer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
          {/* Controls Card */}
          <Card className="lg:col-span-1 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                <span>Executive Record Digest</span>
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Synthesize historical notes, deal values, and buying signals into a concise 3-bullet summary.
              </p>
            </div>

            {/* Entity Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Entity Type</label>
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
                      className={`flex flex-col items-center justify-center p-2.5 rounded-[var(--radius-sm)] border text-xs font-medium transition-all ${
                        isSel
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]'
                          : 'border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
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
              <label className="text-xs font-medium text-[var(--text-secondary)]">Select Record</label>
              <select
                value={selectedRecordId}
                onChange={(e) => setSelectedRecordId(e.target.value)}
                className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] text-xs bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
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

            <Button
              variant="primary"
              onClick={handleTriggerSummary}
              disabled={isSummarizing || !selectedRecordId}
              loading={isSummarizing}
              className="w-full"
            >
              Generate Smart Summary
            </Button>

            {summaryError && (
              <div className="p-3 bg-[var(--danger-soft)] border border-[var(--danger)]/30 text-[var(--danger)] text-xs rounded-[var(--radius-sm)] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{summaryError}</span>
              </div>
            )}
          </Card>

          {/* Results Card */}
          <Card className="lg:col-span-2">
            {!summaryResult ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-[var(--border-subtle)] rounded-[var(--radius-md)]">
                <FileText className="w-10 h-10 text-[var(--text-tertiary)] mb-3" />
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">No Summary Generated Yet</h4>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm mt-1">
                  Select a record and click "Generate Smart Summary" to extract instant insights.
                </p>
              </div>
            ) : (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                  <div>
                    <Badge variant="ai">AI Digest</Badge>
                    <h3 className="text-base font-semibold text-[var(--text-primary)] mt-1.5">
                      {summaryResult.recordName}
                    </h3>
                  </div>
                  <span className="text-xs text-[var(--text-tertiary)]">
                    Confidence: 96%
                  </span>
                </div>

                {/* 3-Bullet Executive Digest */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)]" />
                    <span>3-Bullet Executive Digest</span>
                  </h4>
                  <ul className="space-y-2 bg-[var(--bg-surface-sunken)] p-3.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
                    {summaryResult.bullets?.map((b, i) => (
                      <li key={i} className="text-xs text-[var(--text-secondary)] flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-1.5 shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Buying Signals & Risk Assessment Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 bg-[var(--success-soft)] border border-[var(--success)]/20 rounded-[var(--radius-md)] space-y-2">
                    <div className="flex items-center gap-2 text-[var(--success)] font-semibold text-xs">
                      <Flame className="w-4 h-4" />
                      <span>Key Buying Signals</span>
                    </div>
                    <ul className="space-y-1.5">
                      {summaryResult.buyingSignals?.map((sig, i) => (
                        <li key={i} className="text-xs text-[var(--text-primary)] flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-[var(--success)] shrink-0 mt-0.5" />
                          <span>{sig}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 bg-[var(--danger-soft)] border border-[var(--danger)]/20 rounded-[var(--radius-md)] space-y-2">
                    <div className="flex items-center gap-2 text-[var(--danger)] font-semibold text-xs">
                      <ShieldAlert className="w-4 h-4" />
                      <span>Risk Factors</span>
                    </div>
                    <ul className="space-y-1.5">
                      {summaryResult.riskFactors?.map((risk, i) => (
                        <li key={i} className="text-xs text-[var(--text-primary)] flex items-start gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-[var(--danger)] shrink-0 mt-0.5" />
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 3: SMART EMAIL DRAFTER */}
      {activeTab === 'drafter' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
          {/* Form */}
          <Card className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Mail className="w-4 h-4 text-[var(--accent)]" />
              <span>Contextual Email Drafter</span>
            </h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Recipient Name</label>
                <input
                  type="text"
                  value={drafterForm.recipientName}
                  onChange={(e) => setDrafterForm({ ...drafterForm, recipientName: e.target.value })}
                  className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] text-xs bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Recipient Email</label>
                <input
                  type="email"
                  value={drafterForm.recipientEmail}
                  onChange={(e) => setDrafterForm({ ...drafterForm, recipientEmail: e.target.value })}
                  className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] text-xs bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Intent & Goal</label>
                <input
                  type="text"
                  value={drafterForm.intent}
                  onChange={(e) => setDrafterForm({ ...drafterForm, intent: e.target.value })}
                  className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] text-xs bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Context & Notes</label>
                <textarea
                  rows={3}
                  value={drafterForm.contextDetails}
                  onChange={(e) => setDrafterForm({ ...drafterForm, contextDetails: e.target.value })}
                  className="w-full p-2.5 rounded-[var(--radius-md)] border border-[var(--border-default)] text-xs bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
                />
              </div>
            </div>

            <Button
              variant="primary"
              onClick={handleGenerateDraft}
              disabled={isDrafting || !drafterForm.recipientEmail}
              loading={isDrafting}
              className="w-full"
            >
              Generate Email Draft
            </Button>
          </Card>

          {/* Result */}
          <Card>
            {!draftResult ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-[var(--border-subtle)] rounded-[var(--radius-md)]">
                <Mail className="w-10 h-10 text-[var(--text-tertiary)] mb-3" />
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">Ready to Draft</h4>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm mt-1">
                  Fill in the recipient details and click "Generate Email Draft".
                </p>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                  <Badge variant="ai">AI Generated</Badge>
                  <Button variant="secondary" size="sm" onClick={handleCopyDraft}>
                    {draftCopied ? <Check className="w-3.5 h-3.5 text-[var(--accent)]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{draftCopied ? 'Copied' : 'Copy Draft'}</span>
                  </Button>
                </div>

                <div className="p-3 bg-[var(--bg-surface-sunken)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] space-y-2">
                  <div className="text-xs font-semibold text-[var(--text-primary)]">
                    Subject: {draftResult.subject}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed pt-2 border-t border-[var(--border-subtle)]">
                    {draftResult.body}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 4: AUTONOMOUS AGENTS */}
      {activeTab === 'agents' && (
        <div className="space-y-4 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <Card key={agent.id} className="flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={agent.status === 'active' ? 'success' : 'neutral'}>
                      {agent.status}
                    </Badge>
                    <span className="text-[11px] text-[var(--text-tertiary)]">
                      {agent.schedule || 'Scheduled'}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                    {agent.name}
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                    {agent.description}
                  </p>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleRunAgent(agent.id)}
                  disabled={isRunningAgent[agent.id]}
                  loading={isRunningAgent[agent.id]}
                  className="w-full"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Execute Agent Now</span>
                </Button>
              </Card>
            ))}
          </div>

          {/* Last Agent Run Result */}
          {lastAgentResult && (
            <Card className="space-y-2 border-[var(--accent)]/30">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent-text)]">
                <Sparkles className="w-4 h-4" />
                <span>Agent Execution Completed Successfully</span>
              </div>
              <div className="p-3 bg-[var(--bg-surface-sunken)] rounded-[var(--radius-sm)] text-xs text-[var(--text-secondary)] font-mono overflow-x-auto">
                <pre>{JSON.stringify(lastAgentResult, null, 2)}</pre>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
