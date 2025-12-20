const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const dbpg = require('../src/db');

const SQLITE_PATH = process.env.DB_PATH || '/data/waifu.db';

async function run() {
  await dbpg.ready;

  if (!fs.existsSync(SQLITE_PATH)) {
    console.log('No SQLite DB found at', SQLITE_PATH, '- skipping sqlite -> postgres migration');
    process.exit(0);
  }

  console.log('Opening sqlite DB:', SQLITE_PATH);
  const sdb = new sqlite3.Database(SQLITE_PATH);

  function all(sql, params=[]) {
    return new Promise((resolve, reject) => {
      sdb.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
    });
  }

  // Migrate users
  try {
    const users = await all('SELECT * FROM users');
    console.log('SQLite users:', users.length);
    let inserted = 0;
    for (const u of users) {
      const params = [u.user_id, u.username, u.first_name, u.berries || 0, u.gems || 0, u.crimson || 0, u.daily_streak || 0, u.weekly_streak || 0, u.last_daily_claim || null, u.last_weekly_claim || null, u.last_claim_date || null, u.favorite_waifu_id || null, u.harem_filter_rarity || null, u.created_at || null];
      await dbpg.query(`INSERT INTO users (user_id, username, first_name, berries, gems, crimson, daily_streak, weekly_streak, last_daily_claim, last_weekly_claim, last_claim_date, favorite_waifu_id, harem_filter_rarity, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        ON CONFLICT (user_id) DO UPDATE SET
          username = EXCLUDED.username,
          first_name = EXCLUDED.first_name,
          berries = EXCLUDED.berries,
          gems = EXCLUDED.gems,
          crimson = EXCLUDED.crimson,
          daily_streak = EXCLUDED.daily_streak,
          weekly_streak = EXCLUDED.weekly_streak,
          last_daily_claim = EXCLUDED.last_daily_claim,
          last_weekly_claim = EXCLUDED.last_weekly_claim,
          last_claim_date = EXCLUDED.last_claim_date,
          favorite_waifu_id = EXCLUDED.favorite_waifu_id,
          harem_filter_rarity = EXCLUDED.harem_filter_rarity,
          created_at = EXCLUDED.created_at
      `, params);
      inserted++;
    }
    console.log('Migrated users:', inserted);
  } catch (e) { console.error('Users migration error:', e && e.message); }

  // Migrate waifus
  try {
    const waifus = await all('SELECT * FROM waifus');
    console.log('SQLite waifus:', waifus.length);
    let inserted = 0;
    for (const w of waifus) {
      const params = [w.waifu_id, w.name, w.anime || null, w.rarity || null, w.image_file_id || null, w.price || 0, (w.is_locked? true: false), w.uploaded_by || null, w.created_at || null];
      await dbpg.query(`INSERT INTO waifus (waifu_id, name, anime, rarity, image_file_id, price, is_locked, uploaded_by, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (waifu_id) DO UPDATE SET
          name = EXCLUDED.name,
          anime = EXCLUDED.anime,
          rarity = EXCLUDED.rarity,
          image_file_id = EXCLUDED.image_file_id,
          price = EXCLUDED.price,
          is_locked = EXCLUDED.is_locked,
          uploaded_by = EXCLUDED.uploaded_by,
          created_at = EXCLUDED.created_at
      `, params);
      inserted++;
    }
    console.log('Migrated waifus:', inserted);
  } catch (e) { console.error('Waifus migration error:', e && e.message); }

  // Migrate harem
  try {
    const harem = await all('SELECT * FROM harem');
    console.log('SQLite harem entries:', harem.length);
    let inserted = 0;
    for (const h of harem) {
      const params = [h.user_id, h.waifu_id, h.acquired_date || h.owned_since || null, h.owned_since || null];
      await dbpg.query(`INSERT INTO harem (user_id, waifu_id, acquired_date, owned_since)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (user_id, waifu_id) DO NOTHING
      `, params).catch(()=>{});
      inserted++;
    }
    console.log('Migrated harem:', inserted);
  } catch (e) { console.error('Harem migration error:', e && e.message); }

  // Migrate roles
  try {
    const roles = await all('SELECT * FROM roles');
    console.log('SQLite roles:', roles.length);
    let inserted = 0;
    for (const r of roles) {
      const params = [r.user_id, r.role_type];
      await dbpg.query(`INSERT INTO roles (user_id, role_type) VALUES ($1,$2) ON CONFLICT (user_id, role_type) DO NOTHING`, params).catch(()=>{});
      inserted++;
    }
    console.log('Migrated roles:', inserted);
  } catch (e) { console.error('Roles migration error:', e && e.message); }

  // Migrate start_media
  try {
    const media = await all('SELECT * FROM start_media');
    console.log('SQLite start_media:', media.length);
    let inserted = 0;
    for (const m of media) {
      const params = [m.file_id, m.media_type, m.uploaded_by || null, m.created_at || null];
      await dbpg.query(`INSERT INTO start_media (file_id, media_type, uploaded_by, created_at) VALUES ($1,$2,$3,$4)`, params).catch(()=>{});
      inserted++;
    }
    console.log('Migrated start_media:', inserted);
  } catch (e) { console.error('start_media migration error:', e && e.message); }

  console.log('Migration complete.');
  sdb.close();
  process.exit(0);
}

run().catch(e=>{console.error('Migration failed:', e && e.message); process.exit(1);});
