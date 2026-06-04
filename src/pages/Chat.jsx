import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import AIChat from '../components/AIChat';

export default function Chat() {
  const { token, user } = useAuth();
  const [activeConv, setActiveConv] = useState(null);
  const [taskToast, setTaskToast] = useState(null);
  const [msgToasts, setMsgToasts] = useState([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);
  const wsHook = useWebSocket(token);
  const activeConvRef = useRef(activeConv);

  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // New message notifications
  useEffect(() => {
    if (!wsHook?.on) return;
    const handler = (data) => {
      const { conversationId: convId, message } = data;
      if (!message) return;
      if (message.sender_id === user?.id) return;
      if (message.is_ai) return;
      if (convId === activeConvRef.current && document.hasFocus()) return;

      // In-app toast (always works)
      const id = Date.now() + Math.random();
      setMsgToasts(prev => [...prev.slice(-2), { id, convId, message }]);
      setTimeout(() => setMsgToasts(prev => prev.filter(t => t.id !== id)), 5000);

      // Browser notification (when permission granted)
      if ('Notification' in window && Notification.permission === 'granted') {
        const notif = new Notification(message.sender_username || 'New message', {
          body: message.content?.slice(0, 100) || '',
          icon: '/favicon.ico',
          tag: `nexus-${convId}`,
        });
        notif.onclick = () => { window.focus(); notif.close(); };
      }
    };
    wsHook.on('new_message', handler);
    return () => wsHook.off('new_message', handler);
  }, [wsHook?.on, user]);

  useEffect(() => {
    if (!wsHook?.on) return;
    const handler = (data) => {
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
    if (isMobile) setShowSidebar(false);
  };

  const handleBack = () => {
    setActiveConv(null);
    setShowSidebar(true);
  };

  const dismissToast = (id) => setMsgToasts(prev => prev.filter(t => t.id !== id));

  return (
    <div className="app-layout">

      {/* Message notification toasts */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
        {msgToasts.map(toast => (
          <div key={toast.id}
            onClick={() => { handleSelect(toast.convId); dismissToast(toast.id); }}
            style={{
              background: '#1e1f2e',
              border: '1px solid #2e3050',
              borderLeft: `4px solid ${toast.message.sender_color || '#5865f2'}`,
              borderRadius: 12,
              padding: '12px 14px',
              width: 300,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              cursor: 'pointer',
              animation: 'slideIn 0.2s ease',
              position: 'relative',
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: toast.message.sender_color || '#5865f2' }}>
                {toast.message.sender_username}
              </span>
              <span onClick={e => { e.stopPropagation(); dismissToast(toast.id); }}
                style={{ color: '#555', fontSize: 16, lineHeight: 1, cursor: 'pointer', padding: '0 2px' }}>×</span>
            </div>
            <div style={{ fontSize: 13, color: '#a0a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {toast.message.content}
            </div>
          </div>
        ))}
      </div>

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

      <Sidebar
        activeId={activeConv}
        onSelect={handleSelect}
        wsHook={wsHook}
        className={isMobile && !showSidebar ? 'hidden' : ''}
      />

      {/* On mobile, only show chat when a conv is selected */}
      {(!isMobile || !showSidebar) && (
        <>
          {activeConv === null && !isMobile && (
            <div className="empty-state" style={{ flex: 1 }}>
              <div style={{ fontSize: 48 }}>💬</div>
              <h3>Select a conversation</h3>
              <p>Choose from the sidebar or start a new one</p>
            </div>
          )}
          {activeConv === 'ai' && <AIChat onBack={isMobile ? handleBack : null} />}
          {activeConv && activeConv !== 'ai' && (
            <ChatWindow conversationId={activeConv} wsHook={wsHook} onBack={isMobile ? handleBack : null} />
          )}
        </>
      )}
    </div>
  );
}
