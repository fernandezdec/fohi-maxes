/**
 * Direct import script — runs INSIDE the fohi-maxes-api container
 * Usage: docker exec fohi-maxes-api node /tmp/import-direct.js
 */
const Database = require('better-sqlite3');
const db = new Database('/data/fohi_maxes.db');

const POD_NAMES = ['Able', 'Baker', 'Charlie', 'Dog', 'Easy', 'Fox', 'George'];

const SESSIONS = [
  { name: 'Max I',  date: '2026-03-26' },
  { name: 'Max II', date: '2026-04-13' },
];

// All players from both sheets, merged by student_id
// Format: { pod, last_name, first_name, grade, student_id, lifts: { 'Max I': [...], 'Max II': [...] } }
const PLAYERS = [
  // ── Able ──────────────────────────────────────────────────────────────────
  { pod:'Able', last:'Mares',            first:'Jared',      grade:12, sid:'6050787',
    'Max I':  [{l:'bench',w:225,r:2,o:240},{l:'squat',w:null,r:null,o:325},{l:'power_clean',w:null,r:null,o:185},{l:'deadlift',w:null,r:null,o:365},{l:'military_press',w:155,r:2,o:165},{l:'high_pull',w:205,r:2,o:218}] },
  { pod:'Able', last:'Diaz',             first:'Rene',       grade:12, sid:'6045095',
    'Max I':  [{l:'bench',w:225,r:2,o:240},{l:'power_clean',w:175,r:2,o:186},{l:'military_press',w:155,r:2,o:165},{l:'high_pull',w:null,r:null,o:175}] },
  { pod:'Able', last:'Hernandez',        first:'Jacob',      grade:12, sid:'39003026',
    'Max I':  [{l:'bench',w:195,r:3,o:214},{l:'squat',w:null,r:null,o:315},{l:'power_clean',w:null,r:null,o:185},{l:'deadlift',w:365,r:2,o:389},{l:'military_press',w:125,r:null,o:125},{l:'high_pull',w:165,r:2,o:176}] },
  { pod:'Able', last:'Campos',           first:'Anthony',    grade:11, sid:'6056928' },
  { pod:'Able', last:'Brito',            first:'Michael',    grade:11, sid:'6055902' },
  { pod:'Able', last:'Fernandez',        first:'Joey',       grade:11, sid:'39024598',
    'Max I':  [{l:'bench',w:165,r:2,o:176},{l:'squat',w:295,r:2,o:314},{l:'power_clean',w:null,r:null,o:135},{l:'deadlift',w:225,r:2,o:240},{l:'military_press',w:115,r:2,o:122},{l:'high_pull',w:115,r:2,o:122}] },
  { pod:'Able', last:'Perez',            first:'Manual',     grade:11, sid:'39005424' },
  { pod:'Able', last:'Rojas',            first:'David',      grade:10, sid:'39001447' },
  { pod:'Able', last:'Lopez',            first:'Eithan',     grade:10, sid:'39006437',
    'Max I':  [{l:'bench',w:185,r:2,o:197},{l:'squat',w:275,r:2,o:293},{l:'power_clean',w:135,r:2,o:144},{l:'deadlift',w:null,r:null,o:230},{l:'military_press',w:135,r:2,o:144},{l:'high_pull',w:155,r:2,o:165}] },
  { pod:'Able', last:'Diaz',             first:'Adan',       grade:10, sid:'39000499',
    'Max I':  [{l:'bench',w:115,r:2,o:122},{l:'squat',w:205,r:2,o:218},{l:'power_clean',w:115,r:3,o:126},{l:'deadlift',w:255,r:2,o:272},{l:'military_press',w:95,r:4,o:107},{l:'high_pull',w:115,r:3,o:126}] },
  { pod:'Able', last:'Leon',             first:'Abraham',    grade:10, sid:'39008194' },

  // ── Baker ─────────────────────────────────────────────────────────────────
  { pod:'Baker', last:'Valdez',          first:'Matthew',    grade:12, sid:'6056604' },
  { pod:'Baker', last:'Garcia',          first:'Andrew',     grade:11, sid:'39000695',
    'Max I':  [{l:'squat',w:335,r:2,o:357},{l:'power_clean',w:null,r:null,o:125},{l:'deadlift',w:315,r:2,o:336},{l:'military_press',w:125,r:3,o:137},{l:'high_pull',w:155,r:3,o:170}] },
  { pod:'Baker', last:'Izaguirre',       first:'Brian',      grade:11, sid:'6054683' },
  { pod:'Baker', last:'Macias',          first:'Roberto',    grade:11, sid:'39010685' },
  { pod:'Baker', last:'Bryant',          first:'Tyshon',     grade:11, sid:null,
    'Max I':  [{l:'bench',w:90,r:3,o:99},{l:'squat',w:90,r:3,o:99},{l:'power_clean',w:85,r:4,o:96},{l:'deadlift',w:135,r:3,o:148},{l:'military_press',w:95,r:3,o:99},{l:'high_pull',w:175,r:3,o:192}] },
  { pod:'Baker', last:'Contreras',       first:'Eddie',      grade:10, sid:'80060614' },
  { pod:'Baker', last:'Nogales',         first:'Axel',       grade:10, sid:'80078307' },
  { pod:'Baker', last:'Sartain',         first:'Drake',      grade:10, sid:null },
  { pod:'Baker', last:'Lang',            first:'Flaire',     grade:null, sid:null },
  { pod:'Baker', last:'Nino',            first:'Ethan',      grade:11, sid:'6055838',
    'Max I':  [{l:'bench',w:125,r:3,o:137},{l:'squat',w:115,r:5,o:134},{l:'power_clean',w:null,r:null,o:95},{l:'deadlift',w:135,r:3,o:148},{l:'military_press',w:95,r:3,o:148},{l:'high_pull',w:95,r:3,o:148}] },
  { pod:'Baker', last:'Gonzalez',        first:'Aiden',      grade:11, sid:'39007365',
    'Max I':  [{l:'squat',w:null,r:null,o:185},{l:'bench',w:185,r:2,o:197},{l:'power_clean',w:105,r:2,o:112},{l:'deadlift',w:185,r:2,o:197},{l:'high_pull',w:180,r:2,o:192}] },
  { pod:'Baker', last:'Sanchez',         first:'Raymond',    grade:12, sid:null,
    'Max I':  [{l:'bench',w:135,r:2,o:144},{l:'squat',w:135,r:3,o:148},{l:'power_clean',w:135,r:2,o:144},{l:'deadlift',w:275,r:3,o:302},{l:'military_press',w:95,r:3,o:148}] },

  // ── Charlie ───────────────────────────────────────────────────────────────
  { pod:'Charlie', last:'Ruiz',          first:'Marcos',     grade:12, sid:'80057157',
    'Max I':  [{l:'bench',w:205,r:2,o:218},{l:'squat',w:425,r:2,o:453},{l:'power_clean',w:155,r:3,o:170},{l:'deadlift',w:345,r:2,o:368},{l:'military_press',w:175,r:2,o:186},{l:'high_pull',w:195,r:2,o:208}] },
  { pod:'Charlie', last:'Wauls',         first:'Jaden',      grade:12, sid:'80056473',
    'Max I':  [{l:'bench',w:155,r:2,o:165},{l:'squat',w:315,r:2,o:336},{l:'power_clean',w:155,r:3,o:170},{l:'deadlift',w:270,r:2,o:288},{l:'military_press',w:135,r:2,o:144},{l:'high_pull',w:135,r:3,o:148}] },
  { pod:'Charlie', last:'Zamora',        first:'Cesar',      grade:12, sid:'6056061',
    'Max I':  [{l:'bench',w:185,r:5,o:197},{l:'squat',w:null,r:null,o:275},{l:'deadlift',w:null,r:null,o:255},{l:'military_press',w:175,r:3,o:192},{l:'high_pull',w:185,r:5,o:215}] },
  { pod:'Charlie', last:'Jameson',       first:'Renoir',     grade:11, sid:'80067171' },
  { pod:'Charlie', last:'Diaz',          first:'Pedro',      grade:11, sid:'6055643',
    'Max I':  [{l:'bench',w:185,r:2,o:197},{l:'squat',w:235,r:2,o:250},{l:'power_clean',w:null,r:null,o:125},{l:'deadlift',w:325,r:2,o:346},{l:'high_pull',w:135,r:2,o:144}] },
  { pod:'Charlie', last:'Meza',          first:'Ivan',       grade:11, sid:'6049631',
    'Max I':  [{l:'bench',w:165,r:2,o:176},{l:'squat',w:275,r:2,o:293},{l:'power_clean',w:135,r:2,o:144},{l:'deadlift',w:275,r:2,o:293},{l:'military_press',w:115,r:2,o:122},{l:'high_pull',w:155,r:2,o:170}] },
  { pod:'Charlie', last:'Benavides',     first:'Angel',      grade:11, sid:'6056060',
    'Max I':  [{l:'bench',w:null,r:null,o:185},{l:'squat',w:225,r:2,o:240},{l:'power_clean',w:135,r:3,o:148},{l:'deadlift',w:null,r:null,o:295},{l:'military_press',w:null,r:null,o:135},{l:'high_pull',w:125,r:3,o:137}] },
  { pod:'Charlie', last:'Ayala',         first:'Andrew',     grade:10, sid:'39016475' },
  { pod:'Charlie', last:'Mendoza',       first:'Emmanuel',   grade:10, sid:'39011616',
    'Max I':  [{l:'bench',w:145,r:2,o:154},{l:'squat',w:205,r:2,o:218},{l:'power_clean',w:115,r:3,o:126},{l:'deadlift',w:205,r:3,o:225},{l:'military_press',w:115,r:2,o:122},{l:'high_pull',w:95,r:3,o:104}] },
  { pod:'Charlie', last:'Perez',         first:'Benjamin',   grade:10, sid:'6056547' },

  // ── Dog ───────────────────────────────────────────────────────────────────
  { pod:'Dog', last:'Solano',            first:'Matthew',    grade:12, sid:'6041359',
    'Max I':  [{l:'bench',w:225,r:2,o:240},{l:'squat',w:405,r:2,o:432},{l:'power_clean',w:null,r:null,o:125},{l:'deadlift',w:null,r:null,o:365},{l:'military_press',w:null,r:null,o:185},{l:'high_pull',w:175,r:2,o:186}] },
  { pod:'Dog', last:'Hernandez',         first:'Sam',        grade:12, sid:'6040990',
    'Max I':  [{l:'bench',w:185,r:2,o:197},{l:'squat',w:385,r:2,o:410},{l:'power_clean',w:185,r:3,o:203},{l:'deadlift',w:315,r:2,o:336},{l:'military_press',w:185,r:3,o:203},{l:'high_pull',w:185,r:2,o:197}] },
  { pod:'Dog', last:'Ortiz',             first:'Bryant II',  grade:11, sid:'39000633',
    'Max I':  [{l:'bench',w:135,r:3,o:148},{l:'squat',w:225,r:3,o:247},{l:'power_clean',w:115,r:3,o:126},{l:'deadlift',w:275,r:2,o:293},{l:'military_press',w:135,r:2,o:144},{l:'high_pull',w:145,r:3,o:159}] },
  { pod:'Dog', last:'Ortiz',             first:'Brandon I',  grade:11, sid:'39000640',
    'Max I':  [{l:'bench',w:125,r:3,o:137},{l:'squat',w:245,r:3,o:269},{l:'power_clean',w:115,r:2,o:122},{l:'deadlift',w:null,r:null,o:225},{l:'military_press',w:115,r:3,o:126},{l:'high_pull',w:115,r:3,o:126}] },
  { pod:'Dog', last:'Singleton',         first:'Dominyk',    grade:11, sid:'39001710' },
  { pod:'Dog', last:'Villanueva',        first:'Jiovanny',   grade:11, sid:'6049354' },
  { pod:'Dog', last:'Othman',            first:'Timothy',    grade:11, sid:'39007952',
    'Max I':  [{l:'bench',w:185,r:3,o:203},{l:'squat',w:315,r:4,o:357},{l:'power_clean',w:175,r:3,o:192},{l:'deadlift',w:385,r:3,o:423},{l:'military_press',w:125,r:3,o:137},{l:'high_pull',w:175,r:3,o:192}] },
  { pod:'Dog', last:'Trejo',             first:'Gabriel',    grade:10, sid:'39008175',
    'Max I':  [{l:'bench',w:95,r:3,o:104},{l:'squat',w:175,r:3,o:192},{l:'power_clean',w:95,r:3,o:104},{l:'deadlift',w:225,r:3,o:247},{l:'military_press',w:85,r:3,o:93},{l:'high_pull',w:95,r:3,o:104}] },
  { pod:'Dog', last:'Cervantes',         first:'Ivan',       grade:10, sid:'39008423' },
  { pod:'Dog', last:'Hatch',             first:'Ricky',      grade:10, sid:'39001059' },
  { pod:'Dog', last:'Jaramillo',         first:'Angel',      grade:10, sid:'80086244' },

  // ── Easy ──────────────────────────────────────────────────────────────────
  { pod:'Easy', last:'Alvarado',         first:'Ivan',       grade:12, sid:'80082905',
    'Max I':  [{l:'bench',w:185,r:2,o:197},{l:'squat',w:295,r:2,o:314},{l:'power_clean',w:155,r:3,o:170},{l:'deadlift',w:315,r:2,o:336},{l:'military_press',w:155,r:3,o:170},{l:'high_pull',w:185,r:4,o:209}] },
  { pod:'Easy', last:'Nolasco',          first:'Adrian',     grade:12, sid:'6054875' },
  { pod:'Easy', last:'Brannum',          first:'Ayden',      grade:12, sid:'80082617' },
  { pod:'Easy', last:'Del Villar',       first:'Ivan',       grade:12, sid:'390018175',
    'Max I':  [{l:'bench',w:null,r:null,o:205},{l:'squat',w:295,r:2,o:314},{l:'power_clean',w:155,r:2,o:165},{l:'deadlift',w:null,r:null,o:275},{l:'military_press',w:null,r:null,o:155},{l:'high_pull',w:null,r:null,o:155}] },
  { pod:'Easy', last:'Burciaga',         first:'Jimmy',      grade:12, sid:'6049865',
    'Max I':  [{l:'bench',w:null,r:null,o:315},{l:'squat',w:null,r:null,o:380},{l:'power_clean',w:null,r:null,o:245},{l:'deadlift',w:415,r:2,o:442},{l:'military_press',w:225,r:2,o:240},{l:'high_pull',w:null,r:null,o:205}] },
  { pod:'Easy', last:'Miranda',          first:'Aidan',      grade:null, sid:null },
  { pod:'Easy', last:'Tuitupou',         first:'Elias',      grade:10, sid:'39012557',
    'Max I':  [{l:'bench',w:185,r:3,o:203},{l:'power_clean',w:135,r:2,o:144},{l:'deadlift',w:250,r:2,o:266}] },
  { pod:'Easy', last:'Talavera',         first:'Angel',      grade:10, sid:'80083454' },
  { pod:'Easy', last:'Smith',            first:'Darnell',    grade:11, sid:'80090501',
    'Max I':  [{l:'bench',w:160,r:2,o:170},{l:'squat',w:135,r:3,o:148},{l:'power_clean',w:125,r:2,o:133},{l:'deadlift',w:340,r:2,o:362},{l:'military_press',w:null,r:null,o:100},{l:'high_pull',w:185,r:2,o:197}] },

  // ── Fox ───────────────────────────────────────────────────────────────────
  { pod:'Fox', last:'Calderon',          first:'Freddy',     grade:12, sid:'6050351',
    'Max I':  [{l:'bench',w:205,r:5,o:239},{l:'squat',w:380,r:5,o:443},{l:'power_clean',w:205,r:5,o:239},{l:'deadlift',w:305,r:5,o:443},{l:'military_press',w:185,r:5,o:215},{l:'high_pull',w:190,r:2,o:202}] },
  { pod:'Fox', last:'Diaz-Esquival',     first:'Leonel',     grade:12, sid:'6051267',
    'Max I':  [{l:'bench',w:175,r:2,o:186},{l:'squat',w:null,r:null,o:235},{l:'power_clean',w:155,r:2,o:165},{l:'deadlift',w:null,r:null,o:315},{l:'military_press',w:155,r:2,o:165},{l:'high_pull',w:155,r:2,o:165}] },
  { pod:'Fox', last:'Lopez',             first:'Efren',      grade:11, sid:'39004667',
    'Max I':  [{l:'bench',w:165,r:4,o:187},{l:'squat',w:245,r:2,o:261},{l:'power_clean',w:135,r:4,o:153},{l:'deadlift',w:285,r:3,o:313},{l:'military_press',w:145,r:2,o:154},{l:'high_pull',w:135,r:2,o:144}] },
  { pod:'Fox', last:'Perez',             first:'Jaden',      grade:11, sid:'80083159' },
  { pod:'Fox', last:'Celedonio',         first:'Sebastian',  grade:11, sid:'80084391',
    'Max I':  [{l:'bench',w:155,r:3,o:170},{l:'squat',w:265,r:2,o:282},{l:'power_clean',w:155,r:2,o:165},{l:'deadlift',w:null,r:null,o:285},{l:'military_press',w:155,r:2,o:165},{l:'high_pull',w:155,r:3,o:165}] },
  { pod:'Fox', last:'Gutierrez',         first:'Joseph',     grade:11, sid:'39016297',
    'Max I':  [{l:'bench',w:185,r:5,o:215},{l:'squat',w:315,r:2,o:336},{l:'deadlift',w:null,r:null,o:315},{l:'military_press',w:135,r:2,o:144},{l:'high_pull',w:185,r:2,o:197}] },
  { pod:'Fox', last:'Rangel',            first:'Ethan',      grade:10, sid:'80059642' },
  { pod:'Fox', last:'Murrillo',          first:'Adrian',     grade:10, sid:'39007549',
    'Max I':  [{l:'bench',w:92,r:2,o:98},{l:'squat',w:null,r:null,o:125},{l:'power_clean',w:null,r:null,o:95},{l:'deadlift',w:null,r:null,o:135}] },
  { pod:'Fox', last:'Lopez',             first:'Eric',       grade:12, sid:'80097119',
    'Max I':  [{l:'bench',w:null,r:null,o:155},{l:'squat',w:200,r:2,o:213},{l:'power_clean',w:115,r:3,o:126},{l:'deadlift',w:225,r:2,o:240},{l:'military_press',w:115,r:3,o:126},{l:'high_pull',w:115,r:2,o:122}] },

  // ── George ────────────────────────────────────────────────────────────────
  { pod:'George', last:'Guillen',        first:'Alexander',  grade:12, sid:'6056850',
    'Max I':  [{l:'bench',w:null,r:null,o:205},{l:'squat',w:null,r:null,o:315},{l:'power_clean',w:null,r:null,o:135},{l:'deadlift',w:null,r:null,o:295},{l:'military_press',w:null,r:null,o:155},{l:'high_pull',w:null,r:null,o:185}] },
  { pod:'George', last:'Santana',        first:'Julian',     grade:12, sid:'6047032',
    'Max I':  [{l:'bench',w:240,r:2,o:256},{l:'squat',w:315,r:3,o:346},{l:'power_clean',w:155,r:2,o:165},{l:'deadlift',w:315,r:4,o:357},{l:'military_press',w:185,r:3,o:203},{l:'high_pull',w:175,r:2,o:186}] },
  { pod:'George', last:'Galdamez',       first:'Joseph',     grade:12, sid:'6055218',
    'Max I':  [{l:'squat',w:295,r:2,o:314},{l:'power_clean',w:155,r:2,o:165},{l:'deadlift',w:315,r:2,o:336},{l:'high_pull',w:185,r:2,o:197}] },
];

