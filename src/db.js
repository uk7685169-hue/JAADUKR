const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'bot.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

function initializeDatabase() {
    try {
        console.log('🔄 Initializing SQLite database tables...');

        // Users table
        db.exec(`
            CREATE TABLE IF NOT EXISTS users (
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
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id)
            )
        `);
        console.log('✅ Users table ready');

        // Waifus table
        db.exec(`
            CREATE TABLE IF NOT EXISTS waifus (
                waifu_id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                anime TEXT NOT NULL,
                rarity INTEGER NOT NULL CHECK (rarity >= 1 AND rarity <= 16),
                image_file_id TEXT,
                price INTEGER DEFAULT 5000,
                is_locked BOOLEAN DEFAULT 0,
                uploaded_by INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(waifu_id)
            )
        `);
        console.log('✅ Waifus table ready');

        // Harem/Inventory table (user owns waifu)
        db.exec(`
            CREATE TABLE IF NOT EXISTS harem (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                waifu_id INTEGER NOT NULL,
                acquired_date TEXT DEFAULT CURRENT_TIMESTAMP,
                owned_since TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(user_id),
                FOREIGN KEY(waifu_id) REFERENCES waifus(waifu_id),
                UNIQUE(user_id, waifu_id)
            )
        `);
        console.log('✅ Harem table ready');

        // Roles table
        db.exec(`
            CREATE TABLE IF NOT EXISTS roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                role_type TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(user_id),
                UNIQUE(user_id, role_type)
            )
        `);
        console.log('✅ Roles table ready');

        // Cooldowns table
        db.exec(`
            CREATE TABLE IF NOT EXISTS cooldowns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                command TEXT NOT NULL,
                last_used TEXT,
                UNIQUE(user_id, command)
            )
        `);
        console.log('✅ Cooldowns table ready');

        // Group settings table
        db.exec(`
            CREATE TABLE IF NOT EXISTS group_settings (
                group_id INTEGER PRIMARY KEY,
                spawn_enabled BOOLEAN DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Group settings table ready');

        // Spawn tracker table
        db.exec(`
            CREATE TABLE IF NOT EXISTS spawn_tracker (
                group_id INTEGER PRIMARY KEY,
                message_count INTEGER DEFAULT 0,
                active_spawn_waifu_id INTEGER,
                active_spawn_name TEXT,
                bid_message_count INTEGER DEFAULT 0,
                last_spawn TEXT
            )
        `);
        console.log('✅ Spawn tracker table ready');

        // Group bids table
        db.exec(`
            CREATE TABLE IF NOT EXISTS group_bids (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id INTEGER NOT NULL,
                waifu_id INTEGER NOT NULL,
                current_bid INTEGER DEFAULT 0,
                current_bidder_id INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(waifu_id) REFERENCES waifus(waifu_id)
            )
        `);
        console.log('✅ Group bids table ready');

        // Bazaar items table
        db.exec(`
            CREATE TABLE IF NOT EXISTS bazaar_items (
                item_id INTEGER PRIMARY KEY AUTOINCREMENT,
                waifu_id INTEGER NOT NULL,
                seller_id INTEGER NOT NULL,
                price INTEGER NOT NULL,
                status TEXT DEFAULT 'active',
                listed_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(waifu_id) REFERENCES waifus(waifu_id),
                FOREIGN KEY(seller_id) REFERENCES users(user_id)
            )
        `);
        console.log('✅ Bazaar items table ready');

        // Spam blocks table
        db.exec(`
            CREATE TABLE IF NOT EXISTS spam_blocks (
                user_id INTEGER PRIMARY KEY,
                blocked_until TEXT
            )
        `);
        console.log('✅ Spam blocks table ready');

        // Banned users table
        db.exec(`
            CREATE TABLE IF NOT EXISTS banned_users (
                user_id INTEGER PRIMARY KEY,
                banned_at TEXT DEFAULT CURRENT_TIMESTAMP,
                reason TEXT
            )
        `);
        console.log('✅ Banned users table ready');

        // Bot settings table
        db.exec(`
            CREATE TABLE IF NOT EXISTS bot_settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Bot settings table ready');

        // Redeem codes table
        db.exec(`
            CREATE TABLE IF NOT EXISTS redeem_codes (
                code TEXT PRIMARY KEY,
                code_type TEXT NOT NULL,
                amount INTEGER,
                waifu_id INTEGER,
                max_uses INTEGER DEFAULT 1,
                uses INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(waifu_id) REFERENCES waifus(waifu_id)
            )
        `);
        console.log('✅ Redeem codes table ready');

        console.log('✅ All database tables initialized');
    } catch (error) {
        console.error('❌ Database initialization error:', error);
        throw error;
    }
}

function migrateFromJSON() {
    try {
        const dataPath = path.join(__dirname, '..', 'data');

        // Check if migration already done
        const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
        if (userCount.count > 0) {
            console.log('✅ Migration already done (users exist in DB)');
            return;
        }

        console.log('🔄 Migrating data from JSON files...');

        let usersData = [];
        let waifusData = [];

        const dbJsonPath = path.join(dataPath, 'db.json');
        const usersJsonPath = path.join(dataPath, 'users.json');
        const waifusJsonPath = path.join(dataPath, 'waifus.json');

        // Try db.json
        try {
            const dbJson = JSON.parse(fs.readFileSync(dbJsonPath, 'utf8'));
            usersData = dbJson.users || [];
            waifusData = dbJson.waifus || [];
            console.log(`📄 Loaded ${usersData.length} users and ${waifusData.length} waifus from db.json`);
        } catch (e) {
            console.log('⚠️ db.json not found or invalid');

            // Fallback to individual files
            try {
                const usersJson = JSON.parse(fs.readFileSync(usersJsonPath, 'utf8'));
                usersData = usersJson.users || [];
                console.log(`📄 Loaded ${usersData.length} users from users.json`);
            } catch (e2) {
                console.log('⚠️ users.json not found');
            }

            try {
                const waifusJson = JSON.parse(fs.readFileSync(waifusJsonPath, 'utf8'));
                waifusData = waifusJson.waifus || [];
                console.log(`📄 Loaded ${waifusData.length} waifus from waifus.json`);
            } catch (e2) {
                console.log('⚠️ waifus.json not found');
            }
        }

        // Insert waifus first
        if (waifusData.length > 0) {
            console.log('🎴 Inserting waifus...');
            const insertWaifu = db.prepare(`
                INSERT OR IGNORE INTO waifus (waifu_id, name, anime, rarity, image_file_id, price, is_locked, uploaded_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            for (const w of waifusData) {
                insertWaifu.run(
                    w.waifu_id,
                    w.name,
                    w.anime,
                    w.rarity,
                    w.image_file_id || null,
                    w.price || 5000,
                    w.is_locked ? 1 : 0,
                    w.uploaded_by || null,
                    w.created_at || new Date().toISOString()
                );
            }
            console.log(`✅ Inserted ${waifusData.length} waifus`);
        }

        // Insert users
        if (usersData.length > 0) {
            console.log('👥 Inserting users...');
            const insertUser = db.prepare(`
                INSERT OR IGNORE INTO users (user_id, username, first_name, berries, gems, crimson, daily_streak, weekly_streak, last_daily_claim, last_weekly_claim, favorite_waifu_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const insertHarem = db.prepare(`
                INSERT OR IGNORE INTO harem (user_id, waifu_id, acquired_date, owned_since)
                VALUES (?, ?, ?, ?)
            `);

            const insertRole = db.prepare(`
                INSERT OR IGNORE INTO roles (user_id, role_type)
                VALUES (?, ?)
            `);

            for (const u of usersData) {
                insertUser.run(
                    u.user_id,
                    u.username || null,
                    u.first_name || null,
                    u.berries || 50000,
                    u.gems || 0,
                    u.crimson || 0,
                    u.daily_streak || 0,
                    u.weekly_streak || 0,
                    u.last_daily_claim || null,
                    u.last_weekly_claim || null,
                    u.favorite_waifu_id || null,
                    u.created_at || new Date().toISOString()
                );

                // Insert harem entries
                if (u.harem && Array.isArray(u.harem)) {
                    for (const h of u.harem) {
                        insertHarem.run(u.user_id, h.waifu_id || h, new Date().toISOString(), new Date().toISOString());
                    }
                }

                // Insert roles
                if (u.roles && Array.isArray(u.roles)) {
                    for (const role of u.roles) {
                        insertRole.run(u.user_id, role);
                    }
                }
            }
            console.log(`✅ Inserted ${usersData.length} users with their harem and roles`);
        }

        console.log('✅ Migration complete');
    } catch (error) {
        console.error('❌ Migration error:', error);
        throw error;
    }
}

// Initialize on module load
initializeDatabase();
migrateFromJSON();

module.exports = { db };