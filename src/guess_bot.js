require('dotenv').config();
const { createPollingBot } = require('./bot-utils');
const Waifu = require('./models/Waifu');
const User = require('./models/User');

const GUESS_BOT_TOKEN = process.env.GUESS_BOT_TOKEN || process.env.GUESS_TOKEN;
// Official group numeric id (compare by digits only to accept -100/negative variants)
const OFFICIAL_GROUP = '3209147191';
const OFFICIAL_GROUP_LINK = process.env.OFFICIAL_GROUP_LINK || 'https://t.me/AQUA_REALM';
const GUESS_REWARD = 121;
// Detect if guess bot token is the same as the main bot token(s.
const mainTokens = [process.env.TELEGRAM_BOT_TOKEN, process.env.BOT_TOKEN, process.env.BOT_TOKEN_1].filter(Boolean);
const usesMainToken = GUESS_BOT_TOKEN && mainTokens.includes(GUESS_BOT_TOKEN);

let guessBot = null;
const activeGuesses = new Map();

if (!GUESS_BOT_TOKEN && !usesMainToken) {
    console.log('⚠️ Guess bot not initialized - missing GUESS_BOT_TOKEN and not using main token');
} else if (GUESS_BOT_TOKEN && !usesMainToken) {
    // Do NOT start polling on Render; create non-polling bot unless ENABLE_POLLING is explicitly set
    const enablePolling = (process.env.ENABLE_POLLING === 'true');
    guessBot = createPollingBot(GUESS_BOT_TOKEN, { polling: !!enablePolling });
    console.log('✅ Guess Bot initialized (separate token) - polling:', !!enablePolling);
    console.log('🎮 Official Group ID:', OFFICIAL_GROUP);
    setupGuessBotHandlers();
} else if (usesMainToken) {
    console.log('⚠️ Guess bot is configured to use main bot token - handlers should be attached to the main bot instance');
}

function _isOfficialChat(chatId) {
    const digits = String(chatId).replace(/[^0-9]/g, '');
    // Accept plain id or -100... variants by checking suffix
    return digits === OFFICIAL_GROUP || digits.endsWith(OFFICIAL_GROUP);
}

async function _ensureUserRegistered(userId, from) {
    try {
        const existing = await User.findOne({ user_id: userId });
        return !!existing;
    } catch (e) {
        console.error('[GUESS BOT] User lookup error:', e?.message || e);
        return false;
    }
}

