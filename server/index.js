require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, calc1RM } = require('./db');
const { authMiddleware, requireCoach, JWT_SECRET, COACH_ROLES } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3041;
const SSO_JWT_SECRET = process.env.SSO_JWT_SECRET || process.env.JWT_SECRET;

app.use(cors());
app.use(express.json());

// ── Auth ─────────────────────────────────────────────────────────────────────

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Required' });
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role, fullName: user.full_name }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, fullName: user.full_name } });
});

app.post('/api/auth/sso', (req, res) => {
  const { token: ssoToken } = req.body;
  if (!ssoToken) return res.status(400).json({ error: 'Token required' });
  try {
    const decoded = jwt.verify(ssoToken, SSO_JWT_SECRET);
    const db = getDb();
    const username = (decoded.username || decoded.email || '').toLowerCase();
    const role = decoded.role || 'player';
    const fullName = decoded.fullName || decoded.displayName || decoded.name || username;

    // Upsert into users table
    let user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      const hash = bcrypt.hashSync(Math.random().toString(36), 10);
      db.prepare('INSERT INTO users (username, password, full_name, role) VALUES (?,?,?,?)').run(username, hash, fullName, role);
      user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    } else {
      db.prepare('UPDATE users SET role = ?, full_name = ? WHERE username = ?').run(role, fullName, username);
      user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    }

    // Link SSO user to player record
    if (!COACH_ROLES.includes(role)) {
      const studentId = decoded.studentId ? String(decoded.studentId) : null;
      const grade     = decoded.grade     ? Number(decoded.grade)     : null;
      // 1. Already linked by username
      let player = db.prepare('SELECT * FROM players WHERE username = ?').get(username);
      if (!player && studentId) {
        // 2. Match spreadsheet-imported player by student ID
        player = db.prepare('SELECT * FROM players WHERE student_id = ?').get(studentId);
        if (player) {
          db.prepare('UPDATE players SET username = ?, grade = COALESCE(?, grade) WHERE id = ?')
            .run(username, grade, player.id);
        }
      }
      if (!player) {
        // 3. New player — create record, coach assigns to pod later
        const parts = fullName.trim().split(' ');
        const firstName = parts[0] || username;
        const lastName  = parts.slice(1).join(' ') || '';
        db.prepare('INSERT OR IGNORE INTO players (last_name, first_name, grade, student_id, username) VALUES (?,?,?,?,?)')
          .run(lastName, firstName, grade, studentId, username);
      }
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role, fullName: user.full_name }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, fullName: user.full_name } });
  } catch (e) {
    res.status(401).json({ error: 'Invalid SSO token' });
  }
});

// ── Pods ──────────────────────────────────────────────────────────────────────

app.get('/api/pods', authMiddleware, (req, res) => {
  const db = getDb();
  const pods = db.prepare('SELECT * FROM pods ORDER BY name').all();
  const playerCount = db.prepare('SELECT pod_id, COUNT(*) as cnt FROM players WHERE is_active=1 GROUP BY pod_id').all();
  const countMap = Object.fromEntries(playerCount.map(r => [r.pod_id, r.cnt]));
  res.json(pods.map(p => ({ ...p, player_count: countMap[p.id] || 0 })));
});

app.post('/api/pods', authMiddleware, requireCoach, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  try {
    const db = getDb();
    const result = db.prepare('INSERT INTO pods (name) VALUES (?)').run(name.trim());
    res.json(db.prepare('SELECT * FROM pods WHERE id = ?').get(result.lastInsertRowid));
  } catch { res.status(409).json({ error: 'Pod name already exists' }); }
});

app.put('/api/pods/:id', authMiddleware, requireCoach, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const db = getDb();
  db.prepare('UPDATE pods SET name = ? WHERE id = ?').run(name.trim(), req.params.id);
  res.json({ success: true });
});

