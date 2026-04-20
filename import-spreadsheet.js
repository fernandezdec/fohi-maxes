/**
 * One-time import: Fohi Maxes spreadsheet → maxes DB on VPS
 * Run: node import-spreadsheet.js
 * Requires: npm install xlsx better-sqlite3 (in fohi-maxes dir)
 *
 * What it does:
 *  1. Parses Max I 3226 and Max II 41326 sheets
 *  2. Creates pods: Able, Baker, Charlie, Dog, Easy, Fox, George
 *  3. Upserts all players (last_name, first_name, grade, student_id, pod)
 *  4. Creates a session for each sheet (if it has lift data)
 *  5. Inserts lift entries (weight, reps, 1rm) per player per session
 *  6. Syncs player.username with auth service users matching by student_id
 *
 * Generates: import-output.sql  (run on VPS via sqlite3)
 */

const xlsx = require('xlsx');
const fs   = require('fs');

const XLSX_PATH = 'C:/Users/Jorge-MiniPC/Downloads/Fohi Maxes (26).xlsx';

// Col layout (0-indexed): 0=pod, 1=num, 2=student_id, 3=last, 4=first+grade
// Lifts start at col 5: bench(5-7), squat(8-10), power_clean(11-13),
//                        deadlift(14-16), military_press(17-19), high_pull(20-22)
const LIFT_MAP = [
  { key: 'bench',          cols: [5,  6,  7]  },
  { key: 'squat',          cols: [8,  9,  10] },
  { key: 'power_clean',    cols: [11, 12, 13] },
  { key: 'deadlift',       cols: [14, 15, 16] },
  { key: 'military_press', cols: [17, 18, 19] },
  { key: 'high_pull',      cols: [20, 21, 22] },
];

const SESSIONS = [
  { sheetName: ' Max I 3226',  name: 'Max I',  date: '2026-03-26' },
  { sheetName: 'Max II 41326', name: 'Max II', date: '2026-04-13' },
];

function parseNameGrade(cell) {
  if (!cell || typeof cell !== 'string') return { firstName: String(cell || '').trim(), grade: null };
  const parts = cell.trim().split(/\s+/);
  for (let i = 1; i < parts.length; i++) {
    const n = parseInt(parts[i], 10);
    if (!isNaN(n) && n >= 9 && n <= 12) {
      return { firstName: parts.slice(0, i).join(' '), grade: n };
    }
  }
  return { firstName: parts[0] || cell.trim(), grade: null };
}

function isHeaderRow(row) {
  return row[5] === 'BENCH PRESS' || row[5] === 'Weight' || row[1] === 'Weight';
}

function parseSheet(sheetName) {
  const wb = xlsx.readFile(XLSX_PATH);
  const ws = wb.Sheets[sheetName];
  if (!ws) { console.error(`Sheet not found: ${sheetName}`); return []; }
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: null });

  const players = [];
  let currentPod = null;

  for (const row of rows) {
    if (!row || row.every(c => c === null)) continue;
    if (isHeaderRow(row)) continue;

    if (row[0] && typeof row[0] === 'string' && row[0].trim()) {
      currentPod = row[0].trim();
    }

    const lastName = row[3];
    if (!lastName || typeof lastName !== 'string') continue;

    const { firstName, grade } = parseNameGrade(row[4]);
    const studentId = row[2] ? String(row[2]).trim() : null;

    const lifts = [];
    for (const { key, cols } of LIFT_MAP) {
      const weight = row[cols[0]] || null;
      const reps   = row[cols[1]] || null;
      const orm    = row[cols[2]] || null;
      if (weight !== null || orm !== null) {
        lifts.push({ lift: key, weight, reps, one_rm: orm });
      }
    }

    players.push({
      pod:        currentPod,
      last_name:  lastName.trim(),
      first_name: firstName,
      grade,
      student_id: studentId,
      lifts,
    });
  }
  return players;
}

// ── Build SQL ──────────────────────────────────────────────────────────────────

const lines = [
  'PRAGMA foreign_keys = OFF;',
  'BEGIN TRANSACTION;',
  '',
  '-- ── Pods ──────────────────────────────────────────────────────────────────',
];

const POD_NAMES = ['Able', 'Baker', 'Charlie', 'Dog', 'Easy', 'Fox', 'George'];

