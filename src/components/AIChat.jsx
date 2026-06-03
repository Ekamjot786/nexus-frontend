import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function AIChat({ onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { axios.get('/api/ai/chat/history/').then(r => setMessages(r.data)); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', content: text, created_at: new Date().toISOString() }]);
    setLoading(true);
    try {
      const { data } = await axios.post('/api/ai/chat/', { message: text });
      setMessages(m => [...m, { role: 'assistant', content: data.reply, created_at: new Date().toISOString() }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Something went wrong.', created_at: new Date().toISOString() }]);
    } finally { setLoading(false); }
  };

  const clear = async () => { await axios.delete('/api/ai/chat/clear/'); setMessages([]); };
  const onKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <div className="ai-page chat-area">
      <div className="chat-header">
        {onBack && (
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 22, cursor: 'pointer', marginRight: 4, padding: '0 4px' }}>‹</button>
        )}
        <div className="conv-avatar ai" style={{ width: 36, height: 36, fontSize: 16, borderRadius: 10 }}>✦</div>
        <div style={{ flex: 1 }}>
          <h3>Kin AI</h3>
          <div className="members">Private conversation · knows all your chats</div>
        </div>
        <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={clear}>Clear history</button>
      </div>
      <div className="chat-messages">
        {messages.length === 0 && !loading && (
          <div className="empty-state">
            <div style={{ fontSize: 48 }}>✦</div>
            <h3>Ask Kin anything</h3>
            <p>I know all your conversations and remember our chats</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`message-row ${msg.role === 'user' ? 'own' : ''}`}>
            {msg.role === 'assistant' && <div className="conv-avatar ai" style={{ width: 32, height: 32, fontSize: 12, alignSelf: 'flex-end', borderRadius: 8 }}>✦</div>}
            <div>
              {msg.role === 'assistant' && <div className="message-sender ai">Kin AI</div>}
              <div className={`message-bubble ${msg.role === 'user' ? 'own' : 'ai'}`} style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
              <div className="message-time">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="message-row">
            <div className="conv-avatar ai" style={{ width: 32, height: 32, fontSize: 12, alignSelf: 'flex-end', borderRadius: 8 }}>✦</div>
            <div className="message-bubble ai" style={{ color: '#888' }}>Thinking...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-area">
        <div className="chat-input-row">
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKeyDown} placeholder="Message Kin AI..." rows={1} disabled={loading} />
          <button className="btn btn-primary" onClick={send} disabled={!input.trim() || loading}>Send</button>
        </div>
      </div>
    </div>
  );
}
