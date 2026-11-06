import React, { useEffect, useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { MessageSquare, Plus, Send, Trash2, Loader2, Code2 } from 'lucide-react';
import MessageBubble from './MessageBubble';

const AGENT_NAME = 'coding_agent';

export default function CodingAgentChat() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  const loadConversations = useCallback(async () => {
    setLoadingConvs(true);
    try {
      const list = await base44.agents.listConversations({ agent_name: AGENT_NAME });
      setConversations(list || []);
      if (list && list.length > 0 && !activeId) setActiveId(list[0].id);
    } catch (e) {
      setError('Could not load conversations.');
    } finally {
      setLoadingConvs(false);
    }
  }, [activeId]);

  useEffect(() => { loadConversations(); }, []);

  // Subscribe to the active conversation
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    setSending(false);
    const unsub = base44.agents.subscribeToConversation(activeId, (data) => {
      setMessages(data?.messages || []);
      setSending(false);
    });
    // also load full history immediately
    base44.agents.getConversation(activeId).then(c => setMessages(c?.messages || [])).catch(() => {});
    return () => unsub();
  }, [activeId]);

  // autoscroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const createConversation = async () => {
    try {
      setError(null);
      const conv = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: { name: 'New project chat', description: '' }
      });
      setConversations(prev => [conv, ...prev]);
      setActiveId(conv.id);
    } catch (e) {
      setError('Could not start a new conversation.');
    }
  };

  const deleteConversation = async (id) => {
    try {
      await base44.agents.deleteConversation?.(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeId === id) { setActiveId(null); setMessages([]); }
    } catch {
      // delete may not be exposed; just remove locally
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeId === id) { setActiveId(null); setMessages([]); }
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    if (!activeId) { await createConversation(); return; }
    setInput('');
    setSending(true);
    setError(null);
    try {
      const conv = await base44.agents.getConversation(activeId);
      // optimistic local append
      setMessages(prev => [...prev, { role: 'user', content: text }]);
      await base44.agents.addMessage(conv, { role: 'user', content: text });
    } catch (e) {
      setError('Could not send your message.');
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const activeConv = conversations.find(c => c.id === activeId);

  return (
    <div className="flex h-full bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <aside className="hidden sm:flex w-64 shrink-0 flex-col border-r border-white/10 bg-zinc-900/60">
        <div className="p-3 border-b border-white/10">
          <button
            onClick={createConversation}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 px-3 py-2 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingConvs ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-zinc-500" /></div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-zinc-500 px-2 py-4 text-center">No conversations yet.</p>
          ) : conversations.map(c => (
            <div key={c.id}
              className={`group flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer transition-colors ${activeId === c.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
              onClick={() => setActiveId(c.id)}
            >
              <MessageSquare className="w-4 h-4 shrink-0 text-zinc-400" />
              <span className="flex-1 truncate text-sm">{c.metadata?.name || 'Untitled chat'}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Chat */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-zinc-900/40">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
            <Code2 className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate">Coding Agent</h1>
            <p className="text-xs text-zinc-500 truncate">{activeConv?.metadata?.name || 'Create or edit your app projects'}</p>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {!activeId && (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mb-4">
                <Code2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-lg font-semibold mb-1">Start building with the Coding Agent</h2>
              <p className="text-sm text-zinc-400 max-w-md mb-6">
                Describe an app idea, or ask to edit one of your existing projects. The agent will propose changes and only save them once you confirm.
              </p>
              <button
                onClick={createConversation}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 px-4 py-2.5 text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> Start a new chat
              </button>
            </div>
          )}
          {activeId && messages.length === 0 && !sending && (
            <div className="h-full flex items-center justify-center text-center">
              <p className="text-sm text-zinc-500 max-w-sm">Ask the agent to scaffold a new app, or paste a change you'd like to make to an existing project.</p>
            </div>
          )}
          {messages.map((m, i) => <MessageBubble key={i} message={m} />)}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-zinc-800/80 border border-white/5 rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                <span className="text-sm text-zinc-400">Thinking…</span>
              </div>
            </div>
          )}
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
        </div>

        <div className="px-4 py-3 border-t border-white/10 bg-zinc-900/40">
          <div className="flex items-end gap-2 rounded-2xl bg-zinc-800/70 border border-white/10 focus-within:border-violet-500/50 transition-colors px-3 py-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Describe an app or a change to make…"
              className="flex-1 bg-transparent resize-none outline-none text-sm py-1.5 max-h-40 placeholder:text-zinc-500"
            />
            <button
              onClick={send}
              disabled={!input.trim() || sending}
              className="shrink-0 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed p-2 transition-colors"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
          <p className="text-[11px] text-zinc-600 mt-1.5 text-center">The agent asks before saving any project changes.</p>
        </div>
      </main>
    </div>
  );
}