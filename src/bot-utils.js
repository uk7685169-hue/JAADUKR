const TelegramBot = require('node-telegram-bot-api');

function createPollingBot(token, options = {}) {
    if (!token) return null;
    if (!global.__bot_tokens) global.__bot_tokens = {};
    // If a bot was already created for this token and polling was requested, reuse it
    if (global.__bot_tokens[token]) {
        console.log('⚠️ Polling already started for this token; reusing existing bot instance');
        return global.__bot_tokens[token];
    }

    const bot = new TelegramBot(token, options);
    if (options && options.polling) {
        global.__bot_tokens[token] = bot;
    }
    return bot;
}

module.exports = { createPollingBot };
