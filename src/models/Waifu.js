const { db } = require('../db');

class Waifu {
    constructor(data = {}) {
        this.waifu_id = data.waifu_id;
        this.name = data.name;
        this.anime = data.anime;
        this.rarity = data.rarity;
        this.image_file_id = data.image_file_id || null;
        this.price = typeof data.price === 'number' ? data.price : 5000;
        this.is_locked = data.is_locked ? 1 : 0;
        this.uploaded_by = data.uploaded_by || null;
        this.created_at = data.created_at || null;
    }

    static async find(filter = {}) {
        let sql = 'SELECT * FROM waifus';
        const params = [];
        if (filter && Object.prototype.hasOwnProperty.call(filter, 'is_locked')) {
            sql += ' WHERE is_locked = ?';
            params.push(filter.is_locked ? 1 : 0);
        }
        const rows = db.prepare(sql).all(...params);
        return rows.map(r => new Waifu(r));
    }

    static async findOne(filter = {}) {
        if (filter.waifu_id) {
            const row = db.prepare('SELECT * FROM waifus WHERE waifu_id = ? LIMIT 1').get(filter.waifu_id);
            return row ? new Waifu(row) : null;
        }
        if (filter.name) {
            const row = db.prepare('SELECT * FROM waifus WHERE LOWER(name) = LOWER(?) LIMIT 1').get(filter.name);
            return row ? new Waifu(row) : null;
        }
        return null;
    }
}

module.exports = Waifu;