import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import GroupCalendar from './GroupCalendar';

function Avatar({ username, color, size = 32, isAI = false, isGroup = false }) {
  const bg = isAI ? '#7c3aed' : isGroup ? '#2d7d46' : (color || '#5865f2');
  return (
    <div style={{ width: size, height: size, borderRadius: isAI || isGroup ? '10px' : '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 600, flexShrink: 0, color: 'white' }}>
      {isAI ? '✦' : isGroup ? '#' : username?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

export default function ChatWindow({ conversationId, wsHook, onBack }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [convName, setConvName] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [input, setInput] = useState('');
  const [askAI, setAskAI] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
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

  const copyInvite = async () => {
    try {
      const { data } = await axios.post(`/api/conversations/${conversationId}/invite/`);
      const link = `${window.location.origin}/invite/${data.invite_code}`;
      await navigator.clipboard.writeText(link);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    } catch {}
  };
  const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (ts) => new Date(ts).toLocaleDateString();
  const memberColor = (id) => members.find(m => m.id === id)?.color;

  let lastDate = null;

  // Determine grouping position for each message
  const getGroupClass = (msgs, idx) => {
    const msg = msgs[idx];
    const prev = msgs[idx - 1];
    const next = msgs[idx + 1];
    const samePrev = prev && prev.sender_id === msg.sender_id && !prev.is_ai && !msg.is_ai;
    const sameNext = next && next.sender_id === msg.sender_id && !next.is_ai && !msg.is_ai;
    if (!samePrev && sameNext) return 'group-start';
    if (samePrev && sameNext) return 'group-middle';
    if (samePrev && !sameNext) return 'group-end';
    return 'group-start'; // solo message, still use group-start styling
  };

  return (
    <div className="chat-area">
      <div className="chat-header">
        {onBack && (
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 22, cursor: 'pointer', marginRight: 4, padding: '0 4px' }}>‹</button>
        )}
        <Avatar username={convName} color={memberColor(members.find(m => m.id !== user.id)?.id)} isGroup={isGroup} size={36} />
        <div style={{ flex: 1 }}>
          <h3>{convName}</h3>
          <div className="members">{members.map(m => m.username).join(', ')}</div>
        </div>
        {isGroup && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowCalendar(true)} title="Group Calendar"
              style={{ background: '#2d2f34', border: 'none', borderRadius: 8, padding: '6px 10px', color: '#fff', cursor: 'pointer', fontSize: 16 }}>
              📅
            </button>
            <button onClick={copyInvite} title="Copy invite link"
              style={{ background: inviteCopied ? '#3ba55d' : '#2d2f34', border: 'none', borderRadius: 8, padding: '6px 10px', color: '#fff', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>
              {inviteCopied ? '✓ Copied!' : '🔗 Invite'}
            </button>
          </div>
        )}
      </div>
      {showCalendar && <GroupCalendar conversationId={conversationId} members={members} onClose={() => setShowCalendar(false)} />}
      <div className="chat-messages">
        {messages.map((msg, idx) => {
          const isOwn = msg.sender_id === user.id;
          const isAI = msg.is_ai;
          const msgDate = formatDate(msg.created_at);
          const showDate = msgDate !== lastDate;
          lastDate = msgDate;
          const color = msg.sender_color || memberColor(msg.sender_id);
          const groupClass = getGroupClass(messages, idx);
          const prev = messages[idx - 1];
          const samePrev = prev && prev.sender_id === msg.sender_id && !prev.is_ai && !msg.is_ai;
          const showAvatar = !isOwn && !samePrev;
          const showSender = !isOwn && !samePrev;
          return (
            <div key={msg.id}>
              {showDate && <div style={{ textAlign: 'center', margin: '14px 0 6px', fontSize: 11, color: '#444' }}>{msgDate}</div>}
              <div className={`message-row ${isOwn ? 'own' : ''} ${groupClass}`}>
                <div className="message-content">
                  {showSender && <div className={`message-sender ${isAI ? 'ai' : ''}`} style={!isAI && color ? { color } : {}}>{isAI ? 'Kin AI' : msg.sender_username}</div>}
                  <div className={`message-bubble ${isOwn ? 'own' : ''} ${isAI ? 'ai' : ''}`}>{msg.content}</div>
                  <div className="message-time">{formatTime(msg.created_at)}</div>
                </div>
              </div>
            </div>
          );
        })}
        {aiLoading && (
          <div className="message-row group-start">
            <div className="message-content">
              <div className="message-sender ai">Kin AI</div>
              <div className="message-bubble ai" style={{ color: '#888' }}>Thinking...</div>
            </div>
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
