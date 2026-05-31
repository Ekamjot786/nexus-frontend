import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import AIChat from '../components/AIChat';

export default function Chat() {
  const { token } = useAuth();
  const [activeConv, setActiveConv] = useState(null);
  const wsHook = useWebSocket(token);

  const handleSelect = (id) => {
    setActiveConv(id);
    if (id !== 'ai') wsHook.emit('join_conversation', { conversationId: id });
  };

  return (
    <div className="app-layout">
      <Sidebar activeId={activeConv} onSelect={handleSelect} wsHook={wsHook} />
      {activeConv === null && (
        <div className="empty-state" style={{ flex: 1 }}>
          <div style={{ fontSize: 48 }}>💬</div>
          <h3>Select a conversation</h3>
          <p>Choose from the sidebar or start a new one</p>
        </div>
      )}
      {activeConv === 'ai' && <AIChat />}
      {activeConv && activeConv !== 'ai' && <ChatWindow conversationId={activeConv} wsHook={wsHook} />}
    </div>
  );
}
