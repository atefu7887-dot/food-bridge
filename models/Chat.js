const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    donation: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation', required: true },
    chatType: { type: String, enum: ['donor-driver', 'receiver-driver'], required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lastMessage: {
        text: { type: String },
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date }
    }

}, { timestamps: true });

chatSchema.index({ donation: 1, chatType: 1 }, { unique: true });

module.exports = mongoose.model('Chat', chatSchema);