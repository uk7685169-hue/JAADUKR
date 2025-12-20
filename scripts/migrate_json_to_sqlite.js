const fs = require('fs');
const path = require('path');
const db = require('../src/db');

async function safeParse(file) {
  try {
    const text = fs.readFileSync(file, 'utf8');
    return JSON.parse(text);
  } catch (e) {
    console.error('Failed to parse', file, e.message);
    return null;
  }
}

function toInt(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

async function upsertUser(u) {
  const userId = toInt(u.user_id);
  if (!userId) return 0;
  const sql = `INSERT INTO users (user_id, username, first_name, berries, gems, crimson, daily_streak, weekly_streak, last_daily_claim, last_weekly_claim, favorite_waifu_id, created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    ON CONFLICT(user_id) DO UPDATE SET
      username=excluded.username,
      first_name=excluded.first_name,
      berries=excluded.berries,
      gems=excluded.gems,
      crimson=excluded.crimson,
      daily_streak=excluded.daily_streak,
      weekly_streak=excluded.weekly_streak,
      last_daily_claim=excluded.last_daily_claim,
      last_weekly_claim=excluded.last_weekly_claim,
      favorite_waifu_id=excluded.favorite_waifu_id,
      created_at=excluded.created_at`;

  const params = [
    userId,
    u.username || null,
    u.first_name || null,
    toInt(u.berries) || 0,
    toInt(u.gems) || 0,
    toInt(u.crimson) || 0,
    toInt(u.daily_streak) || 0,
    toInt(u.weekly_streak) || 0,
    u.last_daily_claim || null,
    u.last_weekly_claim || null,
    toInt(u.favorite_waifu_id) || null,
    u.created_at || null
  ];

  await db.query(sql, params);

  // roles
  if (Array.isArray(u.roles)) {
    for (const r of u.roles) {
      if (!r) continue;
      await db.query('INSERT INTO roles (user_id, role_type) VALUES ($1,$2) ON CONFLICT DO NOTHING', [userId, r]);
    }
  }

  // harem entries
  if (Array.isArray(u.harem)) {
    for (const h of u.harem) {
      const wid = toInt(h.waifu_id) || null;
      if (!wid) continue;
      const acquired = h.acquired_date || u.created_at || null;
      await db.query('INSERT INTO harem (user_id, waifu_id, acquired_date) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [userId, wid, acquired]);
    }
  }

  return 1;
}

async function upsertWaifu(w) {
  if (!w) return 0;
  const wid = toInt(w.waifu_id) || null;
  const sql = `INSERT INTO waifus (waifu_id, name, anime, rarity, image_file_id, price, is_locked, uploaded_by, created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT(waifu_id) DO UPDATE SET
      name=excluded.name,
      anime=excluded.anime,
      rarity=excluded.rarity,
      image_file_id=excluded.image_file_id,
      price=excluded.price,
      is_locked=excluded.is_locked,
      uploaded_by=excluded.uploaded_by,
      created_at=excluded.created_at`;

  const params = [
    wid,
    w.name || null,
    w.anime || null,
    toInt(w.rarity) || 0,
    w.image_file_id || null,
    toInt(w.price) || 0,
    (w.is_locked === true || w.is_locked === 'true' || w.is_locked === 1) ? 1 : 0,
    toInt(w.uploaded_by) || null,
    w.created_at || null
  ];

  await db.query(sql, params);
  return 1;
}

async function importFromDataDbJson(file) {
  const j = await safeParse(file);
  if (!j) return { users:0, waifus:0 };
  let ucount=0, wcount=0;
  if (Array.isArray(j.users)) {
    for (const u of j.users) {
      ucount += await upsertUser(u).catch(e=>{console.error('user upsert error', e && e.message); return 0;});
    }
  }
  if (Array.isArray(j.waifus)) {
    for (const w of j.waifus) {
      wcount += await upsertWaifu(w).catch(e=>{console.error('waifu upsert error', e && e.message); return 0;});
    }
  }
  return { users: ucount, waifus: wcount };
}

async function importFromBackup(file) {
  const j = await safeParse(file);
  if (!j) return { users:0, waifus:0 };
  const snap = j.snapshot || j;
  let ucount=0, wcount=0;
  if (Array.isArray(snap.users)) {
    for (const u of snap.users) {
      ucount += await upsertUser(u).catch(e=>{console.error('user upsert error', e && e.message); return 0;});
    }
  }
  if (Array.isArray(snap.waifus)) {
    for (const w of snap.waifus) {
      wcount += await upsertWaifu(w).catch(e=>{console.error('waifu upsert error', e && e.message); return 0;});
    }
  }
  return { users: ucount, waifus: wcount };
}

async function importUsersDir(dir) {
  const files = fs.readdirSync(dir).filter(f=>f.endsWith('.json'));
  let ucount = 0;
  for (const f of files) {
    const p = path.join(dir,f);
    const j = await safeParse(p);
    if (!j) continue;
    ucount += await upsertUser(j).catch(e=>{console.error('user upsert error', e && e.message); return 0;});
  }
  return ucount;
}

async function run() {
  await db.ready();
  console.log('DB ready. Starting migration...');
  let totalUsers=0, totalWaifus=0;

  // import main data/db.json
  const dataDb = path.join(__dirname,'..','data','db.json');
  if (fs.existsSync(dataDb)) {
    const r = await importFromDataDbJson(dataDb);
    totalUsers += r.users; totalWaifus += r.waifus;
    console.log('Imported from data/db.json:', r);
  }

  // import backups (sorted newest->oldest)
  const backupsDir = path.join(__dirname,'..','backups');
  if (fs.existsSync(backupsDir)) {
    const files = fs.readdirSync(backupsDir).filter(f=>f.endsWith('.json')).sort().reverse();
    for (const f of files) {
      const p = path.join(backupsDir,f);
      const r = await importFromBackup(p);
      totalUsers += r.users; totalWaifus += r.waifus;
      console.log('Imported from', f, r);
    }
  }

  // import per-user files
  const usersDir = path.join(__dirname,'..','users');
  if (fs.existsSync(usersDir)) {
    const ucount = await importUsersDir(usersDir);
    totalUsers += ucount;
    console.log('Imported from users/*.json:', ucount);
  }

  console.log('Migration finished. Totals - users:', totalUsers, 'waifus:', totalWaifus);

  // quick verification
  const usersCount = await db.query('SELECT COUNT(*) as c FROM users');
  const waifusCount = await db.query('SELECT COUNT(*) as c FROM waifus');
  const haremCount = await db.query('SELECT COUNT(*) as c FROM harem');
  console.log('DB counts:', usersCount.rows[0], waifusCount.rows[0], haremCount.rows[0]);
}

run().catch(e=>{console.error('Migration failed:', e && e.message); process.exit(1);});
