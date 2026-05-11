const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const User = require('../models/User');
const Donation = require('../models/Donation');
const Message = require('../models/Message'); // تأكد من استيراد الموديل

// 1. الدخول للمحادثة (شغال تمام عندك بس ضفنا Populate للمشاركين)
router.post('/access', async (req, res) => {
    try {
        const { donationId, senderId, targetRole } = req.body;
        const donation = await Donation.findById(donationId);
        const user = await User.findById(senderId);

        if (!donation || !user || !donation.driver) {
            return res.status(400).json({ message: "بيانات ناقصة أو السائق غير موجود" });
        }

        // تحديد النوع المطلوب بدقة
        let chatType = '';
        if (user.role === 'donor') chatType = 'donor-driver';
        else if (user.role === 'receiver') chatType = 'receiver-driver';
        else if (user.role === 'driver') {
            chatType = (targetRole === 'donor') ? 'donor-driver' : 'receiver-driver';
        }

        // البحث باستخدام donationId و chatType معاً
        let chat = await Chat.findOne({ donation: donationId, chatType: chatType });

        if (!chat) {
            let participants = [];
            if (chatType === 'donor-driver') {
                participants = [donation.donor, donation.driver];
            } else {
                participants = [donation.receiver, donation.driver];
            }

            chat = await Chat.create({
                donation: donationId,
                chatType: chatType,
                participants: participants
            });
        }

        const result = await Chat.findById(chat._id).populate("participants", "username avatar role");
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 2. إرسال رسالة (هنا كان الخطأ المحتمل)
router.post('/message', async (req, res) => {
    const { chatId, text, senderId } = req.body;

    if (!chatId || !text || !senderId) {
        return res.status(400).json({ message: "كل الحقول مطلوبة" });
    }

    try {
        // إنشاء الرسالة
        let newMessage = await Message.create({
            chat: chatId,
            sender: senderId,
            text: text
        });

        // "تعبئة" بيانات المرسل عشان تظهر فوراً في فلاتر (مهم جداً)
        newMessage = await newMessage.populate("sender", "username avatar role");

        // تحديث المحادثة بآخر رسالة
        await Chat.findByIdAndUpdate(chatId, {
            lastMessage: {
                text: text,
                sender: senderId,
                createdAt: new Date()
            }
        });

        // الرد بحالة 201 نجاح مع كائن الرسالة كاملاً
        res.status(201).json(newMessage);
    } catch (error) {
        console.error("Send Message Error:", error);
        res.status(500).json({ message: "فشل في حفظ الرسالة بالسيرفر" });
    }
});

// 3. جلب الرسائل
router.get('/messages/:chatId', async (req, res) => {
    try {
        const messages = await Message.find({ chat: req.params.chatId })
            .populate("sender", "username avatar role")
            .sort({ createdAt: 1 });
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;