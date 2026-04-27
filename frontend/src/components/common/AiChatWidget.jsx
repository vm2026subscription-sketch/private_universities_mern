import { useRef, useState } from 'react';
import { Bot, MessageSquare, Minimize2, Send, Sparkles, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useAiChat } from '../../context/AiChatContext';

const QUICK_PROMPTS = [
  'Best private university for B.Tech CSE?',
  'Top MBA options under 15 lakh?',
  'Which colleges should I target based on my JEE rank?',
];

const DEFAULT_POSITION = { x: 24, y: 24 };

export default function AiChatWidget() {
  const { isOpen, openChat, closeChat } = useAiChat();
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState(DEFAULT_POSITION);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am Vidyarthi Mitra AI. Ask me about admissions, exams, fees, scholarships, or college shortlisting.',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const dragRef = useRef({ active: false, offsetX: 0, offsetY: 0 });

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-[70] group">
        <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-dark-card border border-light-border dark:border-dark-border px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap text-xs font-semibold">
          Ask Vidyarthi Mitra AI ✨
        </div>
        <button
          type="button"
          onClick={openChat}
          className="rounded-full bg-primary p-4 text-white shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 animate-ping rounded-full" />
          <Bot className="w-6 h-6 relative z-10" />
        </button>
      </div>
    );
  }

  const updatePosition = (clientX, clientY) => {
    const nextX = Math.max(12, Math.min(window.innerWidth - 380, clientX - dragRef.current.offsetX));
    const nextY = Math.max(12, Math.min(window.innerHeight - (minimized ? 76 : 640), clientY - dragRef.current.offsetY));
    setPosition({ x: nextX, y: nextY });
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
    if (!dragRef.current.active) return;
    const touch = event.touches[0];
    updatePosition(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    dragRef.current.active = false;
  };

  const askGemini = async (question) => {
    const trimmed = question.trim();
    if (!trimmed) return;

    setMessages((current) => [...current, { role: 'user', content: trimmed }]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/questions/assist', {
        title: trimmed,
        content: trimmed,
        category: 'admissions',
      });
      setMessages((current) => [...current, { role: 'assistant', content: data.data?.suggestion || 'I could not generate a response right now.' }]);
    } catch (error) {
      setMessages((current) => [...current, { role: 'assistant', content: error.response?.data?.message || 'AI assistance is unavailable right now.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await askGemini(input);
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

  if (minimized) {
    return (
      <div
        className="fixed z-[70]"
        style={{ left: position.x, top: position.y }}
      >
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="rounded-full bg-primary px-4 py-3 text-sm font-medium text-white shadow-2xl inline-flex items-center gap-2"
        >
          <Bot className="w-4 h-4" />
          Vidyarthi Mitra AI
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed z-[70] w-full max-w-sm overflow-hidden rounded-[28px] border border-light-border dark:border-dark-border bg-white dark:bg-dark-card shadow-2xl"
      style={{ left: position.x, top: position.y }}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div>
        <div
          className="flex cursor-move items-center justify-between bg-primary px-4 py-3 text-white select-none"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-white/20 p-2">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-sm">Vidyarthi Mitra AI</p>
              <p className="text-[11px] text-white/80">Student help chat</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setMinimized(true)} className="rounded-full p-2 hover:bg-white/10">
              <Minimize2 className="w-4 h-4" />
            </button>
            <button type="button" onClick={closeChat} className="rounded-full p-2 hover:bg-white/10">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[56vh] overflow-y-auto p-4 space-y-3 bg-light-card/40 dark:bg-dark-bg/40">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                message.role === 'user'
                  ? 'bg-primary text-white'
                  : 'bg-white dark:bg-dark-card border border-light-border dark:border-dark-border'
              }`}>
                {message.content}
              </div>
            </div>
          ))}
          {loading ? (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-white dark:bg-dark-card border border-light-border dark:border-dark-border inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                Thinking...
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-light-border dark:border-dark-border p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {QUICK_PROMPTS.map((prompt) => (
              <button key={prompt} type="button" onClick={() => askGemini(prompt)} className="rounded-full bg-primary-50 px-3 py-1.5 text-xs text-primary">
                {prompt}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <textarea
              rows="2"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type your question..."
              className="input-field min-h-[52px] resize-none"
            />
            <button type="submit" disabled={loading || !input.trim()} className="btn-primary !px-4 !py-3 inline-flex items-center justify-center">
              <Send className="w-4 h-4" />
            </button>
          </form>
          <button type="button" onClick={postLastQuestion} className="mt-3 w-full rounded-xl border border-light-border dark:border-dark-border py-3 text-sm font-medium hover:bg-light-card dark:hover:bg-dark-bg inline-flex items-center justify-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Post last question to community
          </button>
        </div>
      </div>
    </div>
  );
}
