const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Donation = require('../models/Donation');
const { protect } = require('../middleware/authMiddleware'); // استدعاء دالة الحماية

// @desc    الدخول إلى محادثة أو إنشاؤها (مؤمن بالتوكن)
// @route   POST /api/chat/access
router.post('/access', protect, async (req, res) => {
    const { donationId } = req.body;

    if (!donationId) return res.status(400).json({ message: "Donation ID is required" });

    try {
        const donation = await Donation.findById(donationId);
        if (!donation) return res.status(404).json({ message: "Donation not found" });

        // البحث عن محادثة سابقة
        let chat = await Chat.findOne({ donation: donationId })
            .populate("participants", "username avatar role phone")
            .populate("donation", "title status");

        if (chat) {
            return res.status(200).json(chat);
        } else {
            // إنشاء محادثة تضم أطراف التبرع
            let participants = [donation.donor, donation.receiver];
            if (donation.driver) participants.push(donation.driver);

            participants = participants.filter(p => p != null);

            const newChat = await Chat.create({
                donation: donationId,
                participants: participants
            });

            const fullChat = await Chat.findById(newChat._id).populate("participants", "username avatar role phone");
            res.status(201).json(fullChat);
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    إرسال رسالة (مؤمن بالتوكن - السندر يؤخذ من التوكن)
// @route   POST /api/chat/message
router.post('/message', protect, async (req, res) => {
    const { chatId, text } = req.body;

    if (!chatId || !text) {
        return res.status(400).json({ message: "chatId and text are required" });
    }

    try {
        const newMessage = await Message.create({
            chat: chatId,
            sender: req.user._id, // المعرف يأتي من التوكن الآن تلقائياً
            text: text
        });

        await Chat.findByIdAndUpdate(chatId, {
            lastMessage: {
                text: text,
                sender: req.user._id,
                createdAt: new Date()
            }
        });

        res.status(201).json(newMessage);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    جلب الرسائل (مؤمن بالتوكن)
router.get('/messages/:chatId', protect, async (req, res) => {
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