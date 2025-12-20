const TelegramBot = require('node-telegram-bot-api');

function createPollingBot(token, options = {}) {
    if (!token) return null;
    if (!global.__bot_tokens) global.__bot_tokens = {};
    // If a bot was already created for this token and polling was requested, reuse it
    if (global.__bot_tokens[token]) {
        console.log('⚠️ Polling already started for this token; reusing existing bot instance');
        return global.__bot_tokens[token];
    }
    // Enforce webhook-only by default. To allow polling in local dev set ALLOW_POLLING=true.
    if (options && options.polling && process.env.ALLOW_POLLING !== 'true') {
        console.log('⚠️ Polling requested but disabled (set ALLOW_POLLING=true to enable for local dev)');
        options.polling = false;
    }

    const bot = new TelegramBot(token, options);
    if (options && options.polling) {
        global.__bot_tokens[token] = bot;
    }
    return bot;
}

module.exports = { createPollingBot };
