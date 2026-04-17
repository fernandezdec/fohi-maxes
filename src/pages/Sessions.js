import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, isCoach } from '../App';
import { api } from '../api';

export default function Sessions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', session_date: new Date().toISOString().slice(0, 10), notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  function load() {
    api.getSessions().then(setSessions).finally(() => setLoading(false));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const s = await api.createSession(form);
      setShowModal(false);
      setForm({ name: '', session_date: new Date().toISOString().slice(0, 10), notes: '' });
      navigate(`/sessions/${s.id}`);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete session "${name}"? This removes all entries.`)) return;
    await api.deleteSession(id);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Sessions</div>
        {isCoach(user?.role) && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Session</button>
        )}
      </div>

      {loading ? (
        <div className="loading-screen" style={{ minHeight: 200 }}><div className="spinner" /></div>
      ) : sessions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📋</div>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '1.1rem', fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase' }}>No Sessions Yet</div>
          {isCoach(user?.role) && <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>Create First Session</button>}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Session</th>
                <th>Date</th>
                <th>Players</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/sessions/${s.id}`)}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td style={{ fontFamily: 'Barlow Condensed', fontWeight: 700 }}>{s.session_date}</td>
                  <td><span className="badge badge-blue">{s.player_count}</span></td>
                  <td style={{ color: 'var(--mu)', fontSize: '.82rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.notes || '—'}</td>
                  <td onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 6 }}>
                    <Link to={`/sessions/${s.id}`} className="btn btn-sm btn-secondary">Open</Link>
                    {isCoach(user?.role) && (
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s.id, s.name)}>Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">New Testing Session</div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Session Name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Testing #1, Spring Max Out" required autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input className="form-input" type="date" value={form.session_date} onChange={e => setForm({ ...form, session_date: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any notes about this session..." />
              </div>
              <div className="modal-btns">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create & Enter Data'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
