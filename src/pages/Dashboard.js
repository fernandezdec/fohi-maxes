import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, isCoach } from '../App';
import { api } from '../api';

const LIFTS = ['squat', 'bench', 'deadlift', 'power_clean', 'military_press', 'high_pull'];
const LIFT_LABELS = { squat: 'Squat', bench: 'Bench', deadlift: 'Deadlift', power_clean: 'Power Clean', military_press: 'Military Press', high_pull: 'High Pull' };

export default function Dashboard() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [pods, setPods] = useState([]);
  const [myPlayer, setMyPlayer] = useState(null);
  const [myStats, setMyStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getSessions(),
      api.getPods(),
      !isCoach(user?.role) ? api.getMyPlayer() : Promise.resolve(null),
    ]).then(([s, p, mp]) => {
      setSessions(s || []);
      setPods(p || []);
      setMyPlayer(mp);
      if (mp?.id) api.getPlayerStats(mp.id).then(setMyStats);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const recentSessions = sessions.slice(0, 5);

  // For players — find their best lifts
  const bestLifts = {};
  if (myStats?.lifts) {
    for (const lift of LIFTS) {
      const entries = myStats.lifts.filter(e => e.lift === lift && e.one_rm);
      if (entries.length) bestLifts[lift] = Math.max(...entries.map(e => e.one_rm));
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Welcome, <span>{user?.fullName || user?.username}</span></div>
          <div style={{ fontSize: '.85rem', color: 'var(--mu)', marginTop: 2 }}>
            {isCoach(user?.role) ? `Coach — ${pods.length} pods, ${sessions.length} sessions` : myPlayer?.pod_name ? `Pod: ${myPlayer.pod_name}` : 'No pod assigned yet'}
          </div>
        </div>
        {isCoach(user?.role) && (
          <Link to="/sessions" className="btn btn-primary">+ New Session</Link>
        )}
      </div>

      {/* Stats row */}
      {isCoach(user?.role) ? (
        <div className="grid-4" style={{ marginBottom: 20 }}>
          <div className="stat-card"><div className="stat-value">{sessions.length}</div><div className="stat-label">Sessions</div></div>
          <div className="stat-card"><div className="stat-value">{pods.reduce((a, p) => a + (p.player_count || 0), 0)}</div><div className="stat-label">Active Players</div></div>
          <div className="stat-card"><div className="stat-value">{pods.length}</div><div className="stat-label">Pods</div></div>
          <div className="stat-card"><div className="stat-value">{sessions[0]?.session_date?.slice(0, 10) || '—'}</div><div className="stat-label">Last Session</div></div>
        </div>
      ) : (
        <div className="grid-3" style={{ marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-value">{Object.keys(bestLifts).length}</div>
            <div className="stat-label">Lifts Recorded</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{bestLifts.squat ? `${bestLifts.squat} lbs` : '—'}</div>
            <div className="stat-label">Best Squat</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{bestLifts.bench ? `${bestLifts.bench} lbs` : '—'}</div>
            <div className="stat-label">Best Bench</div>
          </div>
        </div>
      )}

      <div className="grid-2">
        {/* Recent Sessions */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Recent Sessions</div>
            <Link to="/sessions" style={{ fontSize: '.78rem', color: 'var(--m)', fontFamily: 'Barlow Condensed', fontWeight: 700, textDecoration: 'none', letterSpacing: '.08em', textTransform: 'uppercase' }}>View All →</Link>
          </div>
          {recentSessions.length === 0 ? (
            <div style={{ color: 'var(--mu)', fontSize: '.88rem', padding: '20px 0', textAlign: 'center' }}>No sessions yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentSessions.map(s => (
                <Link key={s.id} to={`/sessions/${s.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--brd)', borderRadius: 3 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '.9rem', color: 'var(--dark)' }}>{s.name}</div>
                      <div style={{ fontSize: '.78rem', color: 'var(--mu)', marginTop: 2 }}>{s.session_date}</div>
                    </div>
                    <span className="badge badge-blue">{s.player_count} players</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Player: My Bests / Coach: Pods */}
        {isCoach(user?.role) ? (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div className="card-title" style={{ marginBottom: 0 }}>Pods</div>
              <Link to="/pods" style={{ fontSize: '.78rem', color: 'var(--m)', fontFamily: 'Barlow Condensed', fontWeight: 700, textDecoration: 'none', letterSpacing: '.08em', textTransform: 'uppercase' }}>Manage →</Link>
            </div>
            {pods.length === 0 ? (
              <div style={{ color: 'var(--mu)', fontSize: '.88rem', textAlign: 'center', padding: '20px 0' }}>No pods yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pods.map(pod => (
                  <div key={pod.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--brd)', borderRadius: 3 }}>
                    <div style={{ fontFamily: 'Barlow Condensed', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', fontSize: '.95rem' }}>Pod {pod.name}</div>
                    <span className="badge badge-gray">{pod.player_count} players</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="card">
            <div className="card-title">My Best Lifts</div>
            {Object.keys(bestLifts).length === 0 ? (
              <div style={{ color: 'var(--mu)', fontSize: '.88rem', textAlign: 'center', padding: '20px 0' }}>No lifts recorded yet</div>
            ) : (
              <table className="tbl">
                <thead><tr><th>Lift</th><th>Best 1RM</th></tr></thead>
                <tbody>
                  {LIFTS.filter(l => bestLifts[l]).map(l => (
                    <tr key={l}>
                      <td><span className={`lift-${l}`} style={{ fontWeight: 600 }}>{LIFT_LABELS[l]}</span></td>
                      <td style={{ fontFamily: 'Barlow Condensed', fontWeight: 800, fontSize: '1rem' }}>{bestLifts[l]} lbs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {myPlayer?.id && (
              <div style={{ marginTop: 12 }}>
                <Link to={`/players/${myPlayer.id}`} className="btn btn-secondary btn-sm">View Full Stats →</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
