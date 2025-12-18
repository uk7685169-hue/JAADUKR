require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { merge } = require('./merge_data_into_dbjson');

const DATA_DIR = './data';
const DB_FILE = path.join(DATA_DIR, 'db.json');

async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (error) {
        console.error('Error creating data directory:', error);
    }
}

async function saveBotData() {
    // Delegated to merge (single-file persistence)
    try {
        await merge();
        console.log('✅ Bot data merged into db.json');
    } catch (error) {
        console.error('❌ Error merging bot data:', error);
    }
}

async function saveWaifusData() {
    try {
        await merge();
        console.log('✅ Waifus data merged into db.json');
    } catch (error) {
        console.error('❌ Error merging waifus data:', error);
    }
}

async function saveUsersData() {
    try {
        await merge();
        console.log('✅ Users data merged into db.json');
    } catch (error) {
        console.error('❌ Error merging users data:', error);
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
        console.log('\n🔄 Running single-file DB merge...\n');
        await fs.mkdir(DATA_DIR, { recursive: true });
        await merge();
        console.log('\n✅ db.json updated successfully!\n');
        return true;
    } catch (error) {
        console.error('\n❌ ERROR in saveAllData:', error);
        throw error;
    }
}

module.exports = { saveAllData, saveBotData, saveWaifusData, saveUsersData };
