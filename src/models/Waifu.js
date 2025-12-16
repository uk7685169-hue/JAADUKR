const mongoose = require('mongoose');

const waifuSchema = new mongoose.Schema({
    waifu_id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    anime: { type: String, required: true },
    rarity: { type: Number, required: true, min: 1, max: 16 },
    image_file_id: String,
    price: { type: Number, default: 5000 },
    is_locked: { type: Boolean, default: false },
    uploaded_by: Number,
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Waifu', waifuSchema);