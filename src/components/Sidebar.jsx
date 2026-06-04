import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import NewConversationModal from './NewConversationModal';

function Avatar({ username, color, size = 40, isAI = false, isGroup = false }) {
  const bg = isAI ? '#7c3aed' : isGroup ? '#2d7d46' : (color || '#5865f2');
  return (
    <div style={{ width: size, height: size, borderRadius: isAI || isGroup ? '10px' : '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 600, flexShrink: 0, color: 'white' }}>
      {isAI ? '✦' : isGroup ? '#' : username?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

export default function Sidebar({ activeId, onSelect, wsHook, className }) {
  const { user, logout } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [unread, setUnread] = useState({});
  const activeIdRef = useRef(activeId);

  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  // Clear unread when a conversation is opened
  useEffect(() => {
    if (activeId) setUnread(prev => ({ ...prev, [activeId]: 0 }));
  }, [activeId]);

  const load = async () => {
    const { data } = await axios.get('/api/conversations/');
    setConversations(data);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!wsHook?.on) return;
    const onConvCreated = (data) => {
      load();
      if (data.conversationId) wsHook.emit('join_conversation', { conversationId: data.conversationId });
    };
    const onNewMsg = (data) => {
      setConversations(prev => {
        const exists = prev.find(c => c.id === data.conversationId);
        if (!exists) { load(); return prev; }
        return prev.map(c =>
          c.id === data.conversationId ? { ...c, last_message: data.message.content } : c
        );
      });
      // Increment unread badge if not the active conversation and not own message
      if (data.conversationId !== activeIdRef.current && data.message?.sender_id !== user?.id) {
        setUnread(prev => ({ ...prev, [data.conversationId]: (prev[data.conversationId] || 0) + 1 }));
      }
    };
    wsHook.on('conversation_created', onConvCreated);
    wsHook.on('new_message', onNewMsg);
    return () => { wsHook.off('conversation_created', onConvCreated); wsHook.off('new_message', onNewMsg); };
  }, [wsHook?.on, wsHook?.off, user]);

  const handleCreated = (id) => { setShowModal(false); load(); onSelect(id); };

  return (
    <div className={`sidebar${className ? ' ' + className : ''}`}>
      <div className="sidebar-header">
        <h2>✦ Nexus</h2>
        <button className="btn btn-ghost" style={{ fontSize: 20, padding: '4px 8px' }} onClick={() => setShowModal(true)}>+</button>
      </div>
      <div className="conversation-list" style={{ paddingTop: 8 }}>
        <div className={`conv-item ${activeId === 'ai' ? 'active' : ''}`} onClick={() => onSelect('ai')}>
          <Avatar isAI size={40} />
          <div className="conv-info">
            <div className="conv-name">Kin AI</div>
            <div className="conv-last">Knows all your chats</div>
          </div>
        </div>
        {conversations.length > 0 && <div className="sidebar-section" style={{ marginTop: 8 }}>Messages</div>}
        {conversations.map(conv => (
          <div key={conv.id} className={`conv-item ${activeId === conv.id ? 'active' : ''}`} onClick={() => onSelect(conv.id)}>
            <Avatar username={conv.name} color={conv.other_color} isGroup={!!conv.is_group} size={40} />
            <div className="conv-info">
              <div className="conv-name" style={unread[conv.id] > 0 ? { color: '#fff', fontWeight: 600 } : {}}>{conv.name || 'Unknown'}</div>
              <div className="conv-last" style={unread[conv.id] > 0 ? { color: '#a0a3c0' } : {}}>{conv.last_message || 'No messages yet'}</div>
            </div>
            {unread[conv.id] > 0 && (
              <div style={{
                background: '#5865f2',
                color: '#fff',
                borderRadius: 99,
                minWidth: 20,
                height: 20,
                fontSize: 11,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 5px',
                flexShrink: 0,
              }}>
                {unread[conv.id] > 99 ? '99+' : unread[conv.id]}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="sidebar-footer">
        <div className="user-info">
          <Avatar username={user?.username} color={user?.color} size={32} />
          <div>
            <div className="user-name">{user?.username}</div>
            <div style={{ fontSize: 11, color: '#555870', marginTop: 1 }}>Online</div>
          </div>
        </div>
        <button
          onClick={logout}
          title="Sign out"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: '1px solid #2a2b38',
            borderRadius: 8, padding: '5px 10px',
            color: '#6b7280', fontSize: 12, fontWeight: 500,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#ed4245'; e.currentTarget.style.color = '#ed4245'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2b38'; e.currentTarget.style.color = '#6b7280'; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign out
        </button>
      </div>
      {showModal && <NewConversationModal onClose={() => setShowModal(false)} onCreated={handleCreated} />}
    </div>
  );
}
