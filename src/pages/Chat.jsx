import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import AIChat from '../components/AIChat';

export default function Chat() {
  const { token, user } = useAuth();
  const [activeConv, setActiveConv] = useState(null);
  const [taskToast, setTaskToast] = useState(null);
  const wsHook = useWebSocket(token);

  useEffect(() => {
    if (!wsHook?.on) return;
    const handler = (data) => {
      // Don't notify the person who created the task
      if (data.task.created_by === user?.username) return;
      setTaskToast(data.task);
      setTimeout(() => setTaskToast(null), 4000);
    };
    wsHook.on('new_task', handler);
    return () => wsHook.off('new_task', handler);
  }, [wsHook?.on, user]);

  const handleSelect = (id) => {
    setActiveConv(id);
    if (id !== 'ai') wsHook.emit('join_conversation', { conversationId: id });
  };

  return (
    <div className="app-layout">
      {taskToast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: '#5865f2', color: '#fff', borderRadius: 12,
          padding: '14px 18px', maxWidth: 300, boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>📅 New task added</div>
          <div style={{ fontSize: 14 }}><b>{taskToast.title}</b></div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
            Due {taskToast.due_date} · by {taskToast.created_by}
          </div>
          {taskToast.assigned_to?.length > 0 && (
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Assigned to: {taskToast.assigned_to.map(u => u.username).join(', ')}
            </div>
          )}
        </div>
      )}
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
