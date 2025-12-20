try{
  const { db } = require('./src/db');
  const row = db.prepare('SELECT COUNT(*) as c FROM users').get();
  console.log('users count:', row ? row.c : 0);
  const w = db.prepare('SELECT COUNT(*) as c FROM waifus').get();
  console.log('waifus count:', w ? w.c : 0);
  process.exit(0);
}catch(e){
  console.error('DB error:', e);
  process.exit(1);
}
