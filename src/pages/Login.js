import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../App';
import { api } from '../api';

export default function Login() {
  const { handleLogin } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ssoToken = params.get('sso_token');
    if (ssoToken) {
      setLoading(true);
      api.sso(ssoToken).then(data => {
        if (data?.token) { handleLogin(data.token, data.user); navigate('/dashboard', { replace: true }); }
        else { setError('SSO failed'); setLoading(false); }
      }).catch(() => { setError('SSO error'); setLoading(false); });
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await api.login(username, password);
      handleLogin(data.token, data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 8 }}>💪</div>
        <div style={{ fontFamily: 'Barlow Condensed', fontSize: '.65rem', fontWeight: 700, letterSpacing: '.3em', textTransform: 'uppercase', color: 'var(--m3)', marginBottom: 4 }}>FOHI Steelers</div>
        <h1 style={{ fontFamily: 'Barlow Condensed', fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--dark)', marginBottom: 28 }}>
          Strength <span style={{ color: 'var(--m)' }}>Maxes</span>
        </h1>
        {loading && params.get('sso_token') ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
            <p style={{ marginTop: 16, color: 'var(--mu)', fontSize: '.9rem' }}>Signing in...</p>
          </div>
        ) : (
          <div className="card">
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input className="form-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" />
              </div>
              <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
