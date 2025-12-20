const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const DB_PATH = process.env.DB_PATH || '/tmp/waifu.db';

let dbInstance = null;
let _ready = null;

function open() {
    return new Promise((resolve, reject) => {
        try {
            const dir = path.dirname(DB_PATH);
            if (dir) fs.mkdirSync(dir, { recursive: true });
        } catch (e) {
            console.warn('Could not ensure DB directory exists:', e && e.message ? e.message : e);
        }

        const db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) return reject(err);
            dbInstance = db;
            console.log('✅ sqlite3 connected at', DB_PATH);
            resolve(db);
        });
    });
}

function run(sql, params = []) {
    return _ready.then(() => new Promise((resolve, reject) => {
        dbInstance.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve({ changes: this.changes, lastID: this.lastID });
        });
    }));
}

function get(sql, params = []) {
    return _ready.then(() => new Promise((resolve, reject) => {
        dbInstance.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    }));
}

function all(sql, params = []) {
    return _ready.then(() => new Promise((resolve, reject) => {
        dbInstance.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    }));
}

async function query(sql, params = []) {
    // Normalize some Postgres-style SQL to SQLite-compatible SQL
    let converted = sql.replace(/\$\d+/g, '?');

    // Replace NOW() with SQLite datetime('now')
    converted = converted.replace(/\bNOW\(\)/ig, "datetime('now')");

    // Handle ON CONFLICT DO NOTHING / ON CONFLICT (cols) DO NOTHING and variants
    // Convert to INSERT OR IGNORE by removing the conflict clause and adding OR IGNORE
    const conflictDoNothingRegex = /ON\s+CONFLICT(?:\s*\([^)]*\))?\s+DO\s+NOTHING/ig;
    if (conflictDoNothingRegex.test(converted)) {
        converted = converted.replace(conflictDoNothingRegex, '');
        // Change first INSERT INTO to INSERT OR IGNORE INTO
        converted = converted.replace(/INSERT\s+INTO/i, 'INSERT OR IGNORE INTO');
    }

    // Some malformed variants like 'ON CONFLICT NOTHING' — remove them and use OR IGNORE
    const conflictNothingRegex = /ON\s+CONFLICT\s+NOTHING/ig;
    if (conflictNothingRegex.test(converted)) {
        converted = converted.replace(conflictNothingRegex, '');
        converted = converted.replace(/INSERT\s+INTO/i, 'INSERT OR IGNORE INTO');
    }

    const trimmed = converted.trim().toUpperCase();
    if (trimmed.startsWith('SELECT')) {
        const rows = await all(converted, params);
        return { rows, rowCount: rows.length };
    }

    if (converted.toUpperCase().includes('RETURNING')) {
        try {
            const row = await get(converted, params);
            return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
        } catch (e) {
            // fallthrough
        }
    }

    const info = await run(converted, params);
    return { rows: [], rowCount: info.changes || 0, lastID: info.lastID };
}

