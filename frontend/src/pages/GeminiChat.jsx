import { useRef, useState, useEffect } from 'react';
import { Send, Sparkles, Trash2, Bot, User, Copy, Check, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';

const QUICK_PROMPTS = [
  'Best private university for B.Tech CSE?',
  'Top MBA colleges under ₹15 lakh fees?',
  'JEE rank required for VIT / Manipal?',
  'Compare Amity vs Chandigarh University',
  'Best AI/ML courses with top placements',
  'Study abroad options under ₹25 lakh?',
];

function formatMessage(text) {
  // Convert **bold** markdown
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>')
    // Convert bullet lines
    .replace(/^[-•]\s(.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul class="chat-list">${match}</ul>`)
    // Convert numbered lists
    .replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>')
    // Convert line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');
  return `<p>${html}</p>`;
}

export default function GeminiChat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am **Vidyarthi Mitra AI** powered by Gemini. Ask me anything about universities, admissions, exams, fees, scholarships, or career guidance.',
      timestamp: new Date(),
      id: 'welcome',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  const askGemini = async (question) => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const userMsg = { role: 'user', content: trimmed, timestamp: new Date(), id: `u-${Date.now()}` };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/questions/assist', {
        title: trimmed,
        content: trimmed,
        category: 'admissions',
        mode: 'general',
      });

      const reply = data.data?.suggestion || 'I could not generate a response right now. Please try again.';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: reply, timestamp: new Date(), id: `a-${Date.now()}` },
      ]);
    } catch (error) {
      const errMsg = error.response?.data?.message || 'AI is unavailable right now. Please check your connection.';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: errMsg, timestamp: new Date(), id: `e-${Date.now()}`, isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    askGemini(input);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      askGemini(input);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Chat cleared. What would you like to know?',
        timestamp: new Date(),
        id: `clear-${Date.now()}`,
      },
    ]);
  };

  const copyMessage = async (content, id) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 pb-0">
      {/* Header */}
      <div className="w-full max-w-3xl mb-6">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-lg shadow-primary/30">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white dark:border-dark-bg" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-light-text dark:text-dark-text tracking-tight flex items-center gap-2">
                Gemini AI Chat
                <span className="text-xs font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Powered by Gemini
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Ask about admissions, exams, fees, scholarships & more</p>
            </div>
          </div>
          <button
            onClick={clearChat}
            title="Clear chat"
            className="p-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-all group"
          >
            <Trash2 className="w-4.5 h-4.5 group-hover:scale-110 transition-transform" />
          </button>
        </motion.div>
      </div>

      {/* Chat Container */}
      <div className="w-full max-w-3xl flex flex-col" style={{ height: 'calc(100vh - 220px)', minHeight: '400px' }}>
        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-5 pr-1 custom-scrollbar"
        >
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className="shrink-0">
                  {msg.role === 'user' ? (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-md shadow-primary/20">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`group relative max-w-[80%] ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  } flex flex-col gap-1`}
                >
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-primary to-primary-light text-white rounded-tr-sm'
                        : msg.isError
                        ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-tl-sm'
                        : 'bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text dark:text-dark-text rounded-tl-sm'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div
                        className="gemini-response"
                        dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                      />
                    ) : (
                      msg.content
                    )}
                  </div>

                  {/* Timestamp + copy */}
                  <div className={`flex items-center gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => copyMessage(msg.content, msg.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600"
                        title="Copy response"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading indicator */}
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl rounded-tl-sm px-4 py-3.5 flex items-center gap-3 shadow-sm">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                </div>
                <span className="text-xs text-slate-400 italic font-medium">Gemini is thinking...</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Input Area */}
        <div className="pt-4 pb-6 bg-transparent">
          {/* Quick prompts */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 hide-scrollbar">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => askGemini(prompt)}
                disabled={loading}
                className="shrink-0 rounded-full bg-white dark:bg-dark-card border border-light-border dark:border-dark-border px-3.5 py-1.5 text-xs text-primary font-semibold transition-all hover:scale-105 hover:border-primary/40 hover:shadow-sm active:scale-95 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input form */}
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-end gap-2 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl shadow-lg shadow-black/5 p-2 focus-within:border-primary/50 focus-within:shadow-primary/10 transition-all">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Gemini anything about universities, exams, fees..."
                disabled={loading}
                className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-light-text dark:text-dark-text placeholder:text-slate-400 py-1.5 px-2 min-h-[38px] max-h-40 leading-relaxed"
                style={{ scrollbarWidth: 'none' }}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-light text-white flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all shadow-md shadow-primary/30 border border-accent/20"
              >
                {loading ? (
                  <RotateCcw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-center text-[10px] text-slate-400 mt-2 font-medium">
              Press <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 text-[9px] font-mono">Enter</kbd> to send · <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 text-[9px] font-mono">Shift+Enter</kbd> for new line
            </p>
          </form>
        </div>
      </div>

      {/* Gemini response styles */}
      <style>{`
        .gemini-response p { margin: 0 0 8px 0; }
        .gemini-response p:last-child { margin-bottom: 0; }
        .gemini-response strong { font-weight: 700; }
        .gemini-response em { font-style: italic; }
        .gemini-response .inline-code {
          background: rgba(99,102,241,0.1);
          color: #6366f1;
          padding: 1px 5px;
          border-radius: 4px;
          font-size: 0.8em;
          font-family: monospace;
        }
        .gemini-response .chat-list {
          margin: 6px 0;
          padding-left: 18px;
          list-style: disc;
        }
        .gemini-response .chat-list li {
          margin: 3px 0;
        }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>
    </div>
  );
}
