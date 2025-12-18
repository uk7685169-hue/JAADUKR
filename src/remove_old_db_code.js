#!/usr/bin/env node
// This script removes all pool.query references and replaces with db.prepare/run
// Used for migration only
const fs = require('fs');
const path = require('path');

const botFile = path.join(__dirname, '..', 'bot.js');
let content = fs.readFileSync(botFile, 'utf8');

// Remove getPool usage
content = content.replace(/const \{ getPool \} = require\('\.\/src\/db\.js'\);/g, '');
content = content.replace(/const \{ saveAllData.*?\} = require\('\.\/src\/auto_save_data\.js'\);/g, '');

// Replace all async pool.query with db.prepare
// This is complex - best to do manually per function

console.log('Manual migration recommended - use SQLite db.prepare instead of pool.query');