async function initialize() {
    await open();
    return new Promise((resolve, reject) => {
        dbInstance.serialize(() => {
            try {
                dbInstance.run(`CREATE TABLE IF NOT EXISTS users (
                    user_id INTEGER PRIMARY KEY,
                    username TEXT,
                    first_name TEXT,
                    berries INTEGER DEFAULT 50000,
                    gems INTEGER DEFAULT 0,
                    crimson INTEGER DEFAULT 0,
                    daily_streak INTEGER DEFAULT 0,
                    weekly_streak INTEGER DEFAULT 0,
                    last_daily_claim TEXT,
                    last_weekly_claim TEXT,
                    last_claim_date TEXT,
                    favorite_waifu_id INTEGER,
                    harem_filter_rarity INTEGER,
                    created_at TEXT DEFAULT (datetime('now'))
                )`);

                dbInstance.run(`CREATE TABLE IF NOT EXISTS waifus (
                    waifu_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    anime TEXT NOT NULL,
                    rarity INTEGER NOT NULL,
                    image_file_id TEXT,
                    price INTEGER DEFAULT 5000,
                    is_locked INTEGER DEFAULT 0,
                    uploaded_by INTEGER,
                    created_at TEXT DEFAULT (datetime('now'))
                )`);

                dbInstance.run(`CREATE TABLE IF NOT EXISTS harem (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    waifu_id INTEGER NOT NULL,
                    acquired_date TEXT DEFAULT (datetime('now')),
                    owned_since TEXT DEFAULT (datetime('now')),
                    UNIQUE(user_id, waifu_id)
                )`);

                dbInstance.run(`CREATE TABLE IF NOT EXISTS roles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    role_type TEXT NOT NULL,
                    UNIQUE(user_id, role_type)
                )`);

                dbInstance.run(`CREATE TABLE IF NOT EXISTS cooldowns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    command TEXT NOT NULL,
                    last_used TEXT,
                    UNIQUE(user_id, command)
                )`);

                dbInstance.run(`CREATE TABLE IF NOT EXISTS group_settings (
                    group_id INTEGER PRIMARY KEY,
                    group_name TEXT,
                    spawn_enabled INTEGER DEFAULT 1,
                    created_at TEXT DEFAULT (datetime('now'))
                )`);

                dbInstance.run(`CREATE TABLE IF NOT EXISTS spawn_tracker (
                    group_id INTEGER PRIMARY KEY,
                    message_count INTEGER DEFAULT 0,
                    active_spawn_waifu_id INTEGER,
                    active_spawn_name TEXT,
                    bid_message_count INTEGER DEFAULT 0,
                    last_spawn TEXT
                )`);

                dbInstance.run(`CREATE TABLE IF NOT EXISTS group_bids (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    group_id INTEGER NOT NULL,
                    waifu_id INTEGER NOT NULL,
                    current_bid INTEGER DEFAULT 0,
                    current_bidder_id INTEGER,
                    created_at TEXT DEFAULT (datetime('now'))
                )`);

                dbInstance.run(`CREATE TABLE IF NOT EXISTS bazaar_items (
                    item_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    waifu_id INTEGER NOT NULL,
                    seller_id INTEGER NOT NULL,
                    price INTEGER NOT NULL,
                    status TEXT DEFAULT 'active',
                    listed_at TEXT DEFAULT (datetime('now'))
                )`);

                dbInstance.run(`CREATE TABLE IF NOT EXISTS spam_blocks (
                    user_id INTEGER PRIMARY KEY,
                    blocked_until TEXT
                )`);

                dbInstance.run(`CREATE TABLE IF NOT EXISTS banned_users (
                    user_id INTEGER PRIMARY KEY,
                    banned_at TEXT DEFAULT (datetime('now')),
                    reason TEXT
                )`);

                dbInstance.run(`CREATE TABLE IF NOT EXISTS bot_settings (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    updated_at TEXT DEFAULT (datetime('now'))
                )`);

                dbInstance.run(`CREATE TABLE IF NOT EXISTS redeem_codes (
                    code TEXT PRIMARY KEY,
                    code_type TEXT NOT NULL,
                    amount INTEGER,
                    waifu_id INTEGER,
                    max_uses INTEGER DEFAULT 1,
                    uses INTEGER DEFAULT 0,
                    created_at TEXT DEFAULT (datetime('now'))
                )`);

                dbInstance.run(`CREATE TABLE IF NOT EXISTS custom_commands (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    command_trigger TEXT UNIQUE NOT NULL,
                    reward_type TEXT NOT NULL,
                    reward_amount INTEGER,
                    waifu_id INTEGER,
                    expires_at TEXT,
                    created_at TEXT DEFAULT (datetime('now'))
                )`);

                dbInstance.run(`CREATE TABLE IF NOT EXISTS dynamic_commands (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    command_name TEXT UNIQUE NOT NULL,
                    command_response TEXT NOT NULL,
                    is_permanent INTEGER DEFAULT 1,
                    created_by INTEGER,
                    created_at TEXT DEFAULT (datetime('now'))
                )`);

                dbInstance.run(`CREATE TABLE IF NOT EXISTS start_media (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    file_id TEXT NOT NULL,
                    media_type TEXT NOT NULL,
                    uploaded_by INTEGER,
                    created_at TEXT DEFAULT (datetime('now'))
                )`);

                console.log('✅ All database tables ensured');
                resolve();
            } catch (err) {
                console.error('Failed to initialize tables:', err.message);
                reject(err);
            }
        });
    });
}

// Initialize immediately and expose readiness
_ready = initialize().catch(err => {
    console.error('Database initialization failed:', err && err.message ? err.message : err);
});

module.exports = { run, get, all, query, db: () => dbInstance, ready: () => _ready };