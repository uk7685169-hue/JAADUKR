const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    user_id: { type: Number, required: true, unique: true },
    username: String,
    first_name: String,
    berries: { type: Number, default: 50000 },
    gems: { type: Number, default: 0 },
    daily_streak: { type: Number, default: 0 },
    weekly_streak: { type: Number, default: 0 },
    last_daily_claim: Date,
    last_weekly_claim: Date,
    last_claim_date: Date,
    favorite_waifu_id: Number,
    harem_filter_rarity: Number,
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);