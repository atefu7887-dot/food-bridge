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

        if (!donationId || !senderId) {
            return res.status(400).json({ message: "donationId and senderId are required" });
        }

        const donation = await Donation.findById(donationId);
        const user = await User.findById(senderId);

        if (!donation || !user) {
            return res.status(404).json({ message: "Donation or User not found" });
        }

        if (!donation.driver) {
            return res.status(400).json({ message: "لم يتم تعيين سائق بعد" });
        }

        let chatType = '';
        let participants = [];

        // تحديد نوع المحادثة بدقة لمنع التداخل
        if (user.role === 'donor') {
            chatType = 'donor-driver';
            participants = [donation.donor, donation.driver];
        } else if (user.role === 'receiver') {
            chatType = 'receiver-driver';
            participants = [donation.receiver, donation.driver];
        } else if (user.role === 'driver') {
            // هنا السر: السائق يجب أن يرسل targetRole من فلاتر
            if (targetRole === 'donor') {
                chatType = 'donor-driver';
                participants = [donation.donor, donation.driver];
            } else {
                chatType = 'receiver-driver';
                participants = [donation.receiver, donation.driver];
            }
        }

        // التعديل السحري: البحث والإنشاء بناءً على الزوج (donation + chatType)
      const chat = await Chat.findOneAndUpdate(
    { 
        donation: donationId, 
        chatType: chatType 
    }, 
    { 
        $setOnInsert: { 
            donation: donationId, 
            chatType: chatType, 
            participants: participants // التأكد من وضع المشاركين الصحيحين (سائق + طرف آخر)
        } 
    },
    { new: true, upsert: true }
).populate("participants", "username avatar role");

        res.status(200).json(chat);
    } catch (error) {
        console.error("Access Error:", error);
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