function setupGuessBotHandlers(providedBot) {
    const b = providedBot || guessBot;
    if (!b) return;
    if (b._guessHandlersAttached) return;
    b._guessHandlersAttached = true;

    b.onText(/\/start/, async (msg) => {
        if (msg.chat.type !== 'private') return;

        const keyboard = {
            inline_keyboard: [
                [{ text: '🎮 JOIN AQUA REALM', url: OFFICIAL_GROUP_LINK }]
            ]
        };

        await b.sendMessage(msg.chat.id,
            '👋 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 𝗧𝗢 𝗚𝗨𝗘𝗦𝗦 𝗕𝗢𝗧!\n\n🎯 Join AQUA REALM to play waifu guess game!\n\n💡 Earn 100 🩸 ᴄʀɪᴍsᴏɴ per correct guess!',
            { reply_markup: keyboard }
        ).catch(err => console.error('[GUESS BOT] Start command error:', err?.message || err));
    });

    b.onText(/\/lguess/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (msg.chat.type === 'private') return;

        if (!_isOfficialChat(chatId)) {
            const keyboard = {
                inline_keyboard: [
                    [{ text: '𝗝𝗢𝗜𝗡 𝗔𝗤𝗨𝗔 𝗥𝗘𝗔𝗟𝗠 𝗧𝗢 𝗣𝗟𝗔𝗬!', url: OFFICIAL_GROUP_LINK }]
                ]
            };
            return b.sendMessage(chatId,
                '❌ This command only works in AQUA REALM!',
                { reply_markup: keyboard, reply_to_message_id: msg.message_id }
            ).catch(err => console.error('[GUESS BOT] Join message error:', err?.message || err));
        }

        // Ensure user is registered in main bot
        const registered = await _ensureUserRegistered(userId, msg.from);
        if (!registered) {
            const botLink = process.env.BOT_USERNAME ? `https://t.me/${process.env.BOT_USERNAME}?start=1` : (process.env.BOT_LINK || 'https://t.me/AquaWaifuCollectionBot?start=1');
            const keyboard = { inline_keyboard: [[{ text: '𝗦𝗧𝗔𝗥𝗧 𝗠𝗔𝗜𝗡 𝗕𝗢𝗧 ✨', url: botLink }]] };
            const text = `⚠️ 𝗬𝗢𝗨 𝗔𝗥𝗘 𝗡𝗢𝗧 𝗥𝗘𝗚𝗜𝗦𝗧𝗘𝗥 𝗪𝗜𝗧𝗛 𝗨𝗦\n\n𝗣𝗟𝗘𝗔𝗦𝗘 𝗦𝗧𝗔𝗥𝗧 𝗧𝗛𝗘 𝗠𝗔𝗜𝗡 𝗕𝗢𝗧 𝗜𝗡 𝗗𝗠`;
            return b.sendMessage(userId, text, { reply_markup: keyboard }).catch(() => {});
        }

        try {
            const waifus = await Waifu.find({ is_locked: false });
            const waifusWithImage = waifus.filter(w => w.image_file_id);
            if (waifusWithImage.length === 0) {
                if (waifus.length === 0) {
                    return b.sendMessage(chatId, '❌ No waifus available yet! Upload some in the main bot.', {
                        reply_to_message_id: msg.message_id
                    });
                }
                // Fall back to a text-only prompt if no images exist
                const randomWaifu = waifus[Math.floor(Math.random() * waifus.length)];
                activeGuesses.set(String(chatId), {
                    waifuId: randomWaifu.waifu_id,
                    correctName: randomWaifu.name.toLowerCase(),
                    startTime: Date.now()
                });
                setTimeout(() => activeGuesses.delete(String(chatId)), 120000);
                return b.sendMessage(chatId, `🎯 GUESS: ${randomWaifu.name.split(' ')[0]} (image unavailable)\nUse: /lg <name>`, { reply_to_message_id: msg.message_id });
            }

            const randomWaifu = waifusWithImage[Math.floor(Math.random() * waifusWithImage.length)];
            console.log(`[GUESS BOT] Selected waifu: ${randomWaifu.name} (ID: ${randomWaifu.waifu_id})`);

            try {
                await b.sendPhoto(chatId, randomWaifu.image_file_id, {
                    caption: '🎯 𝗚𝗨𝗘𝗦𝗦 𝗧𝗛𝗘 𝗖𝗛𝗔𝗥𝗔𝗖𝗧𝗘𝗥!\n\nUse: /lg <name>',
                    has_spoiler: true,
                    reply_to_message_id: msg.message_id
                });
            } catch (sendErr) {
                console.warn('[GUESS BOT] sendPhoto failed, falling back to caption text:', sendErr?.message || sendErr);
                // fallback to sending a message with a placeholder
                await b.sendMessage(chatId, '🎯 GUESS THE CHARACTER (image unavailable)\nUse: /lg <name>', { reply_to_message_id: msg.message_id }).catch(() => {});
            }

            activeGuesses.set(String(chatId), {
                waifuId: randomWaifu.waifu_id,
                correctName: randomWaifu.name.toLowerCase(),
                startTime: Date.now()
            });

            setTimeout(() => {
                if (activeGuesses.has(String(chatId))) {
                    activeGuesses.delete(String(chatId));
                }
            }, 20000);

        } catch (error) {
            console.error('[GUESS BOT] Guess command error:', error?.message || error);
            // Send a single concise error message
            try { await b.sendMessage(chatId, '❌ Error loading guess! Try again.', { reply_to_message_id: msg.message_id }); } catch(_) {}
        }
    });

    b.onText(/\/lg\s+(.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const guess = match[1].trim().toLowerCase();

        if (!_isOfficialChat(chatId)) return;

        const activeGuess = activeGuesses.get(String(chatId));
        if (!activeGuess) {
            return b.sendMessage(chatId, '❌ No active guess! Use /lguess first.', {
                reply_to_message_id: msg.message_id
            }).catch(() => {});
        }

        const actualName = activeGuess.correctName;
        const nameParts = actualName.split(/\s+/);

        const isMatch = guess === actualName || 
                        nameParts.some(part => part === guess) ||
                        (guess.length >= 3 && nameParts.some(part => part.startsWith(guess)));

        if (isMatch) {
            try {
                let user = await User.findOne({ user_id: userId });

                if (!user) {
                    user = new User({
                        user_id: userId,
                        username: msg.from.username,
                        first_name: msg.from.first_name,
                        gems: 121
                    });
                    await user.save();
                } else {
                    user.gems = (user.gems || 0) + 121;
                    await user.save();
                }

                activeGuesses.delete(String(chatId));

                return b.sendMessage(chatId,
                    `🎉 𝗖𝗢𝗥𝗥𝗘𝗖𝗧!\n\n${msg.from.first_name} guessed it right!\n\n+121 💎 Gems awarded`,
                    { reply_to_message_id: msg.message_id }
                );
            } catch (error) {
                console.error('[GUESS BOT] Reward error:', error?.message || error);
                return b.sendMessage(chatId, '❌ Error giving reward. Contact admin!', {
                    reply_to_message_id: msg.message_id
                }).catch(() => {});
            }
        } else {
            return b.sendMessage(chatId, '❌ Wrong guess! Try again.', {
                reply_to_message_id: msg.message_id
            }).catch(() => {});
        }
    });

    console.log('✅ Guess Bot handlers registered');
}

async function startGuessBotPolling() {
    if (!guessBot) return false;
    
    try {
        setupGuessBotHandlers();
        console.log('✅ Guess Bot handlers registered');
        return true;
    } catch (error) {
        console.error('❌ Guess Bot setup failed:', error.message);
        return false;
    }
}

function processGuessBotUpdate(update) {
    if (guessBot) {
        guessBot.processUpdate(update);
    }
}

module.exports = { 
    guessBot, 
    activeGuesses, 
    startGuessBotPolling,
    processGuessBotUpdate,
    setupGuessBotHandlers,
    usesMainToken
};
