require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const Waifu = require('./models/Waifu');
const User = require('./models/User');

const GUESS_BOT_TOKEN = process.env.GUESS_BOT_TOKEN || process.env.GUESS_TOKEN;
const OFFICIAL_GROUP = '-1002503593313';
const OFFICIAL_GROUP_LINK = 'https://t.me/AQUA_REALM';
const GUESS_REWARD = 100;

let guessBot = null;
const activeGuesses = new Map();

if (GUESS_BOT_TOKEN) {
    guessBot = new TelegramBot(GUESS_BOT_TOKEN, { polling: false });
    
    console.log('✅ Guess Bot initialized (webhook mode)');
    console.log('🎮 Official Group ID:', OFFICIAL_GROUP);
} else {
    console.log('⚠️ Guess bot not initialized - missing GUESS_BOT_TOKEN');
}

function setupGuessBotHandlers() {
    if (!guessBot) return;

    guessBot.onText(/\/start/, async (msg) => {
        if (msg.chat.type !== 'private') return;

        const keyboard = {
            inline_keyboard: [
                [{ text: '🎮 JOIN AQUA REALM', url: OFFICIAL_GROUP_LINK }]
            ]
        };

        await guessBot.sendMessage(msg.chat.id, 
            '👋 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 𝗧𝗢 𝗚𝗨𝗘𝗦𝗦 𝗕𝗢𝗧!\n\n🎯 Join AQUA REALM to play waifu guess game!\n\n💡 Earn 100 🩸 ᴄʀɪᴍsᴏɴ per correct guess!',
            { reply_markup: keyboard }
        ).catch(err => console.error('[GUESS BOT] Start command error:', err.message));
    });

    guessBot.onText(/\/lguess/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (msg.chat.type === 'private') return;

        const currentChatStr = String(chatId);
        const officialChatStr = String(OFFICIAL_GROUP);

        if (currentChatStr !== officialChatStr) {
            const keyboard = {
                inline_keyboard: [
                    [{ text: '𝗝𝗢𝗜𝗡 𝗔𝗤𝗨𝗔 𝗥𝗘𝗔𝗟𝗠 𝗧𝗢 𝗣𝗟𝗔𝗬!', url: OFFICIAL_GROUP_LINK }]
                ]
            };
            return guessBot.sendMessage(chatId, 
                '❌ This command only works in AQUA REALM!',
                { reply_markup: keyboard, reply_to_message_id: msg.message_id }
            ).catch(err => console.error('[GUESS BOT] Join message error:', err.message));
        }

        try {
            const waifus = await Waifu.find({ is_locked: false });
            if (waifus.length === 0) {
                return guessBot.sendMessage(chatId, '❌ No waifus available yet! Upload some in the main bot.', {
                    reply_to_message_id: msg.message_id
                });
            }
            const randomWaifu = waifus[Math.floor(Math.random() * waifus.length)];

            console.log(`[GUESS BOT] Selected waifu: ${randomWaifu.name} (ID: ${randomWaifu.waifu_id})`);

            await guessBot.sendPhoto(chatId, randomWaifu.image_file_id, {
                caption: '🎯 𝗚𝗨𝗘𝗦𝗦 𝗧𝗛𝗘 𝗖𝗛𝗔𝗥𝗔𝗖𝗧𝗘𝗥!\n\nUse: /lg <name>',
                has_spoiler: true,
                reply_to_message_id: msg.message_id
            });

            activeGuesses.set(String(chatId), {
                waifuId: randomWaifu.waifu_id,
                correctName: randomWaifu.name.toLowerCase(),
                startTime: Date.now()
            });

            setTimeout(() => {
                if (activeGuesses.has(String(chatId))) {
                    activeGuesses.delete(String(chatId));
                }
            }, 120000);

        } catch (error) {
            console.error('[GUESS BOT] Guess command error:', error.message);
            await guessBot.sendMessage(chatId, '❌ Error loading guess! Try again.', {
                reply_to_message_id: msg.message_id
            }).catch(() => {});
        }
    });

    guessBot.onText(/\/lg\s+(.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const guess = match[1].trim().toLowerCase();

        if (String(chatId) !== String(OFFICIAL_GROUP)) return;

        const activeGuess = activeGuesses.get(String(chatId));
        if (!activeGuess) {
            return guessBot.sendMessage(chatId, '❌ No active guess! Use /lguess first.', {
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
                        berries: 100
                    });
                    await user.save();
                } else {
                    user.berries += 100;
                    await user.save();
                }

                activeGuesses.delete(String(chatId));

                return guessBot.sendMessage(chatId, 
                    `🎉 𝗖𝗢𝗥𝗥𝗘𝗖𝗧!\n\n${msg.from.first_name} guessed it right!\n\n+100 🩸 ᴄʀɪᴍsᴏɴ`,
                    { reply_to_message_id: msg.message_id }
                );
            } catch (error) {
                console.error('[GUESS BOT] Reward error:', error.message);
                return guessBot.sendMessage(chatId, '❌ Error giving reward. Contact admin!', {
                    reply_to_message_id: msg.message_id
                }).catch(() => {});
            }
        } else {
            return guessBot.sendMessage(chatId, '❌ Wrong guess! Try again.', {
                reply_to_message_id: msg.message_id
            }).catch(() => {});
        }
    });

    console.log('✅ Guess Bot handlers registered');
}

async function startGuessBotPolling() {
    if (!guessBot) return false;
    
    try {
        await guessBot.deleteWebHook();
        guessBot.startPolling({
            polling: {
                interval: 300,
                autoStart: true,
                params: {
                    timeout: 10
                }
            }
        });
        setupGuessBotHandlers();
        console.log('✅ Guess Bot polling started');
        return true;
    } catch (error) {
        console.error('❌ Guess Bot polling failed:', error.message);
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
    setupGuessBotHandlers
};