app.delete('/api/pods/:id', authMiddleware, requireCoach, (req, res) => {
  const db = getDb();
  // Unassign all players first
  db.prepare('UPDATE players SET pod_id = NULL WHERE pod_id = ?').run(req.params.id);
  db.prepare('DELETE FROM pods WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── Players ───────────────────────────────────────────────────────────────────

app.get('/api/players/duplicates', authMiddleware, requireCoach, (req, res) => {
  const db = getDb();
  const groups = db.prepare(`
    SELECT LOWER(last_name) as ln, LOWER(first_name) as fn, COUNT(*) as cnt
    FROM players WHERE is_active = 1
    GROUP BY LOWER(last_name), LOWER(first_name)
    HAVING cnt > 1
  `).all();
  const result = [];
  for (const g of groups) {
    const rows = db.prepare(`
      SELECT p.*, pod.name as pod_name,
        (SELECT COUNT(*) FROM lift_entries WHERE player_id = p.id) as lift_count
      FROM players p LEFT JOIN pods pod ON p.pod_id = pod.id
      WHERE LOWER(p.last_name) = ? AND LOWER(p.first_name) = ? AND p.is_active = 1
      ORDER BY lift_count DESC, p.username DESC
    `).all(g.ln, g.fn);
    result.push(rows);
  }
  res.json(result);
});

app.get('/api/players', authMiddleware, (req, res) => {
  const db = getDb();
  const { pod_id, unassigned, level, position_group, inactive } = req.query;
  const activeFilter = inactive === 'true' ? 'p.is_active = 0' : 'p.is_active = 1';
  let sql = `SELECT p.*, pod.name as pod_name FROM players p LEFT JOIN pods pod ON p.pod_id = pod.id WHERE ${activeFilter}`;
  const params = [];
  if (pod_id) { sql += ' AND p.pod_id = ?'; params.push(pod_id); }
  if (unassigned === 'true') { sql += ' AND p.pod_id IS NULL'; }
  if (level) { sql += ' AND p.level = ?'; params.push(level); }
  if (position_group) { sql += ' AND p.position_group = ?'; params.push(position_group); }
  sql += ' ORDER BY p.last_name, p.first_name';
  res.json(db.prepare(sql).all(...params));
});

app.post('/api/players', authMiddleware, requireCoach, (req, res) => {
  const { last_name, first_name, grade, student_id, pod_id, username, level, position_group } = req.body;
  if (!last_name || !first_name) return res.status(400).json({ error: 'First and last name required' });
  const db = getDb();
  try {
    const result = db.prepare(
      'INSERT INTO players (last_name, first_name, grade, student_id, pod_id, username, level, position_group) VALUES (?,?,?,?,?,?,?,?)'
    ).run(last_name.trim(), first_name.trim(), grade || null, student_id || null, pod_id || null, username?.toLowerCase() || null, level || null, position_group || null);
    res.json(db.prepare('SELECT * FROM players WHERE id = ?').get(result.lastInsertRowid));
  } catch { res.status(409).json({ error: 'Username already exists' }); }
});

app.put('/api/players/:id', authMiddleware, requireCoach, (req, res) => {
  const { last_name, first_name, grade, student_id, pod_id, username, is_active, level, position_group } = req.body;
  const db = getDb();
  db.prepare(
    'UPDATE players SET last_name=?, first_name=?, grade=?, student_id=?, pod_id=?, username=?, is_active=?, level=?, position_group=? WHERE id=?'
  ).run(last_name, first_name, grade || null, student_id || null, pod_id || null, username?.toLowerCase() || null, is_active ?? 1, level || null, position_group || null, req.params.id);
  res.json({ success: true });
});

app.delete('/api/players/:id', authMiddleware, requireCoach, (req, res) => {
  const db = getDb();
  const player = db.prepare('SELECT id FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM players WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Assign player to pod
app.patch('/api/players/:id/pod', authMiddleware, requireCoach, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE players SET pod_id = ? WHERE id = ?').run(req.body.pod_id || null, req.params.id);
  res.json({ success: true });
});

// Get a single player with their full stats
app.get('/api/players/:id/stats', authMiddleware, (req, res) => {
  const db = getDb();
  const player = db.prepare('SELECT p.*, pod.name as pod_name FROM players p LEFT JOIN pods pod ON p.pod_id = pod.id WHERE p.id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Not found' });

  const lifts = db.prepare(`
    SELECT le.*, s.session_date, s.name as session_name
    FROM lift_entries le
    JOIN sessions s ON le.session_id = s.id
    WHERE le.player_id = ?
    ORDER BY s.session_date ASC
  `).all(req.params.id);

  const speeds = db.prepare(`
    SELECT se.*, s.session_date, s.name as session_name
    FROM speed_entries se
    JOIN sessions s ON se.session_id = s.id
    WHERE se.player_id = ?
    ORDER BY s.session_date ASC
  `).all(req.params.id);

  res.json({ player, lifts, speeds });
});

// Get player by username (for SSO login redirect)
app.get('/api/players/me', authMiddleware, (req, res) => {
  const db = getDb();
  const player = db.prepare('SELECT p.*, pod.name as pod_name FROM players p LEFT JOIN pods pod ON p.pod_id = pod.id WHERE p.username = ?').get(req.user.username);
  res.json(player || null);
});

// ── Sessions ──────────────────────────────────────────────────────────────────

app.get('/api/sessions', authMiddleware, (req, res) => {
  const db = getDb();
  const sessions = db.prepare('SELECT * FROM sessions ORDER BY session_date DESC').all();
  // Add entry counts
  const counts = db.prepare('SELECT session_id, COUNT(DISTINCT player_id) as cnt FROM lift_entries GROUP BY session_id').all();
  const countMap = Object.fromEntries(counts.map(r => [r.session_id, r.cnt]));
  res.json(sessions.map(s => ({ ...s, player_count: countMap[s.id] || 0 })));
});

app.post('/api/sessions', authMiddleware, requireCoach, (req, res) => {
  const { name, session_date, notes } = req.body;
  if (!name || !session_date) return res.status(400).json({ error: 'Name and date required' });
  const db = getDb();
  const result = db.prepare('INSERT INTO sessions (name, session_date, notes, created_by) VALUES (?,?,?,?)').run(name, session_date, notes || null, req.user.username);
  res.json(db.prepare('SELECT * FROM sessions WHERE id = ?').get(result.lastInsertRowid));
});

app.put('/api/sessions/:id', authMiddleware, requireCoach, (req, res) => {
  const { name, session_date, notes } = req.body;
  const db = getDb();
  db.prepare('UPDATE sessions SET name=?, session_date=?, notes=? WHERE id=?').run(name, session_date, notes || null, req.params.id);
  res.json({ success: true });
});

app.delete('/api/sessions/:id', authMiddleware, requireCoach, (req, res) => {
  getDb().prepare('DELETE FROM sessions WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Get full session data (all pods/players with their entries)
app.get('/api/sessions/:id/data', authMiddleware, (req, res) => {
  const db = getDb();
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Not found' });

  const entries = db.prepare('SELECT * FROM lift_entries WHERE session_id = ?').all(req.params.id);
  const speeds = db.prepare('SELECT * FROM speed_entries WHERE session_id = ?').all(req.params.id);
  const players = db.prepare(`
    SELECT p.*, pod.name as pod_name FROM players p
    LEFT JOIN pods pod ON p.pod_id = pod.id
    WHERE p.is_active = 1 ORDER BY pod.name, p.last_name
  `).all();

  res.json({ session, entries, speeds, players });
});

// ── Lift Entries ──────────────────────────────────────────────────────────────

app.post('/api/entries', authMiddleware, requireCoach, (req, res) => {
  const { session_id, player_id, lift, weight, reps } = req.body;
  if (!session_id || !player_id || !lift) return res.status(400).json({ error: 'Required fields missing' });
  const one_rm = calc1RM(weight, reps);
  const db = getDb();
  db.prepare(`
    INSERT INTO lift_entries (session_id, player_id, lift, weight, reps, one_rm)
    VALUES (?,?,?,?,?,?)
    ON CONFLICT(session_id, player_id, lift) DO UPDATE SET weight=excluded.weight, reps=excluded.reps, one_rm=excluded.one_rm
  `).run(session_id, player_id, lift, weight || null, reps || null, one_rm);
  res.json({ one_rm });
});

// Bulk save entries for a whole pod in one request
app.post('/api/entries/bulk', authMiddleware, requireCoach, (req, res) => {
  const { session_id, entries } = req.body;
  if (!session_id || !Array.isArray(entries)) return res.status(400).json({ error: 'Invalid' });
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO lift_entries (session_id, player_id, lift, weight, reps, one_rm)
    VALUES (?,?,?,?,?,?)
    ON CONFLICT(session_id, player_id, lift) DO UPDATE SET weight=excluded.weight, reps=excluded.reps, one_rm=excluded.one_rm
  `);
  const upsertMany = db.transaction((rows) => {
    for (const e of rows) {
      if (!e.player_id || !e.lift) continue;
      const one_rm = calc1RM(e.weight, e.reps);
      stmt.run(session_id, e.player_id, e.lift, e.weight || null, e.reps || null, one_rm);
    }
  });
  upsertMany(entries);
  res.json({ success: true });
});

// Speed entries
app.post('/api/entries/speed', authMiddleware, requireCoach, (req, res) => {
  const { session_id, player_id, dash_40, dash_10, shuttle, broad_jump, med_ball_throw } = req.body;
  if (!session_id || !player_id) return res.status(400).json({ error: 'Required' });
  getDb().prepare(`
    INSERT INTO speed_entries (session_id, player_id, dash_40, dash_10, shuttle, broad_jump, med_ball_throw)
    VALUES (?,?,?,?,?,?,?)
    ON CONFLICT(session_id, player_id) DO UPDATE SET dash_40=excluded.dash_40, dash_10=excluded.dash_10, shuttle=excluded.shuttle, broad_jump=excluded.broad_jump, med_ball_throw=excluded.med_ball_throw
  `).run(session_id, player_id, dash_40 || null, dash_10 || null, shuttle || null, broad_jump || null, med_ball_throw || null);
  res.json({ success: true });
});

// ── Leaderboard ───────────────────────────────────────────────────────────────

app.get('/api/leaderboard', authMiddleware, (req, res) => {
  const { lift, session_id, level, position_group } = req.query;
  const db = getDb();

  const playerFilter = [];
  const playerParams = [];
  if (level) { playerFilter.push('p.level = ?'); playerParams.push(level); }
  if (position_group) { playerFilter.push('p.position_group = ?'); playerParams.push(position_group); }
  const playerWhere = playerFilter.length ? ' AND ' + playerFilter.join(' AND ') : '';

  if (lift && lift !== 'total') {
    let sql = `
      SELECT p.id, p.last_name, p.first_name, p.grade, pod.name as pod_name,
             p.level, p.position_group,
             MAX(le.one_rm) as best_1rm, le.weight, le.reps
      FROM lift_entries le
      JOIN players p ON le.player_id = p.id
      LEFT JOIN pods pod ON p.pod_id = pod.id
      WHERE le.lift = ? AND le.one_rm IS NOT NULL${playerWhere}
    `;
    const params = [lift, ...playerParams];
    if (session_id) { sql += ' AND le.session_id = ?'; params.push(session_id); }
    sql += ' GROUP BY p.id ORDER BY best_1rm DESC';
    return res.json(db.prepare(sql).all(...params));
  }

  const sql = `
    SELECT p.id, p.last_name, p.first_name, p.grade, pod.name as pod_name,
           p.level, p.position_group,
           SUM(max_1rm) as total, AVG(max_1rm) as avg_1rm
    FROM (
      SELECT player_id, MAX(one_rm) as max_1rm
      FROM lift_entries
      WHERE one_rm IS NOT NULL ${session_id ? 'AND session_id = ?' : ''}
      GROUP BY player_id, lift
    ) sub
    JOIN players p ON sub.player_id = p.id
    LEFT JOIN pods pod ON p.pod_id = pod.id
    WHERE 1=1${playerWhere}
    GROUP BY p.id
    ORDER BY total DESC
  `;
  const qParams = [...(session_id ? [session_id] : []), ...playerParams];
  res.json(db.prepare(sql).all(...qParams));
});

// ── Seed admin user ───────────────────────────────────────────────────────────

function seedAdmin() {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(process.env.ADMIN_USERNAME || 'admin');
  if (!existing) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'changeme', 10);
    db.prepare('INSERT INTO users (username, password, full_name, role) VALUES (?,?,?,?)').run(
      process.env.ADMIN_USERNAME || 'admin', hash, 'Administrator', 'admin'
    );
  }
}

app.listen(PORT, () => {
  seedAdmin();
  console.log(`FOHI Maxes API running on port ${PORT}`);
});
