const db = require('../src/db');

async function run() {
  await db.ready();
  const users = await db.query('SELECT COUNT(*) as c FROM users');
  const waifus = await db.query('SELECT COUNT(*) as c FROM waifus');
  const harem = await db.query('SELECT COUNT(*) as c FROM harem');
  console.log('users:', users.rows[0].c, 'waifus:', waifus.rows[0].c, 'harem:', harem.rows[0].c);
}
run().catch(e=>{console.error(e); process.exit(1);});
