const express = require('express');
const multer = require('multer');
const Donation = require('../models/Donation');
const User = require('../models/User');

const router = express.Router();

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } 
});

// --- إنشاء تبرع جديد ---
router.post('/create-donation', upload.array('photos', 3), async (req, res) => {
    console.log('Received Body:', req.body);
    console.log('Received Files:', req.files);

    try {
        const { 
            donorId,
            title, 
            description, 
            typeOfFood, 
            meals, 
            expirationDate, 
            expirationTime, 
            hygieneAssurance 
        } = req.body;

        // التحقق من الحقول الأساسية
        if (!title || !typeOfFood || !expirationDate || !expirationTime || !hygieneAssurance) {
            return res.status(400).json({
                success: false,
                message: 'Please fill all required fields'
            });
        }

        // التحقق من أن المستخدم موجود ولديه صلاحية Donor
        const user = await User.findById(donorId);
        if (!user || user.role !== 'Donor') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized action'
            });
        }

        // معالجة الصور
        let uploadedPhotos = [];
        if (req.files && req.files.length > 0) {
            uploadedPhotos = req.files.map(file => `${Date.now()}-${file.originalname}`);
        }

        // تحويل بيانات Meals إذا كانت String
        let parsedMeals = typeof meals === 'string' ? JSON.parse(meals) : meals;

        const newDonation = new Donation({
            donor: donorId,
            title,
            description,
            typeOfFood,
            meals: parsedMeals,
            photos: uploadedPhotos,
            expirationDate,
            expirationTime,
            hygieneAssurance
        });

        await newDonation.save();

        res.status(201).json({
            success: true,
            message: 'Donation created successfully! 🍽️',
            donation: newDonation
        });

    } catch (error) {
        console.error('Create Donation Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred',
            error: error.message
        });
    }
});

// --- جلب كل التبرعات ---
router.get('/donations', async (req, res) => {
    try {
        const donations = await Donation.find().populate('donor', 'username email phone');
        res.status(200).json({
            success: true,
            data: donations
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;