const { query } = require('./db');

function createCompatPool() {
  return {
    query: async (sql, params = []) => {
      // Delegate to src/db.js query implementation
      if (!Array.isArray(params)) {
        if (params === undefined || params === null) params = [];
        else params = [params];
      }
      return await query(sql, params);
    }
  };
}

const pool = createCompatPool();

module.exports = { pool };
