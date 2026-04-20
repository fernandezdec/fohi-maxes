import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth, isCoach } from '../App';
import { api } from '../api';

const LIFTS = ['bench', 'squat', 'power_clean', 'deadlift', 'military_press', 'high_pull'];
const LIFT_LABELS = { squat: 'Squat', bench: 'Bench', deadlift: 'Deadlift', power_clean: 'Power Clean', military_press: 'Mil. Press', high_pull: 'High Pull' };

function calc1RM(weight, reps) {
  if (!weight || !reps || reps <= 0) return null;
  if (parseInt(reps) === 1) return Math.round(weight);
  return Math.round(weight * (1 + reps / 30));
}

export default function SessionEntry() {
  const { id } = useParams();
  const { user } = useAuth();
  const coach = isCoach(user?.role);
  const [session, setSession] = useState(null);
  const [pods, setPods] = useState([]);
  const [activePod, setActivePod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // entryMap: { [playerId]: { [lift]: { weight, reps } } }
  const [entryMap, setEntryMap] = useState({});
  // liveRMs: { [playerId]: { [lift]: one_rm } }
  const [liveRMs, setLiveRMs] = useState({});

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true);
    const [data, podsData] = await Promise.all([api.getSessionData(id), api.getPods()]);
    setSession(data.session);

    // Build pods with their players
    const podMap = {};
    for (const pod of podsData) podMap[pod.id] = { ...pod, players: [] };
    podMap['unassigned'] = { id: 'unassigned', name: 'Unassigned', players: [] };

    for (const player of data.players) {
      const key = player.pod_id || 'unassigned';
      if (podMap[key]) podMap[key].players.push(player);
    }
    const podList = Object.values(podMap).filter(p => p.players.length > 0);
    setPods(podList);
    if (podList.length > 0 && !activePod) setActivePod(podList[0].id);

    // Build entry map from existing data
    const em = {}, rm = {};
    for (const e of data.entries) {
      if (!em[e.player_id]) em[e.player_id] = {};
      if (!rm[e.player_id]) rm[e.player_id] = {};
      em[e.player_id][e.lift] = { weight: e.weight || '', reps: e.reps || '' };
      rm[e.player_id][e.lift] = e.one_rm;
    }
    setEntryMap(em);
    setLiveRMs(rm);
    setLoading(false);
  }

  function handleInput(playerId, lift, field, value) {
    const updated = {
      ...entryMap,
      [playerId]: { ...(entryMap[playerId] || {}), [lift]: { ...(entryMap[playerId]?.[lift] || {}), [field]: value } },
    };
    setEntryMap(updated);
    const entry = updated[playerId][lift];
    const w = parseFloat(entry.weight);
    const r = parseInt(entry.reps);
    const oneRM = calc1RM(w, r);
    setLiveRMs(prev => ({ ...prev, [playerId]: { ...(prev[playerId] || {}), [lift]: oneRM } }));
  }

  async function handleSave() {
    setSaving(true); setSaved(false);
    const currentPod = pods.find(p => p.id === activePod);
    if (!currentPod) { setSaving(false); return; }
    const entries = [];
    for (const player of currentPod.players) {
      for (const lift of LIFTS) {
        const e = entryMap[player.id]?.[lift];
        if (e?.weight || e?.reps) {
          entries.push({ player_id: player.id, lift, weight: parseFloat(e.weight) || null, reps: parseInt(e.reps) || null });
        }
      }
    }
    await api.saveBulk(parseInt(id), entries);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function getTotal(playerId) {
    const rms = liveRMs[playerId] || {};
    const vals = LIFTS.map(l => rms[l]).filter(Boolean);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0);
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const currentPod = pods.find(p => p.id === activePod);

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/sessions" style={{ fontSize: '.78rem', color: 'var(--mu)', textDecoration: 'none', fontFamily: 'Barlow Condensed', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>← Sessions</Link>
          <div className="page-title" style={{ marginTop: 4 }}>{session?.name}</div>
          <div style={{ fontSize: '.85rem', color: 'var(--mu)' }}>{session?.session_date}</div>
        </div>
        {coach && (
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Pod Data'}
          </button>
        )}
      </div>

      {/* Pod tabs */}
      {pods.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {pods.map(pod => (
            <button
              key={pod.id}
              onClick={() => setActivePod(pod.id)}
              className={`btn ${activePod === pod.id ? 'btn-primary' : 'btn-ghost'}`}
            >
              Pod {pod.name} <span style={{ opacity: .7 }}>({pod.players.length})</span>
            </button>
          ))}
        </div>
      )}

      {!currentPod ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ color: 'var(--mu)' }}>No players in any pods for this session.</div>
          {coach && <Link to="/roster" className="btn btn-primary" style={{ marginTop: 16 }}>Assign Players to Pods</Link>}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="entry-table">
            <thead>
              <tr>
                <th className="player-col" rowSpan={2} style={{ padding: '10px 12px' }}>Player</th>
                {LIFTS.map(l => (
                  <th key={l} className="lift-header" colSpan={3}>{LIFT_LABELS[l]}</th>
                ))}
                <th rowSpan={2} style={{ background: 'var(--dark)', color: '#fff', letterSpacing: '.1em' }}>Total</th>
              </tr>
              <tr>
                {LIFTS.map(l => (
                  <React.Fragment key={l}>
                    <th className="lift-group">Wt</th>
                    <th>Reps</th>
                    <th>1RM</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentPod.players.map(player => (
                <tr key={player.id}>
                  <td className="player-col">
                    <Link to={`/players/${player.id}`} style={{ textDecoration: 'none', color: 'var(--dark)', fontWeight: 600 }}>
                      {player.last_name}, {player.first_name}
                    </Link>
                    {player.grade && <div style={{ fontSize: '.72rem', color: 'var(--mu)' }}>Gr. {player.grade}</div>}
                  </td>
                  {LIFTS.map(l => {
                    const e = entryMap[player.id]?.[l] || {};
                    const rm = liveRMs[player.id]?.[l];
                    return (
                      <React.Fragment key={l}>
                        <td className="lift-group">
                          {coach ? (
                            <input className="entry-input" type="number" placeholder="lbs" value={e.weight || ''} onChange={ev => handleInput(player.id, l, 'weight', ev.target.value)} min={0} step={5} />
                          ) : (
                            <span style={{ fontWeight: e.weight ? 600 : 'normal', color: e.weight ? 'var(--dark)' : 'var(--mu)' }}>{e.weight || '—'}</span>
                          )}
                        </td>
                        <td>
                          {coach ? (
                            <input className="entry-input" type="number" placeholder="×" value={e.reps || ''} onChange={ev => handleInput(player.id, l, 'reps', ev.target.value)} min={1} max={30} />
                          ) : (
                            <span style={{ color: 'var(--mu)' }}>{e.reps || '—'}</span>
                          )}
                        </td>
                        <td>
                          <span className="one-rm">{rm ? `${rm}` : '—'}</span>
                        </td>
                      </React.Fragment>
                    );
                  })}
                  <td>
                    <span style={{ fontFamily: 'Barlow Condensed', fontWeight: 900, fontSize: '1rem', color: 'var(--dark)' }}>
                      {getTotal(player.id) || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {coach && currentPod && (
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Pod Data'}
          </button>
        </div>
      )}
    </div>
  );
}
