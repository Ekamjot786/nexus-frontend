import { useState } from 'react';
import axios from 'axios';

export default function NewConversationModal({ onClose, onCreated }) {
  const [tab, setTab] = useState('dm');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);

  const searchUsers = async (q) => {
    setSearch(q);
    if (!q.trim()) return setResults([]);
    const { data } = await axios.get(`/api/auth/users/search/?q=${q}`);
    setResults(data);
  };

  const toggleUser = (user) => {
    setSelected(s => s.find(u => u.id === user.id) ? s.filter(u => u.id !== user.id) : [...s, user]);
  };

  const create = async () => {
    if (!selected.length) return;
    setLoading(true);
    try {
      if (tab === 'dm') {
        const { data } = await axios.post('/api/conversations/dm/', { userId: selected[0].id });
        onCreated(data.id);
      } else {
        if (!groupName.trim()) return;
        const { data } = await axios.post('/api/conversations/group/', { name: groupName, memberIds: selected.map(u => u.id) });
        onCreated(data.id);
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>New Conversation</h3>
        <div className="modal-tabs">
          <button className={`tab ${tab === 'dm' ? 'active' : ''}`} onClick={() => setTab('dm')}>Direct Message</button>
          <button className={`tab ${tab === 'group' ? 'active' : ''}`} onClick={() => setTab('group')}>Group Chat</button>
        </div>
        {tab === 'group' && (
          <div style={{ marginBottom: 16 }}>
            <input placeholder="Group name" value={groupName} onChange={e => setGroupName(e.target.value)} style={{ width: '100%' }} />
          </div>
        )}
        <input placeholder="Search users..." value={search} onChange={e => searchUsers(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
        {selected.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {selected.map(u => (
              <span key={u.id} style={{ background: '#1e2a4a', padding: '4px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer' }} onClick={() => toggleUser(u)}>
                {u.username} ✕
              </span>
            ))}
          </div>
        )}
        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
          {results.map(user => (
            <div key={user.id} className={`user-result ${selected.find(u => u.id === user.id) ? 'selected' : ''}`}
              onClick={() => { toggleUser(user); if (tab === 'dm') { setResults([]); setSearch(''); } }}>
              <div className="conv-avatar" style={{ width: 32, height: 32, fontSize: 13, background: user.color || '#5865f2' }}>
                {user.username[0].toUpperCase()}
              </div>
              <span style={{ fontSize: 14 }}>{user.username}</span>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={create} disabled={loading || !selected.length || (tab === 'group' && !groupName.trim())}>
            {loading ? 'Creating...' : 'Start Chat'}
          </button>
        </div>
      </div>
    </div>
  );
}
