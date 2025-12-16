const mongoose = require('mongoose');

let isConnected = false;

async function connectDB() {
    if (isConnected) return;

    try {
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            console.warn('⚠️ DATABASE_URL not provided. Running without database.');
            return;
        }

        await mongoose.connect(dbUrl, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        isConnected = true;
        console.log('✅ Connected to MongoDB Atlas');
    } catch (error) {
        console.warn('⚠️ Failed to connect to MongoDB:', error.message);
        console.warn('Bot will continue running without database functionality.');
    }
}

module.exports = { connectDB };