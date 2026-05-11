const chatSchema = new mongoose.Schema({
    donation: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation', required: true },
    chatType: { type: String, enum: ['donor-driver', 'receiver-driver'], required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // ... باقي الحقول
}, { timestamps: true });

// هذا هو السطر الأهم لمنع التداخل
chatSchema.index({ donation: 1, chatType: 1 }, { unique: true });

module.exports = mongoose.model('Chat', chatSchema);