for (const p of POD_NAMES) {
  lines.push(`INSERT OR IGNORE INTO pods (name) VALUES ('${p}');`);
}
lines.push('');

// Collect all players across both sessions to build the master player list
const allPlayersByKey = new Map(); // key = student_id or "last|first"

for (const session of SESSIONS) {
  const rows = parseSheet(session.sheetName);
  for (const p of rows) {
    const key = p.student_id || `${p.last_name}|${p.first_name}`;
    if (!allPlayersByKey.has(key)) {
      allPlayersByKey.set(key, { ...p, sessions: {} });
    }
    const entry = allPlayersByKey.get(key);
    entry.sessions[session.name] = p.lifts;
    // Keep pod/grade if not set
    if (!entry.pod && p.pod)     entry.pod = p.pod;
    if (!entry.grade && p.grade) entry.grade = p.grade;
  }
}

lines.push('-- ── Players ─────────────────────────────────────────────────────────────');
const esc = s => s ? s.replace(/'/g, "''") : '';

let playerIdx = 1;
const playerKeyToVar = new Map();

for (const [key, p] of allPlayersByKey) {
  const podRef = p.pod
    ? `(SELECT id FROM pods WHERE name = '${esc(p.pod)}' LIMIT 1)`
    : 'NULL';
  const grade    = p.grade  ? p.grade  : 'NULL';
  const studentId = p.student_id ? `'${esc(p.student_id)}'` : 'NULL';

  lines.push(
    `INSERT OR IGNORE INTO players (last_name, first_name, grade, student_id, pod_id) ` +
    `VALUES ('${esc(p.last_name)}', '${esc(p.first_name)}', ${grade}, ${studentId}, ${podRef});`
  );
  // Also update pod/grade for existing rows (in case already created via SSO)
  lines.push(
    `UPDATE players SET grade = ${grade}, student_id = ${studentId}, pod_id = ${podRef} ` +
    `WHERE student_id = ${studentId} AND ${studentId} != 'NULL';`
  );
}
lines.push('');

// ── Sessions ──────────────────────────────────────────────────────────────────
lines.push('-- ── Sessions ───────────────────────────────────────────────────────────');
for (const s of SESSIONS) {
  lines.push(
    `INSERT OR IGNORE INTO sessions (name, session_date) VALUES ('${s.name}', '${s.date}');`
  );
}
lines.push('');

// ── Lift entries ──────────────────────────────────────────────────────────────
lines.push('-- ── Lift entries ───────────────────────────────────────────────────────');

for (const session of SESSIONS) {
  const sessionRef = `(SELECT id FROM sessions WHERE name = '${session.name}' LIMIT 1)`;
  for (const [key, p] of allPlayersByKey) {
    const lifts = p.sessions[session.name];
    if (!lifts || lifts.length === 0) continue;

    const studentId = p.student_id ? `'${esc(p.student_id)}'` : null;
    const playerRef = studentId
      ? `(SELECT id FROM players WHERE student_id = ${studentId} LIMIT 1)`
      : `(SELECT id FROM players WHERE last_name = '${esc(p.last_name)}' AND first_name = '${esc(p.first_name)}' LIMIT 1)`;

    for (const { lift, weight, reps, one_rm } of lifts) {
      const w  = weight  !== null ? weight  : 'NULL';
      const r  = reps    !== null ? reps    : 'NULL';
      const orm = one_rm !== null ? one_rm  : 'NULL';
      lines.push(
        `INSERT OR IGNORE INTO lift_entries (session_id, player_id, lift, weight, reps, one_rm) ` +
        `VALUES (${sessionRef}, ${playerRef}, '${lift}', ${w}, ${r}, ${orm});`
      );
    }
  }
}

lines.push('');
lines.push('COMMIT;');
lines.push('PRAGMA foreign_keys = ON;');

const sql = lines.join('\n');
fs.writeFileSync('import-output.sql', sql);

console.log('✓ Generated import-output.sql');
console.log(`  Players: ${allPlayersByKey.size}`);
console.log(`  Pods: ${POD_NAMES.join(', ')}`);
console.log(`  Sessions: ${SESSIONS.map(s=>s.name).join(', ')}`);

let liftCount = 0;
for (const [,p] of allPlayersByKey) for (const s in p.sessions) liftCount += p.sessions[s].length;
console.log(`  Lift entries: ${liftCount}`);
