const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    donation: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Donation', 
        required: true 
    },
    participants: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }],
    lastMessage: {
        text: String,
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now }
    }
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);