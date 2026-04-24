import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAiChat } from '../context/AiChatContext';

export default function OpenChatRoute() {
  const { openChat } = useAiChat();

  useEffect(() => {
    openChat();
  }, [openChat]);

  return <Navigate to="/" replace />;
}
