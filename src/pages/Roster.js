import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Roster() {
  const [players, setPlayers] = useState([]);
  const [pods, setPods] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editPlayer, setEditPlayer] = useState(null);
  const [form, setForm] = useState({ last_name: '', first_name: '', grade: '', student_id: '', pod_id: '', username: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const [pl, po, dups] = await Promise.all([api.getPlayers(), api.getPods(), api.getDuplicates()]);
    setPlayers(pl || []); setPods(po || []); setDuplicates(dups || []);
    setLoading(false);
  }

  async function deleteDuplicate(id) {
    if (!window.confirm('Delete this duplicate player record? Lift history for this record will also be deleted.')) return;
    await api.updatePlayer(id, { is_active: 0 });
    load();
  }

  function openNew() {
    setEditPlayer(null);
    setForm({ last_name: '', first_name: '', grade: '', student_id: '', pod_id: '', username: '' });
    setError(''); setShowModal(true);
  }

  function openEdit(player) {
    setEditPlayer(player);
    setForm({ last_name: player.last_name, first_name: player.first_name, grade: player.grade || '', student_id: player.student_id || '', pod_id: player.pod_id || '', username: player.username || '' });
    setError(''); setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const data = { ...form, grade: form.grade ? parseInt(form.grade) : null, pod_id: form.pod_id ? parseInt(form.pod_id) : null };
      if (editPlayer) await api.updatePlayer(editPlayer.id, { ...data, is_active: 1 });
      else await api.createPlayer(data);
      setShowModal(false); load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function toggleActive(player) {
    await api.updatePlayer(player.id, { ...player, is_active: player.is_active ? 0 : 1 });
    load();
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Roster <span style={{ fontSize: '1rem', color: 'var(--mu)', fontWeight: 400 }}>({players.length} players)</span></div>
        <button className="btn btn-primary" onClick={openNew}>+ Add Player</button>
      </div>

      {duplicates.length > 0 && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 6, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontFamily: 'Barlow Condensed', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '.1em', textTransform: 'uppercase', color: '#856404', marginBottom: 8 }}>
            ⚠ Duplicate Players Detected — Review &amp; Remove
          </div>
          {duplicates.map((group, gi) => (
            <div key={gi} style={{ marginBottom: gi < duplicates.length - 1 ? 12 : 0 }}>
              <div style={{ fontSize: '.78rem', color: '#555', marginBottom: 4, fontWeight: 600 }}>
                {group[0].last_name}, {group[0].first_name} — {group.length} records found:
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,.04)' }}>
                    <th style={{ padding: '4px 8px', textAlign: 'left' }}>Name</th>
                    <th style={{ padding: '4px 8px', textAlign: 'left' }}>Pod</th>
                    <th style={{ padding: '4px 8px', textAlign: 'left' }}>Student ID</th>
                    <th style={{ padding: '4px 8px', textAlign: 'left' }}>Username</th>
                    <th style={{ padding: '4px 8px', textAlign: 'left' }}>Lifts</th>
                    <th style={{ padding: '4px 8px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {group.map((p, pi) => (
                    <tr key={p.id} style={{ background: pi === 0 ? 'rgba(0,128,0,.05)' : 'rgba(220,53,69,.05)' }}>
                      <td style={{ padding: '4px 8px', fontWeight: 600 }}>{p.last_name}, {p.first_name}</td>
                      <td style={{ padding: '4px 8px' }}>{p.pod_name || '—'}</td>
                      <td style={{ padding: '4px 8px' }}>{p.student_id || '—'}</td>
                      <td style={{ padding: '4px 8px' }}>{p.username || '—'}</td>
                      <td style={{ padding: '4px 8px' }}>{p.lift_count}</td>
                      <td style={{ padding: '4px 8px' }}>
                        {pi === 0
                          ? <span style={{ fontSize: '.7rem', color: '#2a7', fontWeight: 700 }}>KEEP</span>
                          : <button className="btn btn-sm" style={{ background: '#dc3545', color: '#fff', padding: '2px 10px', fontSize: '.72rem' }} onClick={() => deleteDuplicate(p.id)}>Remove</button>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Name</th>
              <th>Grade</th>
              <th>Student ID</th>
              <th>Pod</th>
              <th>Username</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {players.length === 0 ? (
              <tr><td colSpan={6} className="loading-cell">No players yet</td></tr>
            ) : players.map(player => (
              <tr key={player.id}>
                <td>
                  <Link to={`/players/${player.id}`} style={{ textDecoration: 'none', color: 'var(--dark)', fontWeight: 600 }}>
                    {player.last_name}, {player.first_name}
                  </Link>
                </td>
                <td>{player.grade ? <span className="badge badge-gray">Gr. {player.grade}</span> : '—'}</td>
                <td style={{ color: 'var(--mu)', fontSize: '.85rem' }}>{player.student_id || '—'}</td>
                <td>{player.pod_name ? <span className="badge badge-red">Pod {player.pod_name}</span> : <span style={{ color: 'var(--mu)', fontSize: '.82rem' }}>Unassigned</span>}</td>
                <td style={{ color: 'var(--mu)', fontSize: '.82rem' }}>{player.username || '—'}</td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm btn-secondary" onClick={() => openEdit(player)}>Edit</button>
                  <Link to={`/players/${player.id}`} className="btn btn-sm btn-ghost">Stats</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">{editPlayer ? 'Edit Player' : 'Add Player'}</div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSave}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Last Name *</label>
                  <input className="form-input" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} required autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">First Name *</label>
                  <input className="form-input" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Grade</label>
                  <input className="form-input" type="number" min={9} max={12} value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })} placeholder="9–12" />
                </div>
                <div className="form-group">
                  <label className="form-label">Student ID</label>
                  <input className="form-input" value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} placeholder="e.g. 123456" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Pod</label>
                  <select className="form-select" value={form.pod_id} onChange={e => setForm({ ...form, pod_id: e.target.value })}>
                    <option value="">Unassigned</option>
                    {pods.map(pod => <option key={pod.id} value={pod.id}>Pod {pod.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">CoachFern Username</label>
                  <input className="form-input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="Links SSO login" />
                </div>
              </div>
              <div className="modal-btns">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editPlayer ? 'Save Changes' : 'Add Player'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
