'use client';
import { useState, useRef, useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { chatApi } from '@/lib/api';
import { Bot, User, Send, Loader2, Trash2 } from 'lucide-react';

type Message = { role: 'user' | 'assistant'; content: string; ts: Date };

const SUGGESTIONS = [
  'What defects need review right now?',
  'Which components are low on stock?',
  'Show me pending purchase requisitions',
  'What maintenance orders are awaiting approval?',
  'Summarize recent procurement activity',
  'Which vendors perform best for critical parts?',
];

export default function SupervisorChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm AION Assistant. I have full visibility into your system's current state — pending reviews, inventory levels, open MOs, purchase requisitions, and more.\n\nWhat would you like to know?",
      ts: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const userMsg: Message = { role: 'user', content: msg, ts: new Date() };
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await chatApi.send(msg, history);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.response, ts: new Date() }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'An error occurred. Please try again.', ts: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const fmt = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <TopBar title="AI Assistant" subtitle="Ask questions about your system, workflows, and pending tasks" />
      <div className="flex flex-col h-[calc(100vh-4rem)]">

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 max-w-3xl w-full mx-auto">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                m.role === 'assistant' ? 'bg-blue-100' : 'bg-slate-200'
              }`}>
                {m.role === 'assistant' ? <Bot className="w-4 h-4 text-blue-700" /> : <User className="w-4 h-4 text-slate-600" />}
              </div>
              <div className={`max-w-[75%] flex flex-col ${m.role === 'user' ? 'items-end' : ''}`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'assistant'
                    ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
                    : 'bg-blue-800 text-white rounded-tr-sm'
                }`}>
                  {m.content}
                </div>
                <span className="text-xs text-slate-400 mt-1 px-1">{fmt(m.ts)}</span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-blue-700" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 shadow-sm">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                <span className="text-sm text-slate-500">Analysing system data…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="px-6 pb-2 max-w-3xl mx-auto w-full">
            <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">Try asking</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-sm bg-white border border-slate-200 text-slate-600 rounded-xl px-3 py-1.5 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-colors shadow-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-slate-200 bg-white px-6 py-4">
          <div className="max-w-3xl mx-auto flex gap-3 items-end">
            <button
              onClick={() => setMessages([messages[0]])}
              className="flex-shrink-0 p-2 text-slate-400 hover:text-slate-600"
              title="Clear conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about defects, MOs, inventory, procurement, vendors…"
              rows={1}
              className="flex-1 resize-none border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32 overflow-y-auto"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-10 h-10 bg-blue-800 hover:bg-blue-900 disabled:opacity-40 rounded-xl flex items-center justify-center transition-colors"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
          <p className="text-center text-xs text-slate-400 mt-2">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </>
  );
}
