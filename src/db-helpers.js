const db = require('./db');

// Expose a `pool` compatibility object with `query(sql, params)` to match existing code
const pool = {
  query: async (sql, params = []) => {
    if (!Array.isArray(params)) {
      if (params === undefined || params === null) params = [];
      else params = [params];
    }
    return db.query(sql, params);
  }
};

module.exports = { pool };
