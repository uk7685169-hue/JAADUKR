require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');

const mongoose = require('mongoose');

const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;

if (!token) {
    console.error('Error: Bot token not found in environment variables');
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: false });

try {
    require('./src/guess_bot.js');
    console.log('✅ Guess bot loaded');
} catch (error) {
    console.warn('⚠️ Guess bot not loaded:', error.message);
}

if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => console.log('✅ MongoDB connected'))
        .catch((err) => console.warn('⚠️ MongoDB connection failed:', err.message));
} else {
    console.warn('⚠️ MONGODB_URI not set, running without database');
}

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Bot is online', {
        reply_to_message_id: msg.message_id
    });
});

bot.onText(/\/ping/, (msg) => {
    bot.sendMessage(msg.chat.id, 'pong', {
        reply_to_message_id: msg.message_id
    });
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
