const express = require('express');
const Message = require('../models/Message');
const { protect } = require('../middleware/auth'); 

const router = express.Router();

router.post('/send', protect, async (req, res) => {
    try {
        const { receiverId, content, media } = req.body;

        if (!receiverId || !content) {
            return res.status(400).json({ success: false, message: 'Receiver and content are required' });
        }

        const newMessage = new Message({
            sender: req.user.id,
            receiver: receiverId,
            content,
            media: media || []
        });

        await newMessage.save();

        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            data: newMessage
        });
    } catch (error) {
        console.error('Send Message Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.get('/conversation/:otherUserId', protect, async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const otherUserId = req.params.otherUserId;

        const messages = await Message.find({
            $or: [
                { sender: currentUserId, receiver: otherUserId },
                { sender: otherUserId, receiver: currentUserId }
            ]
        }).sort({ createdAt: 1 });

        res.status(200).json({
            success: true,
            data: messages
        });
    } catch (error) {
        console.error('Fetch Conversation Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.patch('/read/:senderId', protect, async (req, res) => {
    try {
        await Message.updateMany(
            { sender: req.params.senderId, receiver: req.user.id, read: false },
            { $set: { read: true } }
        );

        res.status(200).json({ success: true, message: 'Messages marked as read' });
    } catch (error) {
        console.error('Mark Read Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;