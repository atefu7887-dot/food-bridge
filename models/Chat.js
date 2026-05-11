const chatSchema = new mongoose.Schema({
    donation: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation', required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // أضف هذا الحقل لتحديد نوع المحادثة
    chatType: { type: String, enum: ['donor-driver', 'receiver-driver'], required: true },
    lastMessage: {
        text: String,
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now }
    }
}, { timestamps: true });