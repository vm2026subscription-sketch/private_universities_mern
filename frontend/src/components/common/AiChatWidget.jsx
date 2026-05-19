import { useRef, useState, useEffect } from 'react';
import { Bot, MessageSquare, Minimize2, Send, Sparkles, X, Trash2, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useAiChat } from '../../context/AiChatContext';

const QUICK_PROMPTS = [
  'Best private university for B.Tech CSE?',
  'Top MBA options under 15 lakh?',
  'Which colleges should I target based on my JEE rank?',
];

const DEFAULT_CHAT_WIDTH = 384;
const DEFAULT_CHAT_HEIGHT = 640;
const MAX_CHAT_WIDTH = 560;
const MAX_CHAT_HEIGHT = 760;
const MIN_CHAT_WIDTH = 320;
const MIN_CHAT_HEIGHT = 420;
const MINIMIZED_CHAT_HEIGHT = 76;
const MINIMIZED_CHAT_WIDTH = 220;
const EDGE_GAP = 24;
const MIN_EDGE_GAP = 12;
const CHAT_SAFE_TOP = 88;
const CHAT_LAYOUT_STORAGE_KEY = 'vm_ai_chat_layout_v2';

const getViewportBounds = () => {
  if (typeof window === 'undefined') {
    return {
      minWidth: MIN_CHAT_WIDTH,
      maxWidth: DEFAULT_CHAT_WIDTH,
      minHeight: MIN_CHAT_HEIGHT,
      maxHeight: DEFAULT_CHAT_HEIGHT,
    };
  }

  const availableWidth = Math.max(280, window.innerWidth - MIN_EDGE_GAP * 2);
  const availableHeight = Math.max(320, window.innerHeight - CHAT_SAFE_TOP - EDGE_GAP);
  const minWidth = Math.min(MIN_CHAT_WIDTH, availableWidth);
  const maxWidth = Math.max(minWidth, Math.min(MAX_CHAT_WIDTH, availableWidth));
  const minHeight = Math.min(MIN_CHAT_HEIGHT, availableHeight);
  const maxHeight = Math.max(minHeight, Math.min(MAX_CHAT_HEIGHT, availableHeight));

  return { minWidth, maxWidth, minHeight, maxHeight };
};

const clampSize = (size) => {
  const bounds = getViewportBounds();
  return {
    width: Math.min(bounds.maxWidth, Math.max(bounds.minWidth, size.width)),
    height: Math.min(bounds.maxHeight, Math.max(bounds.minHeight, size.height)),
  };
};

const clampPosition = (position, size, minimized = false) => {
  if (typeof window === 'undefined') return position;

  const widgetWidth = minimized ? MINIMIZED_CHAT_WIDTH : size.width;
  const widgetHeight = minimized ? MINIMIZED_CHAT_HEIGHT : size.height;
  const minX = MIN_EDGE_GAP;
  const maxX = Math.max(minX, window.innerWidth - widgetWidth - MIN_EDGE_GAP);
  const minY = CHAT_SAFE_TOP;
  const maxY = Math.max(minY, window.innerHeight - widgetHeight - EDGE_GAP);

  return {
    x: Math.min(maxX, Math.max(minX, position.x)),
    y: Math.min(maxY, Math.max(minY, position.y)),
  };
};

const getDefaultSize = () => clampSize({ width: DEFAULT_CHAT_WIDTH, height: DEFAULT_CHAT_HEIGHT });

const getDefaultPosition = (size, minimized = false) => {
  if (typeof window === 'undefined') return { x: 24, y: CHAT_SAFE_TOP };

  return clampPosition(
    {
      x: window.innerWidth - (minimized ? MINIMIZED_CHAT_WIDTH : size.width) - EDGE_GAP,
      y: window.innerHeight - (minimized ? MINIMIZED_CHAT_HEIGHT : size.height) - EDGE_GAP,
    },
    size,
    minimized
  );
};

const loadSavedLayout = () => {
  const size = getDefaultSize();
  const position = getDefaultPosition(size, false);

  if (typeof window === 'undefined') {
    return { size, position };
  }

  try {
    const rawLayout = window.localStorage.getItem(CHAT_LAYOUT_STORAGE_KEY);
    if (!rawLayout) return { size, position };

    const parsedLayout = JSON.parse(rawLayout);
    const nextSize = clampSize({
      width: Number(parsedLayout?.size?.width) || size.width,
      height: Number(parsedLayout?.size?.height) || size.height,
    });
    const nextPosition = clampPosition(
      {
        x: Number(parsedLayout?.position?.x) || position.x,
        y: Number(parsedLayout?.position?.y) || position.y,
      },
      nextSize,
      false
    );

    return { size: nextSize, position: nextPosition };
  } catch {
    return { size, position };
  }
};

