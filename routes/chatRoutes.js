const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Donation = require('../models/Donation');
const User = require('../models/User'); // هــــــــذا السطر كان ناقصاً (تأكد من المسار الصحيح)

// @desc    الدخول إلى محادثة ثنائية (بدون توكن)
router.post('/access', async (req, res) => {
    const { donationId, senderId } = req.body;

    if (!donationId || !senderId) {
        return res.status(400).json({ message: "donationId and senderId are required" });
    }

    try {
        // 1. التأكد من وجود التبرع وتوافر السائق
        const donation = await Donation.findById(donationId);
        if (!donation) return res.status(404).json({ message: "Donation not found" });
        if (!donation.driver) return res.status(400).json({ message: "No driver assigned to this donation yet" });

        // 2. التأكد من وجود المستخدم
        const user = await User.findById(senderId);
        if (!user) return res.status(404).json({ message: "User not found" });

        let chatType = '';
        let participants = [];

        // 3. تحديد أطراف المحادثة بناءً على دور المستخدم
        if (user.role === 'donor') {
            chatType = 'donor-driver';
            participants = [donation.donor, donation.driver];
        } else if (user.role === 'receiver') {
            chatType = 'receiver-driver';
            participants = [donation.receiver, donation.driver];
        } else if (user.role === 'driver') {
             // إذا كان السائق هو من يفتح، نحتاج لمعرفة من يريد محادثته (Donor أم Receiver)
             // للتبسيط، السيرفر سيبحث عن المحادثات التي يكون السائق طرفاً فيها
             return res.status(400).json({ message: "Driver must access specific chat type" });
        } else {
            return res.status(400).json({ message: "Invalid user role for chat" });
        }

        // 4. استخدام findOneAndUpdate لضمان إنشاء محادثة واحدة فقط (نظام راحة الدماغ)
        const chat = await Chat.findOneAndUpdate(
            { donation: donationId, chatType: chatType },
            { 
                $setOnInsert: { 
                    donation: donationId,
                    chatType: chatType,
                    participants: participants 
                } 
            },
            { new: true, upsert: true }
        ).populate("participants", "username avatar role");

        res.status(200).json(chat);
    } catch (error) {
        console.error("SERVER ERROR:", error);
        res.status(500).json({ message: "فشل إنشاء الغرفة: " + error.message });
    }
});

// @desc    إرسال رسالة (بدون توكن - يجب إرسال senderId في الـ body)
// @route   POST /api/chat/message
router.post('/message', async (req, res) => {
    const { chatId, text, senderId } = req.body; // ننتظر senderId الآن من الفرونت إند

    if (!chatId || !text || !senderId) {
        return res.status(400).json({ message: "chatId, text and senderId are required" });
    }

    try {
        const newMessage = await Message.create({
            chat: chatId,
            sender: senderId, // المعرف يتم تمريره يدوياً
            text: text
        });

        await Chat.findByIdAndUpdate(chatId, {
            lastMessage: {
                text: text,
                sender: senderId,
                createdAt: new Date()
            }
        });

        res.status(201).json(newMessage);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    جلب الرسائل (بدون توكن)
// @route   GET /api/chat/messages/:chatId
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