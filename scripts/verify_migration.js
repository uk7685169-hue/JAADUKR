const db = require('../src/db');

async function run() {
  await db.ready();
  const users = await db.query('SELECT COUNT(*) as c FROM users');
  const waifus = await db.query('SELECT COUNT(*) as c FROM waifus');
  const harem = await db.query('SELECT COUNT(*) as c FROM harem');
  const roles = await db.query('SELECT COUNT(*) as c FROM roles');
  const startMedia = await db.query('SELECT COUNT(*) as c FROM start_media');
  console.log('counts:', users.rows[0].c, 'users |', waifus.rows[0].c, 'waifus |', harem.rows[0].c, 'harem |', roles.rows[0].c, 'roles |', startMedia.rows[0].c, 'start_media');

  const sampleUsers = await db.query('SELECT user_id, username, first_name, berries, gems FROM users ORDER BY user_id LIMIT 5');
  const sampleWaifus = await db.query('SELECT waifu_id, name, anime, rarity, image_file_id FROM waifus ORDER BY waifu_id LIMIT 5');
  console.log('\nSample users:');
  console.table(sampleUsers.rows);
  console.log('\nSample waifus:');
  console.table(sampleWaifus.rows.map(r=>({waifu_id:r.waifu_id, name:r.name, anime:r.anime, rarity:r.rarity, image_file_id:(r.image_file_id? r.image_file_id.substring(0,12)+'...' : null)})));
}

run().catch(e=>{console.error(e); process.exit(1);});
