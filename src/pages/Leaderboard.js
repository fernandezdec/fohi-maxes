import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const LIFTS = ['total', 'squat', 'bench', 'deadlift', 'power_clean', 'military_press', 'high_pull'];
const LIFT_LABELS = { total: 'Total', squat: 'Squat', bench: 'Bench', deadlift: 'Deadlift', power_clean: 'Power Clean', military_press: 'Military Press', high_pull: 'High Pull' };

function RankIcon({ rank }) {
  if (rank === 1) return <span style={{ fontSize: '1.1rem' }}>🥇</span>;
  if (rank === 2) return <span style={{ fontSize: '1.1rem' }}>🥈</span>;
  if (rank === 3) return <span style={{ fontSize: '1.1rem' }}>🥉</span>;
  return <span style={{ fontFamily: 'Barlow Condensed', fontWeight: 700, color: 'var(--mu)' }}>{rank}</span>;
}

const POSITIONS = ['QB','RB','WR','TE','OL','DL','LB','DB','K/P','ATH'];

export default function Leaderboard() {
  const [lift, setLift] = useState('total');
  const [sessions, setSessions] = useState([]);
  const [sessionFilter, setSessionFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [posFilter, setPosFilter] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getSessions().then(setSessions); }, []);

  useEffect(() => {
    setLoading(true);
    const params = { lift };
    if (sessionFilter) params.session_id = sessionFilter;
    if (levelFilter) params.level = levelFilter;
    if (posFilter) params.position_group = posFilter;
    api.getLeaderboard(params).then(setData).finally(() => setLoading(false));
  }, [lift, sessionFilter, levelFilter, posFilter]);

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Leaderboard</div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {LIFTS.map(l => (
            <button key={l} className={`btn btn-sm ${lift === l ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setLift(l)}>
              {LIFT_LABELS[l]}
            </button>
          ))}
        </div>
        <select className="form-select" style={{ width: 'auto', padding: '5px 10px', fontSize: '.82rem' }} value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
          <option value="">All Levels</option>
          <option value="varsity">Varsity</option>
          <option value="frosh_soph">Frosh/Soph</option>
        </select>
        <select className="form-select" style={{ width: 'auto', padding: '5px 10px', fontSize: '.82rem' }} value={posFilter} onChange={e => setPosFilter(e.target.value)}>
          <option value="">All Positions</option>
          {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="form-select" style={{ width: 'auto', padding: '5px 10px', fontSize: '.82rem' }} value={sessionFilter} onChange={e => setSessionFilter(e.target.value)}>
          <option value="">All Sessions (Best Ever)</option>
          {sessions.map(s => <option key={s.id} value={s.id}>{s.name} — {s.session_date}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="loading-cell">Loading...</div>
        ) : data.length === 0 ? (
          <div className="loading-cell">No data yet</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 50 }}>Rank</th>
                <th>Player</th>
                <th>Level</th>
                <th>Pos</th>
                <th>Pod</th>
                <th>{lift === 'total' ? 'Total 1RM' : `Best ${LIFT_LABELS[lift]} 1RM`}</th>
                {lift === 'total' && <th>Avg</th>}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={row.id} style={{ background: i === 0 ? 'rgba(201,162,39,.05)' : i === 1 ? 'rgba(142,155,166,.05)' : i === 2 ? 'rgba(184,115,51,.05)' : 'transparent' }}>
                  <td style={{ textAlign: 'center' }}><RankIcon rank={i + 1} /></td>
                  <td>
                    <Link to={`/players/${row.id}`} style={{ textDecoration: 'none', color: 'var(--dark)', fontWeight: 600 }}>
                      {row.last_name}, {row.first_name}
                    </Link>
                  </td>
                  <td>{row.level ? <span className="badge" style={{ background: row.level === 'varsity' ? '#1a3a6b' : '#5a5a8a', color: '#fff', fontSize: '.7rem' }}>{row.level === 'varsity' ? 'Varsity' : 'Fr/So'}</span> : '—'}</td>
                  <td>{row.position_group ? <span className="badge badge-gray" style={{ fontSize: '.7rem' }}>{row.position_group}</span> : '—'}</td>
                  <td>{row.pod_name ? <span className="badge badge-red">Pod {row.pod_name}</span> : '—'}</td>
                  <td>
                    <span style={{ fontFamily: 'Barlow Condensed', fontWeight: 900, fontSize: '1.15rem', color: 'var(--m)' }}>
                      {lift === 'total' ? Math.round(row.total) : Math.round(row.best_1rm)} <span style={{ fontSize: '.7rem', fontWeight: 400, color: 'var(--mu)' }}>lbs</span>
                    </span>
                  </td>
                  {lift === 'total' && (
                    <td style={{ color: 'var(--mu)', fontFamily: 'Barlow Condensed', fontWeight: 700 }}>
                      {row.avg_1rm ? Math.round(row.avg_1rm) : '—'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
