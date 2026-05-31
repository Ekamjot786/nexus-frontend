import { useState, useEffect } from 'react';
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

export default function Sidebar({ activeId, onSelect, wsHook }) {
  const { user, logout } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    const { data } = await axios.get('/api/conversations/');
    setConversations(data);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!wsHook?.on) return;
    const onConvCreated = (data) => {
      load();
      // Join the new conversation's room so we receive its messages
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
    };
    wsHook.on('conversation_created', onConvCreated);
    wsHook.on('new_message', onNewMsg);
    return () => { wsHook.off('conversation_created', onConvCreated); wsHook.off('new_message', onNewMsg); };
  }, [wsHook?.on, wsHook?.off]);

  const handleCreated = (id) => { setShowModal(false); load(); onSelect(id); };

  return (
    <div className="sidebar">
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
              <div className="conv-name">{conv.name || 'Unknown'}</div>
              <div className="conv-last">{conv.last_message || 'No messages yet'}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="sidebar-footer">
        <div className="user-info">
          <Avatar username={user?.username} color={user?.color} size={32} />
          <span className="user-name">{user?.username}</span>
        </div>
        <button className="btn btn-ghost" onClick={logout} style={{ fontSize: 18 }} title="Logout">⏻</button>
      </div>
      {showModal && <NewConversationModal onClose={() => setShowModal(false)} onCreated={handleCreated} />}
    </div>
  );
}
