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
    chatType: { 
        type: String, 
        enum: ['donor-driver', 'receiver-driver'], 
        required: true 
    },
    lastMessage: {
        text: String,
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now }
    },
    // مفيد جداً لإظهار التنبيهات (النقطة الحمراء) في التطبيق
    unreadCount: {
        type: Map,
        of: Number,
        default: {}
    }
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);