const { pool } = require('./src/db-helpers');
(async () => {
  try {
    console.log(await pool.query('SELECT 1 as ok'));
    const tg = await pool.query('SELECT * FROM start_media LIMIT 1');
    console.log('start_media sample:', tg.rows.length);
    const g = await pool.query(`SELECT g.group_id, g.group_name, SUM(u.berries) as total_cash, COUNT(DISTINCT u.user_id) as member_count FROM group_settings g LEFT JOIN users u ON u.user_id IN ( SELECT DISTINCT user_id FROM harem WHERE user_id IN ( SELECT user_id FROM users WHERE user_id > 0 ) ) GROUP BY g.group_id, g.group_name ORDER BY total_cash DESC LIMIT 1`);
    console.log('group query ok, rows:', g.rows.length);
  } catch (e) {
    console.error('ERR', e);
  }
})();
