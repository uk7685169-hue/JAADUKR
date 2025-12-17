require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const { getPool } = require('./src/db');

const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;

if (!token) {
    console.error('Error: Bot token not found in environment variables');
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: false });
const pool = getPool();

const RARITY_NAMES = {
    1: 'Common ⚪',
    2: 'Rare 🟢',
    3: 'Normal 🟣',
    4: 'Legendary 🟡',
    5: 'Summer 🏖',
    6: 'Halloween 🎃',
    7: 'Christmas 🎄',
    8: 'Valentine 💖',
    9: 'Easter 🥚',
    10: 'Birthday 🎂',
    11: 'Anniversary 💍',
    12: 'Special 🌟',
    13: 'Mythic 🏆',
    14: 'Divine 👑',
    15: 'Ultimate 💎',
    16: 'AMV 🎬'
};

try {
    require('./src/guess_bot.js');
    console.log('✅ Guess bot loaded');
} catch (error) {
    console.warn('⚠️ Guess bot not loaded:', error.message);
}

// Database helper functions
async function ensureUser(userId, username, firstName) {
    if (!pool) return null;
    try {
        // Ensure gems column exists
        await pool.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='gems') THEN
                    ALTER TABLE users ADD COLUMN gems INT DEFAULT 0;
                END IF;
            END $$;
        `).catch(() => {});
        
        const result = await pool.query(
            'INSERT INTO users (user_id, username, first_name) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET username = $2, first_name = $3 RETURNING *',
            [userId, username, firstName]
        );
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error ensuring user:', error);
        return null;
    }
}

async function checkBanned(userId) {
    if (!pool) return false;
    try {
        const result = await pool.query('SELECT * FROM banned_users WHERE user_id = $1', [userId]);
        return result.rows.length > 0;
    } catch (error) {
        console.error('❌ Error checking ban:', error);
        return false;
    }
}

async function checkUserAccess(msg) {
    // Basic access check
    return true;
}

async function sendReply(chatId, messageId, text, options = {}) {
    return bot.sendMessage(chatId, text, {
        reply_to_message_id: messageId,
        parse_mode: 'HTML',
        ...options
    });
}

async function sendPhotoReply(chatId, messageId, photo, caption, options = {}) {
    return bot.sendPhoto(chatId, photo, {
        reply_to_message_id: messageId,
        caption,
        parse_mode: 'HTML',
        ...options
    });
}

async function getRandomWaifu(rarityRange = [1, 13], excludeRarities = []) {
    if (!pool) return null;
    try {
        let query = 'SELECT * FROM waifus WHERE rarity BETWEEN $1 AND $2 AND is_locked = FALSE';
        let params = rarityRange;
        
        if (excludeRarities.length > 0) {
            query += ' AND rarity NOT IN (' + excludeRarities.map((_, i) => `$${params.length + i + 1}`).join(',') + ')';
            params = params.concat(excludeRarities);
        }

        query += ' ORDER BY RANDOM() LIMIT 1';
        
        const result = await pool.query(query, params);
        return result.rows[0] || null;
    } catch (error) {
        console.error('❌ Error getting random waifu:', error);
        return null;
    }
}

bot.onText(/\/start/, async (msg) => {
    const userId = msg.from.id;
    
    // Block banned users completely
    if (await checkBanned(userId)) {
        return;
    }
    
    if (!await checkUserAccess(msg)) return;

    await ensureUser(userId, msg.from.username, msg.from.first_name);

    const botUsername = (await bot.getMe()).username;
    const mainMenuKeyboard = {
        inline_keyboard: [
            [
                { text: 'SUPPORT', url: 'https://t.me/+jhEIZcNrvtcxZjc1' },
                { text: 'HELP', callback_data: 'menu_help' }
            ],
            [{ text: 'ADD ME BABY 💖', url: `https://t.me/${botUsername}?startgroup=true` }],
            [
                { text: 'OFFICIALGC', url: 'https://t.me/+jhEIZcNrvtcxZjc1' },
                { text: 'CREDITS', callback_data: 'menu_credits' }
            ]
        ]
    };

    const welcomeText = `👋 ʜɪ, ᴍʏ ɴᴀᴍᴇ ɪs 𝗔𝗤𝗨𝗔 𝗪𝗔𝗜𝗙𝗨 𝗕𝗢𝗧, ᴀɴ ᴀɴɪᴍᴇ-ʙᴀsᴇᴅ ɢᴀᴍᴇs ʙᴏᴛ! ᴀᴅᴅ ᴍᴇ ᴛᴏ ʏᴏᴜʀ ɢʀᴏᴜᴘ ᴀɴᴅ ᴛʜᴇ ᴇxᴘᴇʀɪᴇɴᴄᴇ ɢᴇᴛs ᴇxᴘᴀɴᴅᴇᴅ. ʟᴇᴛ's ɪɴɪᴛɪᴀᴛᴇ ᴏᴜʀ ᴊᴏᴜʀɴᴇʏ ᴛᴏɢᴇᴛʜᴇʀ!

sᴜᴘᴘᴏʀᴛ              ᴏғғɪᴄɪᴀʟ ɢʀᴏᴜᴘ

ᴏᴡɴᴇʀ                 ғᴏᴜɴᴅᴇʀ



OWNER - 6245574035 & 8195158525
FOUNDER - 6245574035`;

    try {
        // Get random media from start_media table
        if (pool) {
            const mediaResult = await pool.query('SELECT * FROM start_media ORDER BY RANDOM() LIMIT 1');
            
            if (mediaResult.rows.length > 0) {
                const media = mediaResult.rows[0];
                if (media.media_type === 'video') {
                    await bot.sendVideo(msg.chat.id, media.file_id, {
                        caption: welcomeText,
                        reply_to_message_id: msg.message_id,
                        reply_markup: mainMenuKeyboard,
                        parse_mode: 'HTML'
                    });
                } else {
                    await bot.sendPhoto(msg.chat.id, media.file_id, {
                        caption: welcomeText,
                        reply_to_message_id: msg.message_id,
                        reply_markup: mainMenuKeyboard,
                        parse_mode: 'HTML'
                    });
                }
                return;
            }
        }
        
        // Fallback to text only
        await bot.sendMessage(msg.chat.id, welcomeText, {
            reply_to_message_id: msg.message_id,
            reply_markup: mainMenuKeyboard,
            parse_mode: 'HTML'
        });
    } catch (error) {
        console.error('❌ Error sending start message:', error);
        // Fallback
        await bot.sendMessage(msg.chat.id, 'Bot is online', {
            reply_to_message_id: msg.message_id
        });
    }
});

