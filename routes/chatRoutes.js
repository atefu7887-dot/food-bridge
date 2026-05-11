const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Donation = require('../models/Donation');

// @desc    الدخول إلى محادثة أو إنشاؤها (بدون توكن)
// @route   POST /api/chat/access
router.post('/access', async (req, res) => {
    const { donationId, senderId } = req.body; // نرسل الـ ID بتاع اللي فاتح الشات حالياً

    try {
        const donation = await Donation.findById(donationId).populate('donor receiver driver');
        const user = await User.findById(senderId);

        let participants = [];
        let chatType = '';

        // تحديد نوع المحادثة بناءً على دور الشخص اللي فاتح الشات
        if (user.role === 'donor') {
            participants = [donation.donor._id, donation.driver._id];
            chatType = 'donor-driver';
        } else if (user.role === 'receiver') {
            participants = [donation.receiver._id, donation.driver._id];
            chatType = 'receiver-driver';
        } else if (user.role === 'driver') {
            // السائق حالة خاصة، ممكن نخليه يختار هو عايز يكلم مين (بس للتبسيط هنفترض إنه بيرد على اللي بيكلمه)
            return res.status(400).json({ message: "Driver should select a specific chat type" });
        }

        // البحث عن المحادثة الثنائية المحددة
        let chat = await Chat.findOne({ 
            donation: donationId, 
            chatType: chatType,
            participants: { $all: participants } 
        });

        if (!chat) {
            chat = await Chat.create({
                donation: donationId,
                participants: participants,
                chatType: chatType
            });
        }

        res.status(200).json(chat);
    } catch (error) {
        res.status(500).json({ message: error.message });
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