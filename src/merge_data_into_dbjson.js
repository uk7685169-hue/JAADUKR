const fs = require('fs').promises;
const path = require('path');

async function loadJson(p) {
  try {
    const txt = await fs.readFile(p, 'utf8');
    return JSON.parse(txt);
  } catch (e) {
    return null;
  }
}

function uniqBy(arr, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of arr || []) {
    const k = keyFn(item);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(item);
    }
  }
  return out;
}

async function merge() {
  const base = path.join(__dirname, '..', 'data');
  const usersFile = path.join(base, 'users.json');
  const waifusFile = path.join(base, 'waifus.json');
  const haremFile = path.join(base, 'harem.json');
  const outFile = path.join(base, 'db.json');

  const usersData = await loadJson(usersFile) || { users: [], total_users: 0 };
  const waifusData = await loadJson(waifusFile) || { waifus: [], total_waifus: 0 };
  const haremData = await loadJson(haremFile) || {};

  const users = uniqBy(usersData.users || [], (u) => String(u.user_id));
  const waifus = uniqBy(waifusData.waifus || [], (w) => String(w.waifu_id));

  const merged = {
    last_updated: new Date().toISOString(),
    total_users: users.length,
    total_waifus: waifus.length,
    settings: haremData.settings || {},
    statistics: {
      total_users: String(users.length),
      total_waifus: String(waifus.length),
      total_harem_entries: String((users.reduce((s, u) => s + (u.total_waifus || (u.harem?.length||0)), 0)) || 0),
      total_groups: haremData.statistics?.total_groups || 1
    },
    users,
    waifus
  };

  await fs.writeFile(outFile, JSON.stringify(merged, null, 2), 'utf8');
  console.log('✅ Wrote merged db.json ->', outFile);
}

if (require.main === module) {
  merge().catch(err => {
    console.error('Merge failed:', err);
    process.exit(1);
  });
}

module.exports = { merge };
