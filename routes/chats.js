const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Donation = require('../models/Donation');

// 1. 🚪 مسار الدخول إلى المحادثة (إنشاء غرفة أو جلب الغرفة الحالية)
router.post('/access', async (req, res) => {
    try {
        const { donationId, senderId, receiverId } = req.body;

        // التأكد من وجود طلب التبرع
        const donation = await Donation.findById(donationId);
        if (!donation) {
            return res.status(404).json({ success: false, message: "Donation not found" });
        }

        // البحث عن غرفة تجمع هذين الطرفين بخصوص هذا التبرع تحديداً
        let chat = await Chat.findOne({
            donation: donationId,
            participants: { $all: [senderId, receiverId] }
        })
        .populate('participants', 'username phone avatar role')
        .populate('donation', 'title status');

        // إذا لم تكن هناك غرفة سابقة، نقوم بإنشائها فوراً
        if (!chat) {
            chat = new Chat({
                donation: donationId,
                participants: [senderId, receiverId]
            });
            await chat.save();
            
            // عمل populate للبيانات بعد الحفظ لتظهر كاملة للتطبيق
            chat = await Chat.findById(chat._id)
                .populate('participants', 'username phone avatar role')
                .populate('donation', 'title status');
        }

        res.status(200).json({ success: true, chat });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. ✉️ مسار إرسال رسالة جديدة
router.post('/send', async (req, res) => {
    try {
        const { chatId, senderId, text } = req.body;

        // 1. حفظ الرسالة الجديدة في جدول الرسائل
        const newMessage = new Message({
            chat: chatId,
            sender: senderId,
            text: text
        });
        await newMessage.save();

        // 2. تحديث حقل "آخر رسالة" في جدول الغرفة (Chat) لتحديث القائمة الرئيسية للمستخدمين
        await Chat.findByIdAndUpdate(chatId, {
            lastMessage: {
                text: text,
                sender: senderId,
                createdAt: Date.now()
            }
        });

        // جلب الرسالة مع بيانات المرسل لإرسالها للتطبيق
        const populatedMessage = await Message.findById(newMessage._id)
            .populate('sender', 'username avatar');

        res.status(201).json({ success: true, message: populatedMessage });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. 📜 مسار جلب جميع الرسائل داخل غرفة معينة
router.get('/:chatId/messages', async (req, res) => {
    try {
        const { chatId } = req.params;

        // جلب الرسائل مرتبة من الأقدم إلى الأحدث لعرضها بشكل منطقي في الشات
        const messages = await Message.find({ chat: chatId })
            .populate('sender', 'username avatar role')
            .sort({ createdAt: 1 });

        // تحديث حالة الرسائل غير المقروءة إلى "مقروءة" (isRead: true) للرسائل التي لم يرسلها المستخدم الحالي
        // (يمكنك عمل هذا التحديث بشكل أكثر دقة بناءً على من يفتح المحادثة)
        
        res.status(200).json({ success: true, messages });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. 🗂️ جلب قائمة كل المحادثات الخاصة بمستخدم معين (مهم لشاشة "محادثاتي")
router.get('/my-chats/:userId', async (req, res) => {
    try {
        const chats = await Chat.find({
            participants: req.params.userId
        })
        .populate('participants', 'username phone avatar role')
        .populate('donation', 'title status')
        .sort({ 'lastMessage.createdAt': -1 }); // ترتيب الغرف حسب آخر رسالة وصلت

        res.status(200).json({ success: true, chats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;