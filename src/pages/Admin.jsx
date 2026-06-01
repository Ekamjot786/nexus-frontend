import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const api = (path) => axios.get(`/api/auth${path}`);
const del = (path) => axios.delete(`/api/auth${path}`);
const post = (path) => axios.post(`/api/auth${path}`);

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: '#1e1f22', borderRadius: 12, padding: '20px 24px', flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || '#fff' }}>{value}</div>
      <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: '#1e1f22', borderRadius: 12, padding: 24, marginBottom: 20 }}>
      <h3 style={{ margin: '0 0 16px', color: '#fff', fontSize: 16 }}>{title}</h3>
      {children}
    </div>
  );
}

function Table({ cols, rows, renderRow }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c} style={{ textAlign: 'left', padding: '8px 12px', color: '#888', borderBottom: '1px solid #2d2f34', whiteSpace: 'nowrap' }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>{rows.map((row, i) => renderRow(row, i))}</tbody>
      </table>
    </div>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [convs, setConvs] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!user?.is_staff) { navigate('/'); return; }
    loadStats();
  }, [user]);

  useEffect(() => { if (tab === 'stats') loadStats(); }, [tab]);
  useEffect(() => { if (tab === 'users') loadUsers(); }, [tab]);
  useEffect(() => { if (tab === 'conversations') loadConvs(); }, [tab]);

  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const loadStats = async () => {
    try { const { data } = await api('/admin/stats/'); setStats(data); } catch {}
  };
  const loadUsers = async () => {
    setLoading(true);
    try { const { data } = await api('/admin/users/'); setUsers(data); } catch {}
    setLoading(false);
  };
  const loadConvs = async () => {
    setLoading(true);
    try { const { data } = await api('/admin/conversations/'); setConvs(data); } catch {}
    setLoading(false);
  };
  const loadMessages = async (convId) => {
    setSelectedConv(convId);
    try { const { data } = await api(`/admin/conversations/${convId}/messages/`); setMessages(data); } catch {}
  };

  const banUser = async (id, active) => {
    await post(`/admin/users/${id}/${active ? 'ban' : 'unban'}/`);
    notify(active ? 'User banned' : 'User unbanned');
    loadUsers();
  };
  const deleteUser = async (id, username) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    await del(`/admin/users/${id}/delete/`);
    notify('User deleted');
    loadUsers();
  };
  const deleteConv = async (id) => {
    if (!confirm('Delete this conversation and all its messages?')) return;
    await del(`/admin/conversations/${id}/`);
    notify('Conversation deleted');
    loadConvs();
  };
  const deleteMsg = async (id) => {
    await del(`/admin/messages/${id}/`);
    notify('Message deleted');
    loadMessages(selectedConv);
  };

  const tabs = ['stats', 'users', 'conversations'];

  return (
    <div style={{ minHeight: '100vh', background: '#111214', color: '#fff', fontFamily: 'inherit' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: '#3ba55d', color: '#fff', padding: '10px 20px', borderRadius: 8, zIndex: 9999, fontSize: 14 }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background: '#1e1f22', borderBottom: '1px solid #2d2f34', padding: '0 32px', display: 'flex', alignItems: 'center', gap: 32, height: 56 }}>
        <span style={{ fontWeight: 700, fontSize: 16, color: '#7c3aed' }}>✦ Nexus Admin</span>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', height: 56,
            borderBottom: tab === t ? '2px solid #7c3aed' : '2px solid transparent',
            color: tab === t ? '#fff' : '#888', fontSize: 14, textTransform: 'capitalize'
          }}>{t}</button>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 13, color: '#888' }}>Logged in as <b style={{ color: '#fff' }}>{user?.username}</b></div>
      </div>

      <div style={{ padding: '32px', maxWidth: 1100, margin: '0 auto' }}>

        {/* STATS TAB */}
        {tab === 'stats' && stats && (
          <>
            <h2 style={{ margin: '0 0 24px', fontSize: 20 }}>System Overview</h2>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
              <StatCard label="Total Users" value={stats.total_users} color="#7c3aed" />
              <StatCard label="Active Users" value={stats.active_users} color="#3ba55d" />
              <StatCard label="Banned Users" value={stats.banned_users} color="#ed4245" />
              <StatCard label="Total Messages" value={stats.total_messages} color="#5865f2" />
              <StatCard label="Conversations" value={stats.total_conversations} color="#fee75c" />
              <StatCard label="Group Chats" value={stats.group_conversations} color="#eb459e" />
              <StatCard label="DMs" value={stats.dm_conversations} color="#57f287" />
            </div>
          </>
        )}

        {/* USERS TAB */}
        {tab === 'users' && (
          <>
            <h2 style={{ margin: '0 0 24px', fontSize: 20 }}>User Management</h2>
            <Section title={`${users.length} registered users`}>
              {loading ? <div style={{ color: '#888' }}>Loading...</div> : (
                <Table
                  cols={['User', 'Email', 'Joined', 'Last Login', 'Status', 'Actions']}
                  rows={users}
                  renderRow={(u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #2d2f34' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                            {u.username?.[0]?.toUpperCase()}
                          </div>
                          <span>{u.username}</span>
                          {u.is_staff && <span style={{ fontSize: 10, background: '#7c3aed', color: '#fff', borderRadius: 4, padding: '1px 5px' }}>admin</span>}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#aaa' }}>{u.email}</td>
                      <td style={{ padding: '10px 12px', color: '#aaa', whiteSpace: 'nowrap' }}>{new Date(u.date_joined).toLocaleDateString()}</td>
                      <td style={{ padding: '10px 12px', color: '#aaa', whiteSpace: 'nowrap' }}>{u.last_login ? new Date(u.last_login).toLocaleDateString() : '—'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: u.is_active ? '#1a3a25' : '#3a1a1a', color: u.is_active ? '#3ba55d' : '#ed4245' }}>
                          {u.is_active ? 'Active' : 'Banned'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {!u.is_staff && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => banUser(u.id, u.is_active)} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: u.is_active ? '#2d1b1b' : '#1b2d1b', color: u.is_active ? '#ed4245' : '#3ba55d' }}>
                              {u.is_active ? 'Ban' : 'Unban'}
                            </button>
                            <button onClick={() => deleteUser(u.id, u.username)} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#2d1b1b', color: '#ed4245' }}>
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                />
              )}
            </Section>
          </>
        )}

        {/* CONVERSATIONS TAB */}
        {tab === 'conversations' && (
          <>
            <h2 style={{ margin: '0 0 24px', fontSize: 20 }}>Conversations</h2>
            <div style={{ display: 'flex', gap: 20 }}>
              <div style={{ flex: 1 }}>
                <Section title={`${convs.length} conversations`}>
                  {loading ? <div style={{ color: '#888' }}>Loading...</div> : (
                    <Table
                      cols={['Name', 'Type', 'Members', 'Messages', 'Actions']}
                      rows={convs}
                      renderRow={(c) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #2d2f34', cursor: 'pointer', background: selectedConv === c.id ? '#25262b' : 'transparent' }}>
                          <td style={{ padding: '10px 12px' }} onClick={() => loadMessages(c.id)}>{c.name}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: c.is_group ? '#1a2a3a' : '#1a1a3a', color: c.is_group ? '#5865f2' : '#eb459e' }}>
                              {c.is_group ? 'Group' : 'DM'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#aaa' }}>{c.members.join(', ')}</td>
                          <td style={{ padding: '10px 12px', color: '#aaa' }}>{c.message_count}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <button onClick={() => deleteConv(c.id)} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#2d1b1b', color: '#ed4245' }}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      )}
                    />
                  )}
                </Section>
              </div>

              {selectedConv && (
                <div style={{ width: 380, flexShrink: 0 }}>
                  <Section title="Messages">
                    <button onClick={() => setSelectedConv(null)} style={{ fontSize: 12, background: 'none', border: 'none', color: '#888', cursor: 'pointer', marginBottom: 12 }}>← Close</button>
                    <div style={{ maxHeight: 500, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {messages.map(m => (
                        <div key={m.id} style={{ background: '#25262b', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 12, color: m.is_ai ? '#7c3aed' : '#5865f2', marginBottom: 2 }}>{m.sender__username || 'Kin AI'}</div>
                            <div style={{ fontSize: 13, color: '#ddd', wordBreak: 'break-word' }}>{m.content}</div>
                            <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{new Date(m.created_at).toLocaleString()}</div>
                          </div>
                          <button onClick={() => deleteMsg(m.id)} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, border: 'none', cursor: 'pointer', background: '#2d1b1b', color: '#ed4245', flexShrink: 0 }}>
                            Del
                          </button>
                        </div>
                      ))}
                      {messages.length === 0 && <div style={{ color: '#555', fontSize: 13 }}>No messages</div>}
                    </div>
                  </Section>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
