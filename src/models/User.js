const { query } = require('../db');

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
        const sql = `INSERT INTO users (user_id, username, first_name, berries, gems, crimson, daily_streak, weekly_streak, last_daily_claim, last_weekly_claim, last_claim_date, favorite_waifu_id, harem_filter_rarity, created_at)
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
                harem_filter_rarity = EXCLUDED.harem_filter_rarity`;

        await query(sql, [
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
            this.created_at,
        ]);
        return this;
    }

    static async findOne(filter = {}) {
        if (filter.user_id) {
            const res = await query('SELECT * FROM users WHERE user_id = $1 LIMIT 1', [filter.user_id]);
            const row = res.rows[0];
            return row ? new User(row) : null;
        }
        return null;
    }

    static async find(filter = {}) {
        const res = await query('SELECT * FROM users');
        return res.rows.map(r => new User(r));
    }
}

module.exports = User;