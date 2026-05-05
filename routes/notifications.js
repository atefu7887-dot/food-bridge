const express = require('express');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth'); 

const router = express.Router();

router.get('/', protect, async (req, res) => {
    try {
        const notifications = await Notification.find({ 
            user: req.user.id, 
            role: req.user.role 
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: notifications
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post('/create', protect, async (req, res) => {
    try {
        const { userId, role, title, message, type } = req.body;

        const newNotification = new Notification({
            user: userId,
            role,
            title,
            message,
            type
        });

        await newNotification.save();

        res.status(201).json({
            success: true,
            message: 'Notification sent successfully',
            data: newNotification
        });
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.patch('/:id/read', protect, async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { read: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Notification marked as read',
            data: notification
        });
    } catch (error) {
        console.error('Error updating notification:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;