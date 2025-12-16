const mongoose = require('mongoose');

const haremSchema = new mongoose.Schema({
    user_id: { type: Number, required: true },
    waifu_id: { type: Number, required: true },
    acquired_date: { type: Date, default: Date.now },
    owned_since: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Harem', haremSchema);