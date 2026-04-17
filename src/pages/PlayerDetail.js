import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../api';

const LIFTS = ['squat', 'bench', 'deadlift', 'power_clean', 'military_press', 'high_pull'];
const LIFT_LABELS = { squat: 'Squat', bench: 'Bench', deadlift: 'Deadlift', power_clean: 'Power Clean', military_press: 'Military Press', high_pull: 'High Pull' };
const LIFT_COLORS = { squat: '#7b2d8b', bench: '#2856a0', deadlift: '#c0392b', power_clean: '#d68910', military_press: '#197a4a', high_pull: '#1a5276' };

export default function PlayerDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeLifts, setActiveLifts] = useState(new Set(LIFTS));

  useEffect(() => {
    api.getPlayerStats(id).then(setData).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!data?.player) return <div className="card"><div style={{ color: 'var(--mu)' }}>Player not found</div></div>;

  const { player, lifts } = data;

  // Build chart data: one point per session, with 1RM for each lift
  const sessionMap = {};
  for (const e of lifts) {
    const key = `${e.session_date}|${e.session_name}`;
    if (!sessionMap[key]) sessionMap[key] = { date: e.session_date, session: e.session_name };
    if (e.one_rm) sessionMap[key][e.lift] = e.one_rm;
  }
  const chartData = Object.values(sessionMap).sort((a, b) => a.date.localeCompare(b.date));

  // Best 1RM per lift
  const bests = {};
  for (const lift of LIFTS) {
    const entries = lifts.filter(e => e.lift === lift && e.one_rm);
    if (entries.length) bests[lift] = Math.max(...entries.map(e => e.one_rm));
  }
  const total = Object.values(bests).reduce((a, b) => a + b, 0);

  function toggleLift(lift) {
    const s = new Set(activeLifts);
    if (s.has(lift)) s.delete(lift); else s.add(lift);
    setActiveLifts(s);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/roster" style={{ fontSize: '.78rem', color: 'var(--mu)', textDecoration: 'none', fontFamily: 'Barlow Condensed', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>← Roster</Link>
          <div className="page-title" style={{ marginTop: 4 }}>
            {player.last_name}, <span>{player.first_name}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {player.grade && <span className="badge badge-gray">Grade {player.grade}</span>}
            {player.pod_name && <span className="badge badge-red">Pod {player.pod_name}</span>}
            {player.student_id && <span className="badge badge-blue">ID: {player.student_id}</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '2rem', fontWeight: 900, color: 'var(--m)' }}>{total || '—'}</div>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '.6rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--mu)' }}>Total Best 1RM (lbs)</div>
        </div>
      </div>

      {/* Best lifts grid */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        {LIFTS.map(lift => (
          <div key={lift} className="stat-card" style={{ borderTop: `3px solid ${LIFT_COLORS[lift]}` }}>
            <div className="stat-value" style={{ color: LIFT_COLORS[lift] }}>{bests[lift] || '—'}</div>
            <div className="stat-label" style={{ color: LIFT_COLORS[lift], opacity: .8 }}>{LIFT_LABELS[lift]} 1RM</div>
          </div>
        ))}
      </div>

      {/* Progress Chart */}
      {chartData.length > 1 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>1RM Progress</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {LIFTS.map(lift => (
                <button key={lift} onClick={() => toggleLift(lift)} className={`btn btn-sm ${activeLifts.has(lift) ? 'btn-secondary' : 'btn-ghost'}`}
                  style={{ borderColor: activeLifts.has(lift) ? LIFT_COLORS[lift] : undefined, color: activeLifts.has(lift) ? LIFT_COLORS[lift] : undefined }}>
                  {LIFT_LABELS[lift]}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e4df" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(val, name) => [`${val} lbs`, LIFT_LABELS[name] || name]} />
              {LIFTS.filter(l => activeLifts.has(l)).map(lift => (
                <Line key={lift} type="monotone" dataKey={lift} stroke={LIFT_COLORS[lift]} strokeWidth={2} dot={{ r: 4 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-title" style={{ padding: '16px 20px', borderBottom: '1px solid var(--brd)', marginBottom: 0 }}>Session History</div>
        {lifts.length === 0 ? (
          <div className="loading-cell">No data recorded yet</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Session</th>
                <th>Date</th>
                <th>Lift</th>
                <th>Weight × Reps</th>
                <th>1RM</th>
              </tr>
            </thead>
            <tbody>
              {[...lifts].reverse().map((e, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{e.session_name}</td>
                  <td style={{ fontFamily: 'Barlow Condensed', fontWeight: 700 }}>{e.session_date}</td>
                  <td><span className={`lift-${e.lift}`} style={{ fontWeight: 600 }}>{LIFT_LABELS[e.lift]}</span></td>
                  <td style={{ color: 'var(--mu)' }}>{e.weight && e.reps ? `${e.weight} × ${e.reps}` : '—'}</td>
                  <td style={{ fontFamily: 'Barlow Condensed', fontWeight: 800, fontSize: '1rem' }}>{e.one_rm ? `${e.one_rm} lbs` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