bot.onText(/\/ping/, (msg) => {
    bot.sendMessage(msg.chat.id, 'pong', {
        reply_to_message_id: msg.message_id
    });
});

bot.onText(/\/bal/, async (msg) => {
    const userId = msg.from.id;
    const user = await ensureUser(userId, msg.from.username, msg.from.first_name);
    
    if (!user) {
        return sendReply(msg.chat.id, msg.message_id, '❌ Database error. Please try again.');
    }
    
    const gems = user.gems || 0;
    const cash = user.berries || 0;
    const crimson = user.crimson || 0;
    
    const message = `💰 <b>Your Balance:</b>\n\n💠 ɢᴇᴍs: ${gems}\n💸 ᴄᴀꜱʜ: ${cash}\n🩸 ᴄʀɪᴍsᴏɴ: ${crimson}`;
    
    sendReply(msg.chat.id, msg.message_id, message);
});

bot.onText(/\/dwaifu/, async (msg) => {
    if (!await checkUserAccess(msg)) return;

    const userId = msg.from.id;
    
    // ensureUser creates user if doesn't exist and returns user data
    const user = await ensureUser(userId, msg.from.username, msg.from.first_name);
    
    if (!user) {
        // Shouldn't happen, but safety check
        return sendReply(msg.chat.id, msg.message_id, '❌ Error creating user! Please try again.');
    }
    
    const now = new Date();
    
    // Handle NULL last_claim_date for new users (first time claiming) - skip cooldown check
    if (user.last_claim_date !== null && user.last_claim_date !== undefined) {
        try {
            const lastClaim = new Date(user.last_claim_date);
            
            // Only check cooldown if we have a valid date
            if (!isNaN(lastClaim.getTime())) {
                const hoursSinceLastClaim = (now - lastClaim) / (1000 * 60 * 60);
                
                if (hoursSinceLastClaim < 24) {
                    const hoursUntilClaim = Math.ceil(24 - hoursSinceLastClaim);
                    return sendReply(msg.chat.id, msg.message_id, `⏱️ Daily waifu already claimed! Available in ${hoursUntilClaim}h`);
                }
            }
        } catch (error) {
            // If date parsing fails, allow claim (better UX than blocking)
            console.error('Error parsing last_claim_date:', error);
        }
    }

    const waifu = await getRandomWaifu([1, 4]);
    if (!waifu) {
        return sendReply(msg.chat.id, msg.message_id, '❌ No waifus available yet!');
    }

    if (pool) {
        await pool.query('INSERT INTO harem (user_id, waifu_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, waifu.waifu_id]);
        await pool.query('UPDATE users SET last_claim_date = CURRENT_DATE WHERE user_id = $1', [userId]);
    }

    const message = `🎁 Daily Waifu Claimed!\n\n𝗡𝗔𝗠𝗘: ${waifu.name}\n𝗔𝗡𝗜𝗠𝗘: ${waifu.anime}\n𝗥𝗔𝗥𝗜𝗧𝗬: ${RARITY_NAMES[waifu.rarity]}`;

    if (waifu.image_file_id) {
        sendPhotoReply(msg.chat.id, msg.message_id, waifu.image_file_id, message);
    } else {
        sendReply(msg.chat.id, msg.message_id, message);
    }
});

const PORT = process.env.PORT || 10000;

if (process.env.WEBHOOK_URL) {
    const webhookUrl = process.env.WEBHOOK_URL + '/webhook';
    bot.setWebHook(webhookUrl)
        .then(() => console.log('✅ Webhook set to:', webhookUrl))
        .catch((err) => console.error('❌ Webhook setup failed:', err.message));
} else {
    bot.startPolling()
        .then(() => console.log('✅ Polling started'))
        .catch((err) => console.error('❌ Polling failed:', err.message));
}

console.log('Bot started successfully');
