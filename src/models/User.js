const { db } = require('../db');

class User {
    constructor(data = {}) {
        this.user_id = data.user_id;
        this.username = data.username || null;
        this.first_name = data.first_name || null;
        this.berries = typeof data.berries === 'number' ? data.berries : 50000;
        this.gems = typeof data.gems === 'number' ? data.gems : 0;
        this.crimson = typeof data.crimson === 'number' ? data.crimson : 0;
        this.daily_streak = data.daily_streak || 0;
        this.weekly_streak = data.weekly_streak || 0;
        this.last_daily_claim = data.last_daily_claim || null;
        this.last_weekly_claim = data.last_weekly_claim || null;
        this.last_claim_date = data.last_claim_date || null;
        this.favorite_waifu_id = data.favorite_waifu_id || null;
        this.harem_filter_rarity = data.harem_filter_rarity || null;
        this.created_at = data.created_at || null;
    }

    async save() {
        const stmt = db.prepare(`
            INSERT INTO users (user_id, username, first_name, berries, gems, crimson, daily_streak, weekly_streak, last_daily_claim, last_weekly_claim, last_claim_date, favorite_waifu_id, harem_filter_rarity, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                username = excluded.username,
                first_name = excluded.first_name,
                berries = excluded.berries,
                gems = excluded.gems,
                crimson = excluded.crimson,
                daily_streak = excluded.daily_streak,
                weekly_streak = excluded.weekly_streak,
                last_daily_claim = excluded.last_daily_claim,
                last_weekly_claim = excluded.last_weekly_claim,
                last_claim_date = excluded.last_claim_date,
                favorite_waifu_id = excluded.favorite_waifu_id,
                harem_filter_rarity = excluded.harem_filter_rarity
        `);

        stmt.run(
            this.user_id,
            this.username,
            this.first_name,
            this.berries,
            this.gems,
            this.crimson,
            this.daily_streak,
            this.weekly_streak,
            this.last_daily_claim,
            this.last_weekly_claim,
            this.last_claim_date,
            this.favorite_waifu_id,
            this.harem_filter_rarity,
            this.created_at
        );
        return this;
    }

    static async findOne(filter = {}) {
        if (filter.user_id) {
            const row = db.prepare('SELECT * FROM users WHERE user_id = ?').get(filter.user_id);
            return row ? new User(row) : null;
        }
        // Generic fallback: return null
        return null;
    }

    static async find(filter = {}) {
        const rows = db.prepare('SELECT * FROM users').all();
        return rows.map(r => new User(r));
    }
}

module.exports = User;