// ── Run import ────────────────────────────────────────────────────────────────

const importFn = db.transaction(() => {
  // 1. Upsert pods
  const insertPod = db.prepare(`INSERT OR IGNORE INTO pods (name) VALUES (?)`);
  const getPod    = db.prepare(`SELECT id FROM pods WHERE name = ?`);
  const podMap = {};
  for (const name of POD_NAMES) {
    insertPod.run(name);
    podMap[name] = getPod.get(name).id;
  }
  console.log('Pods:', Object.keys(podMap).join(', '));

  // 2. Upsert sessions
  const insertSession = db.prepare(`INSERT OR IGNORE INTO sessions (name, session_date) VALUES (?, ?)`);
  const getSession    = db.prepare(`SELECT id FROM sessions WHERE name = ?`);
  const sessionMap = {};
  for (const s of SESSIONS) {
    insertSession.run(s.name, s.date);
    sessionMap[s.name] = getSession.get(s.name).id;
  }
  console.log('Sessions:', JSON.stringify(sessionMap));

  // 3. Upsert players
  const getPlayerBySid  = db.prepare(`SELECT id FROM players WHERE student_id = ? LIMIT 1`);
  const getPlayerByName = db.prepare(`SELECT id FROM players WHERE last_name = ? AND first_name = ? LIMIT 1`);
  const insertPlayer    = db.prepare(
    `INSERT INTO players (last_name, first_name, grade, student_id, pod_id) VALUES (?, ?, ?, ?, ?)`
  );
  const updatePlayer    = db.prepare(
    `UPDATE players SET last_name=?, first_name=?, grade=?, pod_id=? WHERE id=?`
  );

  let playerCount = 0;
  const playerIdMap = new Map(); // index → db id

  for (let i = 0; i < PLAYERS.length; i++) {
    const p = PLAYERS[i];
    const podId = podMap[p.pod] || null;
    let existing = p.sid ? getPlayerBySid.get(p.sid) : getPlayerByName.get(p.last, p.first);
    if (existing) {
      updatePlayer.run(p.last, p.first, p.grade || null, podId, existing.id);
      playerIdMap.set(i, existing.id);
    } else {
      const info = insertPlayer.run(p.last, p.first, p.grade || null, p.sid || null, podId);
      playerIdMap.set(i, info.lastInsertRowid);
    }
    playerCount++;
  }
  console.log('Players inserted/updated:', playerCount);

  // 4. Insert lift entries
  const insertLift = db.prepare(
    `INSERT OR IGNORE INTO lift_entries (session_id, player_id, lift, weight, reps, one_rm)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  let liftCount = 0;
  for (let i = 0; i < PLAYERS.length; i++) {
    const p = PLAYERS[i];
    const playerId = playerIdMap.get(i);
    if (!playerId) continue;
    for (const sName of ['Max I', 'Max II']) {
      const sessionId = sessionMap[sName];
      const lifts = p[sName];
      if (!lifts || !lifts.length) continue;
      for (const { l, w, r, o } of lifts) {
        insertLift.run(sessionId, playerId, l, w || null, r || null, o || null);
        liftCount++;
      }
    }
  }
  console.log('Lift entries inserted:', liftCount);
});

try {
  importFn();
  console.log('✓ Import complete');
} catch (e) {
  console.error('Import failed:', e.message);
}
db.close();
