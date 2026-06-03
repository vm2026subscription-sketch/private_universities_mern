import { useEffect, useRef, useState } from 'react';
import { Bot, MessageSquare, Minimize2, Send, Sparkles, X, Trash2, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useAiChat } from '../../context/AiChatContext';

const QUICK_PROMPTS = [
  'Best private university for B.Tech CSE?',
  'Top MBA options under Rs. 15 lakh?',
  'Which colleges should I target based on my JEE rank?',
  'Compare Amity vs UPES vs Chandigarh University',
  'Which AI/ML course has the best placement?',
  'Best study abroad options under Rs. 25 lakh?',
  'Which twinning programs offer the highest ROI?',
];

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: 'Hello! I am Vidyarthi Mitra AI. Ask me about admissions, exams, fees, scholarships, placements, or university shortlisting.',
  timestamp: new Date(),
};

export default function AiChatWidget() {
  const { isOpen, openChat, closeChat } = useAiChat();
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const askAssistant = async (question) => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const userMessage = { role: 'user', content: trimmed, timestamp: new Date() };
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/questions/assist', {
        title: trimmed,
        content: trimmed,
        category: 'admissions',
      });

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: data.data?.suggestion || 'I could not generate a response right now.',
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: error.response?.data?.message || 'AI assistance is unavailable right now.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await askAssistant(input);
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Chat cleared. How else can I help you today?',
        timestamp: new Date(),
      },
    ]);
  };

  const postLastQuestion = async () => {
    if (!user) {
      toast.error('Please log in to post to the community');
      return;
    }

    const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
    if (!lastUserMessage) {
      toast.error('Ask a question first');
      return;
    }

    try {
      await api.post('/questions', {
        title: lastUserMessage.content,
        content: lastUserMessage.content,
        category: 'admissions',
      });
      toast.success('Question posted to the community');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not post the question');
    }
  };

  if (!isOpen) {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-6 right-6 z-[90] group"
      >
        <div className="absolute bottom-full right-0 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border px-4 py-2 rounded-2xl shadow-xl whitespace-nowrap text-xs font-bold text-primary flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          Ask Vidyarthi Mitra AI
        </div>
        <button
          type="button"
          onClick={openChat}
          className="rounded-full bg-gradient-to-br from-primary to-primary-light p-4 text-white shadow-[0_8px_30px_rgba(249,115,22,0.35)] hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center relative overflow-hidden border border-accent/20"
        >
          <div className="absolute inset-0 bg-accent/20 animate-ping rounded-full" />
          <Bot className="w-7 h-7 relative z-10" />
        </button>
      </motion.div>
    );
  }

  if (minimized) {
    return (
      <motion.div
        className="fixed bottom-6 right-6 z-[90] shadow-2xl overflow-hidden"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="rounded-full bg-primary px-5 py-3 text-sm font-bold text-white shadow-2xl inline-flex items-center gap-2 hover:scale-105 transition-transform"
        >
          <Bot className="w-5 h-5" />
          Vidyarthi Mitra AI
          <Maximize2 className="w-3.5 h-3.5 ml-1 opacity-70" />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="fixed bottom-6 right-6 z-[90] w-[calc(100vw-2rem)] max-w-[420px] h-[min(78vh,680px)] overflow-hidden rounded-[32px] border border-light-border dark:border-dark-border bg-white dark:bg-dark-card shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between bg-gradient-to-r from-primary to-primary-light px-5 py-4 text-white border-b border-accent/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="rounded-2xl bg-white/10 p-2.5 backdrop-blur-md border border-accent/30">
                <Bot className="w-5 h-5" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-accent border-2 border-primary rounded-full" />
            </div>
            <div>
              <p className="font-bold text-sm tracking-tight">Vidyarthi Mitra AI</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-pulse" />
                <p className="text-[10px] text-white/80 font-medium uppercase tracking-wider">Ready To Help</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button type="button" onClick={clearChat} title="Clear Chat" className="rounded-full p-2 hover:bg-white/10 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => setMinimized(true)} className="rounded-full p-2 hover:bg-white/10 transition-colors">
              <Minimize2 className="w-4 h-4" />
            </button>
            <button type="button" onClick={closeChat} className="rounded-full p-2 hover:bg-white/10 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-light-card/20 dark:bg-dark-bg/20 custom-scrollbar scroll-smooth">
          <AnimatePresence initial={false}>
            {messages.map((message, index) => (
              <motion.div
                key={`${message.role}-${index}-${message.timestamp}`}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-[20px] px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    message.role === 'user'
                      ? 'bg-primary text-white rounded-tr-none'
                      : 'bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-tl-none'
                  }`}
                >
                  {message.content}
                  <div className={`text-[9px] mt-1.5 opacity-50 font-medium ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
              <div className="max-w-[85%] rounded-[20px] rounded-tl-none px-4 py-3 text-sm bg-white dark:bg-dark-card border border-light-border dark:border-dark-border inline-flex items-center gap-3 shadow-sm">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" />
                </div>
                <span className="text-xs font-medium text-muted-foreground italic">Thinking...</span>
              </div>
            </motion.div>
          )}
        </div>

        <div className="border-t border-light-border dark:border-dark-border p-5 bg-white dark:bg-dark-card shrink-0">
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => askAssistant(prompt)}
                className="shrink-0 rounded-full bg-accent/5 hover:bg-accent/10 border border-accent/10 px-3.5 py-1.5 text-xs text-primary font-bold transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
              >
                {prompt}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
            <textarea
              rows="1"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSubmit(event);
                }
              }}
              placeholder="Ask anything..."
              className="w-full bg-light-card dark:bg-dark-bg border-none rounded-2xl px-4 py-3.5 pr-12 text-sm focus:ring-2 focus:ring-primary/20 transition-all resize-none min-h-[52px] max-h-32"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-1.5 bottom-1.5 w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-light text-white flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all shadow-lg shadow-primary/20 border border-accent/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <p className="mt-3 text-[10px] font-medium text-slate-500 dark:text-slate-400">
            Ask about admissions, courses, fees, placements, scholarships, and university shortlisting.
          </p>

          <button
            type="button"
            onClick={postLastQuestion}
            className="mt-3 w-full rounded-xl border border-light-border dark:border-dark-border py-2.5 text-xs font-bold text-muted-foreground hover:bg-light-card dark:hover:bg-dark-bg transition-all flex items-center justify-center gap-2 border-dashed"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Post to community for student discussion
          </button>
        </div>
      </div>
    </motion.div>
  );
}
