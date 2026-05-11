const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const User = require('../models/User');
const Donation = require('../models/Donation');

router.post('/access', async (req, res) => {
    try {
        const { donationId, senderId, targetRole } = req.body;

        // 1. التأكد من وصول البيانات الأساسية
        if (!donationId || !senderId) {
            return res.status(400).json({ message: "donationId and senderId are required" });
        }

        // 2. جلب بيانات التبرع والمستخدم
        const donation = await Donation.findById(donationId);
        const user = await User.findById(senderId);

        if (!donation || !user) {
            return res.status(404).json({ message: "Donation or User not found" });
        }

        // 3. التحقق من وجود السائق (شرط أساسي لفتح شات ثنائي)
        if (!donation.driver) {
            return res.status(400).json({ message: "لم يتم تعيين سائق بعد، لا يمكن بدء المحادثة" });
        }

        let chatType = '';
        let participants = [];

        // 4. تحديد نوع المحادثة بناءً على دور المستخدم
        if (user.role === 'donor') {
            chatType = 'donor-driver';
            participants = [donation.donor, donation.driver];
        } else if (user.role === 'receiver') {
            chatType = 'receiver-driver';
            participants = [donation.receiver, donation.driver];
        } else if (user.role === 'driver') {
            // السائق يحدد من يريد محادثته عبر targetRole المرسلة من فلاتر
            if (targetRole === 'donor') {
                chatType = 'donor-driver';
                participants = [donation.donor, donation.driver];
            } else {
                chatType = 'receiver-driver';
                participants = [donation.receiver, donation.driver];
            }
        }

        // 5. إنشاء أو جلب المحادثة (استخدام findOneAndUpdate لمنع التكرار)
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
        console.error("Chat Access Error:", error);
        res.status(500).json({ message: "Server Error: " + error.message });
    }
});

module.exports = router;