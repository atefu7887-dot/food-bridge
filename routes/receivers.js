const express = require('express');
const User = require('../models/User'); // تأكد من مسار الملف الخاص بك

const router = express.Router();

// --- جلب المستلمين ---
router.get('/receivers', async (req, res) => {
    try {
        const { receiverType, hasPhotos } = req.query;

        let query = { role: 'Receiver' };
        
        if (receiverType) {
            query.receiverType = receiverType;
        }

        // خيار الفلترة: جلب المستلمين الذين لديهم صور فقط
        if (hasPhotos === 'true') {
            query.photos = { $exists: true, $ne: [] }; // يتأكد من أن الحقل موجود وليس فارغاً
        }

        const receivers = await User.find(query).select('-password');

        res.status(200).json({
            success: true,
            count: receivers.length,
            data: receivers
        });
    } catch (error) {
        console.error('Fetch Receivers Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred'
        });
    }
});

module.exports = router;