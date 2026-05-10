const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    // الغرفة التي تنتمي إليها هذه الرسالة
    chat: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Chat', 
        required: true 
    },
    // المستخدم الذي أرسل الرسالة
    sender: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    // محتوى الرسالة النصية
    text: { 
        type: String, 
        required: true,
        trim: true 
    },
    // تحديد ما إذا كانت الرسالة قرأت أم لا (مفيد لإظهار علامة الصح الزرقاء أو عدد الرسائل غير المقروءة)
    isRead: { 
        type: Boolean, 
        default: false 
    }
}, { 
    timestamps: true // يقوم تلقائياً بإنشاء حقول createdAt و updatedAt (وقت إرسال الرسالة)
});

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;