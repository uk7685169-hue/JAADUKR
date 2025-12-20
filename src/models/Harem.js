const { query } = require('../db');

class Harem {
    constructor(data = {}) {
        this.user_id = data.user_id;
        this.waifu_id = data.waifu_id;
        this.acquired_date = data.acquired_date || null;
        this.owned_since = data.owned_since || null;
    }

    static async find(filter = {}) {
        if (filter.user_id) {
            const res = await query('SELECT * FROM harem WHERE user_id = $1', [filter.user_id]);
            return res.rows.map(r => new Harem(r));
        }
        const res = await query('SELECT * FROM harem');
        return res.rows.map(r => new Harem(r));
    }
}

module.exports = Harem;