import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Invite() {
  const { code } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    axios.get(`/api/conversations/invite/${code}/`)
      .then(r => setInfo(r.data))
      .catch(() => setError('This invite link is invalid or has expired.'));
  }, [code]);

  const join = async () => {
    if (!user) { navigate(`/login?next=/invite/${code}`); return; }
    setJoining(true);
    try {
      const { data } = await axios.post(`/api/conversations/invite/${code}/join/`);
      navigate('/');
    } catch {
      setError('Failed to join. Try again.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#111214', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1e1f22', borderRadius: 16, padding: 40, width: 360, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>You've been invited to join</div>
        {error ? (
          <div style={{ color: '#ed4245', marginTop: 16 }}>{error}</div>
        ) : info ? (
          <>
            <h2 style={{ margin: '0 0 8px', color: '#fff', fontSize: 22 }}>{info.name}</h2>
            <div style={{ color: '#888', fontSize: 13, marginBottom: 28 }}>{info.member_count} members</div>
            {user ? (
              <button onClick={join} disabled={joining} style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: '#5865f2', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                {joining ? 'Joining...' : 'Accept Invite'}
              </button>
            ) : (
              <button onClick={join} style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: '#5865f2', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                Log in to Join
              </button>
            )}
          </>
        ) : (
          <div style={{ color: '#888' }}>Loading...</div>
        )}
      </div>
    </div>
  );
}
