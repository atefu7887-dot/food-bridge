const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Donation = require('../models/Donation');

// @desc    الدخول إلى محادثة أو إنشاؤها (بدون توكن)
// @route   POST /api/chat/access
router.post('/access', async (req, res) => {
    const { donationId, senderId } = req.body; // استلام الـ senderId من فلاتر

    if (!donationId || !senderId) {
        return res.status(400).json({ message: "donationId and senderId are required" });
    }

    try {
        const donation = await Donation.findById(donationId).populate('donor receiver driver');
        if (!donation) return res.status(404).json({ message: "Donation not found" });

        const user = await User.findById(senderId);
        if (!user) return res.status(404).json({ message: "User not found" });

        let chatType = '';
        let participants = [];

        // منطق تحديد نوع المحادثة بناءً على دور المستخدم الذي طلبها
        if (user.role === 'donor') {
            chatType = 'donor-driver';
            participants = [donation.donor._id, donation.driver._id];
        } else if (user.role === 'receiver') {
            chatType = 'receiver-driver';
            participants = [donation.receiver._id, donation.driver._id];
        } else {
            return res.status(400).json({ message: "Only donor or receiver can initiate chat" });
        }

        // البحث عن المحادثة الثنائية المحددة أو إنشاؤها
        // نستخدم findOneAndUpdate مع upsert لمنع التكرار (نظام راحة الدماغ)
        let chat = await Chat.findOneAndUpdate(
            { donation: donationId, chatType: chatType },
            { 
                $setOnInsert: { participants: participants } 
            },
            { new: true, upsert: true }
        ).populate("participants", "username avatar role");

        res.status(200).json(chat);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
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