export default function AiChatWidget() {
  const { isOpen, openChat, closeChat } = useAiChat();
  const { user } = useAuth();
  const savedLayout = loadSavedLayout();
  const [input, setInput] = useState('');
  const [minimized, setMinimized] = useState(false);
  const [size, setSize] = useState(savedLayout.size);
  const [position, setPosition] = useState(savedLayout.position);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am Vidyarthi Mitra AI. Ask me about admissions, exams, fees, scholarships, or college shortlisting.',
      timestamp: new Date(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const dragRef = useRef({ active: false, offsetX: 0, offsetY: 0 });
  const resizeRef = useRef({ active: false, startX: 0, startY: 0, startWidth: 0, startHeight: 0 });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    setPosition((current) => clampPosition(current, size, minimized));
  }, [size, minimized]);

  useEffect(() => {
    const handleResize = () => {
      const nextSize = clampSize(size);
      setSize(nextSize);
      setPosition((current) => clampPosition(current, nextSize, minimized));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [size, minimized]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(
      CHAT_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        size,
        position,
      })
    );
  }, [size, position]);

  const updatePosition = (clientX, clientY) => {
    setPosition(
      clampPosition(
        {
          x: clientX - dragRef.current.offsetX,
          y: clientY - dragRef.current.offsetY,
        },
        size,
        minimized
      )
    );
  };

  const updateSize = (clientX, clientY) => {
    const nextSize = clampSize({
      width: resizeRef.current.startWidth + (clientX - resizeRef.current.startX),
      height: resizeRef.current.startHeight + (clientY - resizeRef.current.startY),
    });

    setSize(nextSize);
    setPosition((current) => clampPosition(current, nextSize, false));
  };

  const handleDragStart = (clientX, clientY, rect) => {
    dragRef.current = {
      active: true,
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top,
    };
  };

  const handleMouseDown = (event) => {
    const rect = event.currentTarget.parentElement.getBoundingClientRect();
    handleDragStart(event.clientX, event.clientY, rect);

    const onMouseMove = (moveEvent) => {
      if (dragRef.current.active) updatePosition(moveEvent.clientX, moveEvent.clientY);
    };

    const onMouseUp = () => {
      dragRef.current.active = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleTouchStart = (event) => {
    const touch = event.touches[0];
    const rect = event.currentTarget.parentElement.getBoundingClientRect();
    handleDragStart(touch.clientX, touch.clientY, rect);
  };

  const handleTouchMove = (event) => {
    if (dragRef.current.active) {
      const touch = event.touches[0];
      updatePosition(touch.clientX, touch.clientY);
      return;
    }

    if (resizeRef.current.active) {
      const touch = event.touches[0];
      updateSize(touch.clientX, touch.clientY);
    }
  };

  const handleTouchEnd = () => {
    dragRef.current.active = false;
    resizeRef.current.active = false;
  };

  const handleResizeMouseDown = (event) => {
    event.preventDefault();
    event.stopPropagation();

    resizeRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: size.width,
      startHeight: size.height,
    };

    const onMouseMove = (moveEvent) => {
      if (resizeRef.current.active) updateSize(moveEvent.clientX, moveEvent.clientY);
    };

    const onMouseUp = () => {
      resizeRef.current.active = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleResizeTouchStart = (event) => {
    event.stopPropagation();
    const touch = event.touches[0];
    resizeRef.current = {
      active: true,
      startX: touch.clientX,
      startY: touch.clientY,
      startWidth: size.width,
      startHeight: size.height,
    };
  };

  const askGemini = async (question) => {
    const trimmed = question.trim();
    if (!trimmed) return;

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
    await askGemini(input);
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

  const resetLayout = () => {
    const defaultSize = getDefaultSize();
    setSize(defaultSize);
    setPosition(getDefaultPosition(defaultSize, minimized));
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
        layoutId="chat-widget"
        className="fixed z-[90] shadow-2xl overflow-hidden"
        style={{ left: position.x, top: position.y }}
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
      layoutId="chat-widget"
      className="fixed z-[90] overflow-hidden rounded-[32px] border border-light-border dark:border-dark-border bg-white dark:bg-dark-card shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
      style={{ left: position.x, top: position.y, width: size.width, height: size.height }}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="flex flex-col h-full">
        <div
          className="flex cursor-move items-center justify-between bg-gradient-to-r from-primary to-primary-light px-5 py-4 text-white select-none shrink-0 border-b border-accent/20"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
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
                <p className="text-[10px] text-white/80 font-medium uppercase tracking-wider">Online</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={resetLayout} title="Reset Layout" className="rounded-full p-2 hover:bg-white/10 transition-colors text-[10px] font-bold uppercase tracking-wider">
              Reset
            </button>
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
                key={index}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`group relative max-w-[85%] rounded-[20px] px-4 py-3 text-sm leading-relaxed shadow-sm ${
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
          <div className="flex flex-wrap gap-2 mb-4">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => askGemini(prompt)}
                className="rounded-full bg-accent/5 hover:bg-accent/10 border border-accent/10 px-3.5 py-1.5 text-xs text-primary font-bold transition-all hover:scale-105 active:scale-95"
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
          <button
            type="button"
            onClick={postLastQuestion}
            className="mt-4 w-full rounded-xl border border-light-border dark:border-dark-border py-2.5 text-xs font-bold text-muted-foreground hover:bg-light-card dark:hover:bg-dark-bg transition-all flex items-center justify-center gap-2 border-dashed"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Post to community for student discussion
          </button>
        </div>
      </div>

      <button
        type="button"
        onMouseDown={handleResizeMouseDown}
        onTouchStart={handleResizeTouchStart}
        className="absolute bottom-0 right-0 h-8 w-8 cursor-se-resize bg-gradient-to-tl from-primary/20 via-primary/10 to-transparent"
        title="Resize chat"
      >
        <span className="absolute bottom-2 right-2 h-3.5 w-3.5 border-b-2 border-r-2 border-primary/80 rounded-br-sm" />
      </button>
    </motion.div>
  );
}
