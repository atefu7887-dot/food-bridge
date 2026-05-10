const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    // الإشارة إلى طلب التبرع المتعلق بهذه المحادثة
    donation: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Donation', 
        required: true 
    },
    // الأطراف المشاركة في هذه المحادثة (مثلاً: السائق والمتبرع، أو السائق والجمعية)
    participants: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true 
    }],
    // تخزين آخر رسالة لتسهيل عرض قائمة المحادثات في التطبيق دون استعلامات معقدة
    lastMessage: {
        text: { type: String, default: "" },
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now }
    }
}, { 
    timestamps: true 
});

// منع تكرار إنشاء غرفة لنفس الأشخاص حول نفس الطلب
chatSchema.index({ donation: 1, participants: 1 }, { unique: true });

const Chat = mongoose.model('Chat', chatSchema);
module.exports = Chat;