try {
  const { query } = require('./src/db');
  (async () => {
    const u = await query('SELECT COUNT(*) as c FROM users');
    console.log('users count:', u.rows[0] ? u.rows[0].c : 0);
    const w = await query('SELECT COUNT(*) as c FROM waifus');
    console.log('waifus count:', w.rows[0] ? w.rows[0].c : 0);
    process.exit(0);
  })();
} catch (e) {
  console.error('DB error:', e);
  process.exit(1);
}
