(async()=>{
  try{
    const User=require('./src/models/User');
    const Waifu=require('./src/models/Waifu');
    const { db } = require('./src/db');
    const path = require('path');
    console.log('DB file:', path.join(__dirname,'data','bot.db'));
    let u = await User.findOne({ user_id: 123456 });
    if(!u){
      u = new User({ user_id: 123456, username: 'testuser', first_name: 'Test', berries: 1000 });
      await u.save();
      console.log('User saved');
    } else {
      console.log('User exists:', u.user_id, u.username, 'berries:', u.berries);
    }
    const wa = await Waifu.find({ is_locked: false });
    console.log('Waifus count (sample):', wa.length);
    process.exit(0);
  }catch(err){
    console.error('Error:', err);
    process.exit(1);
  }
})();
