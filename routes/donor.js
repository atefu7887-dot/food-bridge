const express = require('express');
const User = require('../models/User'); // تأكد من مسار الملف الخاص بك

const router = express.Router();


rrouter.get('/donors', async (req, res) => {
    try {
        const { donorType } = req.query;

        let query = { role: 'Donor' };
        if (donorType) {
            query.donorType = donorType;
        }

        // سيقوم Mongoose بإرجاع الـ _id بشكل افتراضي بالإضافة للحقول المحددة
        const donors = await User.find(query).select('businessName phone address');

        // ملاحظة: إذا كنت تريد جلب كل البيانات ما عدا كلمة المرور، يمكنك استخدام:
        // const donors = await User.find(query).select('-password');

        res.status(200).json({
            success: true,
            count: donors.length,
            data: donors
        });

    } catch (error) {
        console.error('Fetch Donors Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred'
        });
    }
});

module.exports = router;