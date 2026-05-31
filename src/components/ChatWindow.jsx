import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function Avatar({ username, color, size = 32, isAI = false, isGroup = false }) {
  const bg = isAI ? '#7c3aed' : isGroup ? '#2d7d46' : (color || '#5865f2');
  return (
    <div style={{ width: size, height: size, borderRadius: isAI || isGroup ? '10px' : '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 600, flexShrink: 0, color: 'white' }}>
      {isAI ? '✦' : isGroup ? '#' : username?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

export default function ChatWindow({ conversationId, wsHook }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [convName, setConvName] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [input, setInput] = useState('');
  const [askAI, setAskAI] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!conversationId) return;
    axios.get(`/api/conversations/${conversationId}/messages/`).then(r => setMessages(r.data));
    axios.get(`/api/conversations/${conversationId}/members/`).then(r => setMembers(r.data));
    axios.get('/api/conversations/').then(r => {
      const conv = r.data.find(c => c.id === conversationId);
      if (conv) { setConvName(conv.name || 'Chat'); setIsGroup(!!conv.is_group); }
    });
  }, [conversationId]);

  useEffect(() => {
    if (!wsHook) return;
    const handler = (data) => {
      if (data.conversationId === conversationId) setMessages(m => [...m, data.message]);
    };
    wsHook.on('new_message', handler);
    return () => wsHook.off('new_message', handler);
  }, [wsHook, conversationId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    if (askAI) {
      setAiLoading(true);
      try {
        await axios.post(`/api/ai/ask/${conversationId}/`, { question: text });
        const msgs = await axios.get(`/api/conversations/${conversationId}/messages/`);
        setMessages(msgs.data);
      } finally { setAiLoading(false); }
    } else {
      wsHook?.emit('send_message', { conversationId, content: text });
    }
  };

  const onKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
  const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (ts) => new Date(ts).toLocaleDateString();
  const memberColor = (id) => members.find(m => m.id === id)?.color;

  let lastDate = null;

  return (
    <div className="chat-area">
      <div className="chat-header">
        <Avatar username={convName} color={memberColor(members.find(m => m.id !== user.id)?.id)} isGroup={isGroup} size={36} />
        <div>
          <h3>{convName}</h3>
          <div className="members">{members.map(m => m.username).join(', ')}</div>
        </div>
      </div>
      <div className="chat-messages">
        {messages.map((msg) => {
          const isOwn = msg.sender_id === user.id;
          const isAI = msg.is_ai;
          const msgDate = formatDate(msg.created_at);
          const showDate = msgDate !== lastDate;
          lastDate = msgDate;
          const color = msg.sender_color || memberColor(msg.sender_id);
          return (
            <div key={msg.id}>
              {showDate && <div style={{ textAlign: 'center', margin: '12px 0', fontSize: 12, color: '#555' }}>{msgDate}</div>}
              <div className={`message-row ${isOwn ? 'own' : ''}`}>
                {!isOwn && <Avatar username={isAI ? '' : msg.sender_username} color={color} isAI={isAI} size={32} />}
                <div>
                  {!isOwn && <div className={`message-sender ${isAI ? 'ai' : ''}`} style={!isAI && color ? { color } : {}}>{isAI ? 'Kin AI' : msg.sender_username}</div>}
                  <div className={`message-bubble ${isOwn ? 'own' : ''} ${isAI ? 'ai' : ''}`} style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                  <div className="message-time">{formatTime(msg.created_at)}</div>
                </div>
              </div>
            </div>
          );
        })}
        {aiLoading && (
          <div className="message-row">
            <Avatar isAI size={32} />
            <div><div className="message-sender ai">Kin AI</div><div className="message-bubble ai" style={{ color: '#888' }}>Thinking...</div></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-area">
        <label className="ai-toggle">
          <input type="checkbox" checked={askAI} onChange={e => setAskAI(e.target.checked)} />
          Ask Kin AI about your chats
        </label>
        <div className="chat-input-row">
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKeyDown}
            placeholder={askAI ? 'Ask Kin AI anything...' : 'Message...'} rows={1} />
          <button className="btn btn-primary" onClick={send} disabled={!input.trim() || aiLoading}>Send</button>
        </div>
      </div>
    </div>
  );
}
