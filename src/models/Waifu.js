const { query } = require('../db');

class Waifu {
    constructor(data = {}) {
        this.waifu_id = data.waifu_id;
        this.name = data.name;
        this.anime = data.anime;
        this.rarity = data.rarity;
        this.image_file_id = data.image_file_id || null;
        this.price = typeof data.price === 'number' ? data.price : 5000;
        this.is_locked = data.is_locked ? true : false;
        this.uploaded_by = data.uploaded_by || null;
        this.created_at = data.created_at || null;
    }

    static async find(filter = {}) {
        let sql = 'SELECT * FROM waifus';
        const params = [];
        if (filter && Object.prototype.hasOwnProperty.call(filter, 'is_locked')) {
            sql += ' WHERE is_locked = $1';
            params.push(filter.is_locked ? true : false);
        }
        const res = params.length ? await query(sql, params) : await query(sql);
        return res.rows.map(r => new Waifu(r));
    }

    static async findOne(filter = {}) {
        if (filter.waifu_id) {
            const res = await query('SELECT * FROM waifus WHERE waifu_id = $1 LIMIT 1', [filter.waifu_id]);
            const row = res.rows[0];
            return row ? new Waifu(row) : null;
        }
        if (filter.name) {
            const res = await query('SELECT * FROM waifus WHERE LOWER(name) = LOWER($1) LIMIT 1', [filter.name]);
            const row = res.rows[0];
            return row ? new Waifu(row) : null;
        }
        return null;
    }
}

module.exports = Waifu;