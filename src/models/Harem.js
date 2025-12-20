const { db } = require('../db');

class Harem {
    constructor(data = {}) {
        this.user_id = data.user_id;
        this.waifu_id = data.waifu_id;
        this.acquired_date = data.acquired_date || null;
        this.owned_since = data.owned_since || null;
    }

    static async find(filter = {}) {
        if (filter.user_id) {
            const rows = db.prepare('SELECT * FROM harem WHERE user_id = ?').all(filter.user_id);
            return rows.map(r => new Harem(r));
        }
        const rows = db.prepare('SELECT * FROM harem').all();
        return rows.map(r => new Harem(r));
    }
}

module.exports = Harem;