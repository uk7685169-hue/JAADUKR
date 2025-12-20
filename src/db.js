require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const DEFAULT_DB = 'postgresql://root:eEmWMlkMKMdKN5hfW7WeLjFxLm3PhTDO@dpg-d50jmunfte5s73cpckng-a/aqua_bot';
const connectionString = process.env.DATABASE_URL || DEFAULT_DB;

const pool = new Pool({ connectionString, max: 20 });

async function query(text, params = []) {
  return pool.query(text, params).then(res => ({ rows: res.rows, rowCount: res.rowCount }));
}

async function initialize() {
  // Create tables if missing
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id BIGINT PRIMARY KEY,
        username TEXT,
        first_name TEXT,
        berries BIGINT DEFAULT 50000,
        gems BIGINT DEFAULT 0,
        crimson BIGINT DEFAULT 0,
        daily_streak INTEGER DEFAULT 0,
        weekly_streak INTEGER DEFAULT 0,
        last_daily_claim TIMESTAMP,
        last_weekly_claim TIMESTAMP,
        last_claim_date TIMESTAMP,
        favorite_waifu_id INTEGER,
        harem_filter_rarity INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS waifus (
        waifu_id BIGINT PRIMARY KEY,
        name TEXT NOT NULL,
        anime TEXT,
        rarity INTEGER,
        image_file_id TEXT,
        price BIGINT DEFAULT 5000,
        is_locked BOOLEAN DEFAULT FALSE,
        uploaded_by BIGINT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS harem (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        waifu_id BIGINT NOT NULL,
        acquired_date TIMESTAMP DEFAULT NOW(),
        owned_since TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, waifu_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        role_type TEXT NOT NULL,
        UNIQUE(user_id, role_type)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cooldowns (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        command TEXT NOT NULL,
        last_used TIMESTAMP,
        UNIQUE(user_id, command)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS start_media (
        id BIGSERIAL PRIMARY KEY,
        file_id TEXT NOT NULL,
        media_type TEXT NOT NULL,
        uploaded_by BIGINT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS spawn_tracker (
        group_id BIGINT PRIMARY KEY,
        message_count INTEGER DEFAULT 0,
        active_spawn_waifu_id BIGINT,
        active_spawn_name TEXT,
        bid_message_count INTEGER DEFAULT 0,
        last_spawn TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS group_settings (
        group_id BIGINT PRIMARY KEY,
        group_name TEXT,
        spawn_enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS bazaar_items (
        item_id BIGSERIAL PRIMARY KEY,
        waifu_id BIGINT NOT NULL,
        seller_id BIGINT NOT NULL,
        price BIGINT NOT NULL,
        status TEXT DEFAULT 'active',
        listed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS bot_settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS redeem_codes (
        code TEXT PRIMARY KEY,
        code_type TEXT NOT NULL,
        amount BIGINT,
        waifu_id BIGINT,
        max_uses INTEGER DEFAULT 1,
        uses INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query('COMMIT');
    console.log('✅ PostgreSQL: All tables ensured');
  } catch (err) {
    await client.query('ROLLBACK').catch(()=>{});
    console.error('❌ PostgreSQL initialization failed:', err && err.message ? err.message : err);
    throw err;
  } finally {
    client.release();
  }
}

// Only initialize DB connection when explicitly enabled to avoid attempting
// PostgreSQL connections from non-Render environments (local dev / Codespace).
// In Render set `RUN_DB_INIT=true` (or set this env in your deployment) so
// the service initializes DB tables on startup.
let ready;
if (process.env.RUN_DB_INIT === 'true') {
  ready = initialize().catch(err => { console.error('DB ready error', err && err.message); });
} else {
  ready = Promise.resolve(false);
  console.log('ℹ️ DB initialization skipped (set RUN_DB_INIT=true in Render to enable)');
}

module.exports = { pool, query, ready, initialize };