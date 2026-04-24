import { createContext, useContext, useMemo, useState } from 'react';

const AiChatContext = createContext(null);

export function AiChatProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const value = useMemo(() => ({
    isOpen,
    openChat: () => setIsOpen(true),
    closeChat: () => setIsOpen(false),
  }), [isOpen]);

  return <AiChatContext.Provider value={value}>{children}</AiChatContext.Provider>;
}

export function useAiChat() {
  const context = useContext(AiChatContext);
  if (!context) throw new Error('useAiChat must be used within AiChatProvider');
  return context;
}
