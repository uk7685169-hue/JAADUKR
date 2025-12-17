require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const User = require('./models/User');
const Waifu = require('./models/Waifu');
const Harem = require('./models/Harem');

const DATA_DIR = './src/data_files';
const BOT_DATA_FILE = path.join(DATA_DIR, 'bot_data.json');
const WAIFUS_DATA_FILE = path.join(DATA_DIR, 'waifus_data.json');
const USERS_DATA_FILE = path.join(DATA_DIR, 'users_data.json');

async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (error) {
        console.error('Error creating data directory:', error);
    }
}

async function saveBotData() {
    try {
        const botData = {
            last_updated: new Date().toISOString(),
            settings: {
                spawn_rate: 100,
                bid_rate: 150,
                owner_id: 6245574035,
                channel_id: process.env.CHANNEL_ID,
                upload_group_id: process.env.UPLOAD_GROUP_ID
            },
            statistics: {
                total_users: await User.countDocuments(),
                total_waifus: await Waifu.countDocuments(),
                total_harem_entries: await Harem.countDocuments(),
                total_groups: 0 // Not implemented in MongoDB yet
            },
            roles: {
                developers: [], // Not implemented
                sudos: [],
                uploaders: []
            }
        };

        await fs.writeFile(BOT_DATA_FILE, JSON.stringify(botData, null, 2));
        console.log('✅ Bot data saved to:', BOT_DATA_FILE);
    } catch (error) {
        console.error('❌ Error saving bot data:', error);
    }
}

async function saveWaifusData() {
    try {
        const waifus = await Waifu.find().sort({ waifu_id: 1 });

        const waifusData = {
            last_updated: new Date().toISOString(),
            total_waifus: waifus.length,
            waifus: waifus.map(w => ({
                waifu_id: w.waifu_id,
                name: w.name,
                anime: w.anime,
                rarity: w.rarity,
                rarity_name: getRarityName(w.rarity),
                image_file_id: w.image_file_id,
                price: w.price,
                is_locked: w.is_locked,
                uploaded_by: w.uploaded_by,
                created_at: w.created_at,
                total_owners: 0
            }))
        };

        for (let i = 0; i < waifusData.waifus.length; i++) {
            const ownerCount = await Harem.countDocuments({ waifu_id: waifusData.waifus[i].waifu_id });
            waifusData.waifus[i].total_owners = ownerCount;
        }

        await fs.writeFile(WAIFUS_DATA_FILE, JSON.stringify(waifusData, null, 2));
        console.log('✅ Waifus data saved to:', WAIFUS_DATA_FILE);
    } catch (error) {
        console.error('❌ Error saving waifus data:', error);
    }
}

async function saveUsersData() {
    try {
        const users = await User.find().sort({ user_id: 1 });

        const usersData = {
            last_updated: new Date().toISOString(),
            total_users: users.length,
            users: []
        };

        for (const user of users) {
            const haremCount = await Harem.countDocuments({ user_id: user.user_id });

            const harem = await Harem.find({ user_id: user.user_id }).populate('waifu_id').sort({ owned_since: -1 });

            usersData.users.push({
                user_id: user.user_id,
                username: user.username,
                first_name: user.first_name,
                berries: user.berries,
                gems: user.gems,
                crimson: user.berries, // Assuming crimson is berries
                daily_streak: user.daily_streak,
                weekly_streak: user.weekly_streak,
                last_daily_claim: user.last_daily_claim,
                last_weekly_claim: user.last_weekly_claim,
                favorite_waifu_id: user.favorite_waifu_id,
                total_waifus: haremCount,
                roles: [], // Not implemented
                harem: harem.map(h => h.waifu_id),
                created_at: user.created_at
            });
        }

        await fs.writeFile(USERS_DATA_FILE, JSON.stringify(usersData, null, 2));
        console.log('✅ Users data saved to:', USERS_DATA_FILE);
    } catch (error) {
        console.error('❌ Error saving users data:', error);
    }
}

function getRarityName(rarity) {
    const names = {
        1: 'Common ⚪',
        2: 'Rare 🟢',
        3: 'Normal 🟣',
        4: 'Legendary 🟡',
        5: 'Summer 🏖',
        6: 'Winter ❄️',
        7: 'Valentine 💕',
        8: 'Manga ✨',
        9: 'Unique 👑',
        10: 'Neon 💫',
        11: 'Celestial 🪽',
        12: 'Mythical 🪭',
        13: 'Special 🫧',
        14: 'Masterpiece 💸',
        15: 'Limited 🔮',
        16: 'AMV 🎥'
    };
    return names[rarity] || 'Unknown';
}

async function saveAllData() {
    try {
        console.log('\n🔄 Starting automatic data save...\n');
        await ensureDataDir();
        
        console.log('💾 Saving bot data...');
        await saveBotData();
        
        console.log('🎴 Saving waifus data...');
        await saveWaifusData();
        
        console.log('👥 Saving users data...');
        await saveUsersData();
        
        console.log('\n✅ All data files saved successfully!\n');
        return true;
    } catch (error) {
        console.error('\n❌ ERROR in saveAllData:', error);
        throw error;
    }
}

module.exports = { saveAllData, saveBotData, saveWaifusData, saveUsersData };
