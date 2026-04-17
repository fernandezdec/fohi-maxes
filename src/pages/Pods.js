import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Pods() {
  const [pods, setPods] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewPod, setShowNewPod] = useState(false);
  const [newPodName, setNewPodName] = useState('');
  const [editPod, setEditPod] = useState(null);
  const [showAssign, setShowAssign] = useState(null); // pod id
  const [unassigned, setUnassigned] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    const [p, pl] = await Promise.all([api.getPods(), api.getPlayers()]);
    setPods(p || []);
    setPlayers(pl || []);
    setUnassigned((pl || []).filter(p => !p.pod_id));
    setLoading(false);
  }

  async function createPod() {
    if (!newPodName.trim()) return;
    try {
      await api.createPod(newPodName.trim());
      setNewPodName(''); setShowNewPod(false);
      load();
    } catch (e) { setError(e.message); }
  }

  async function savePodName() {
    if (!editPod?.name?.trim()) return;
    await api.updatePod(editPod.id, editPod.name);
    setEditPod(null); load();
  }

  async function deletePod(pod) {
    if (!window.confirm(`Delete Pod ${pod.name}? Players will be unassigned.`)) return;
    await api.deletePod(pod.id); load();
  }

  async function removeFromPod(playerId) {
    await api.assignPod(playerId, null); load();
  }

  async function assignToPod(playerId, podId) {
    await api.assignPod(playerId, podId); load();
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Pods</div>
        <button className="btn btn-primary" onClick={() => setShowNewPod(true)}>+ New Pod</button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}

      {/* Unassigned players banner */}
      {unassigned.length > 0 && (
        <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span>{unassigned.length} player{unassigned.length !== 1 ? 's' : ''} not assigned to a pod</span>
          <button className="btn btn-sm btn-secondary" onClick={() => setShowAssign('unassigned')}>Assign →</button>
        </div>
      )}

      <div className="grid-2">
        {pods.map(pod => {
          const podPlayers = players.filter(p => p.pod_id === pod.id);
          return (
            <div key={pod.id} className="pod-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                {editPod?.id === pod.id ? (
                  <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                    <input className="form-input" value={editPod.name} onChange={e => setEditPod({ ...editPod, name: e.target.value })} style={{ flex: 1 }} autoFocus onKeyDown={e => e.key === 'Enter' && savePodName()} />
                    <button className="btn btn-sm btn-primary" onClick={savePodName}>Save</button>
                    <button className="btn btn-sm btn-secondary" onClick={() => setEditPod(null)}>Cancel</button>
                  </div>
                ) : (
                  <div>
                    <div className="pod-name">Pod {pod.name}</div>
                    <div className="pod-count">{podPlayers.length} player{podPlayers.length !== 1 ? 's' : ''}</div>
                  </div>
                )}
                {editPod?.id !== pod.id && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => setEditPod({ id: pod.id, name: pod.name })}>Rename</button>
                    <button className="btn btn-sm btn-primary" onClick={() => setShowAssign(pod.id)}>+ Add Players</button>
                    <button className="btn btn-sm btn-danger" onClick={() => deletePod(pod)}>Delete</button>
                  </div>
                )}
              </div>

              <div className="pod-players">
                {podPlayers.length === 0 ? (
                  <div style={{ color: 'var(--mu)', fontSize: '.82rem', padding: '12px 0', textAlign: 'center' }}>No players — click Add Players</div>
                ) : (
                  podPlayers.map(player => (
                    <div key={player.id} className="pod-player-row">
                      <div>
                        <Link to={`/players/${player.id}`} style={{ textDecoration: 'none', color: 'var(--dark)', fontWeight: 600 }}>
                          {player.last_name}, {player.first_name}
                        </Link>
                        {player.grade && <span className="badge badge-gray" style={{ marginLeft: 6 }}>Gr. {player.grade}</span>}
                      </div>
                      <button className="btn btn-sm btn-danger" onClick={() => removeFromPod(player.id)} title="Remove from pod">✕</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}

        {pods.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 40, gridColumn: '1/-1' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>🏋️</div>
            <div style={{ color: 'var(--mu)' }}>No pods yet. Create your first pod to get started.</div>
          </div>
        )}
      </div>

      {/* New Pod Modal */}
      {showNewPod && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowNewPod(false)}>
          <div className="modal" style={{ maxWidth: 360 }}>
            <div className="modal-title">New Pod</div>
            <div className="form-group">
              <label className="form-label">Pod Name</label>
              <input className="form-input" value={newPodName} onChange={e => setNewPodName(e.target.value)} placeholder="e.g. Able, Baker, Charlie..." autoFocus onKeyDown={e => e.key === 'Enter' && createPod()} />
            </div>
            <div className="modal-btns">
              <button className="btn btn-secondary" onClick={() => setShowNewPod(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createPod}>Create Pod</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Players Modal */}
      {showAssign && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAssign(null)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-title">
              {showAssign === 'unassigned' ? 'Assign Unassigned Players' : `Add Players to Pod ${pods.find(p => p.id === showAssign)?.name}`}
            </div>
            <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(showAssign === 'unassigned' ? unassigned : players.filter(p => p.pod_id !== showAssign)).map(player => (
                <div key={player.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg)', borderRadius: 3 }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{player.last_name}, {player.first_name}</span>
                    {player.grade && <span className="badge badge-gray" style={{ marginLeft: 6 }}>Gr. {player.grade}</span>}
                    {player.pod_name && <span className="badge badge-blue" style={{ marginLeft: 4 }}>Pod {player.pod_name}</span>}
                  </div>
                  {showAssign !== 'unassigned' ? (
                    <button className="btn btn-sm btn-primary" onClick={() => assignToPod(player.id, showAssign)}>Add</button>
                  ) : (
                    <select className="form-select" style={{ width: 'auto', fontSize: '.82rem', padding: '4px 8px' }}
                      defaultValue=""
                      onChange={e => { if (e.target.value) assignToPod(player.id, parseInt(e.target.value)); }}>
                      <option value="">Assign to pod...</option>
                      {pods.map(pod => <option key={pod.id} value={pod.id}>Pod {pod.name}</option>)}
                    </select>
                  )}
                </div>
              ))}
              {(showAssign === 'unassigned' ? unassigned : players.filter(p => p.pod_id !== showAssign)).length === 0 && (
                <div style={{ color: 'var(--mu)', textAlign: 'center', padding: 24 }}>All players already in this pod</div>
              )}
            </div>
            <div className="modal-btns">
              <button className="btn btn-secondary" onClick={() => setShowAssign(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
