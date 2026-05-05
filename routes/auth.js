const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const User = require('../models/User');

// تهيئة Cloudinary
cloudinary.config({
    cloud_name: 'Ydmz5nofy5',
    api_key: '951232286399324',
    api_secret: 'iFnIsd3M8c2gGUZocvFmz8NK6DQ'
});

const router = express.Router();

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } 
});

const uploadFields = upload.fields([
    { name: 'photos', maxCount: 5 },
    { name: 'avatar', maxCount: 1 },
    { name: 'licenseImage', maxCount: 1 }
]);

// دالة مساعدة لرفع الملفات إلى Cloudinary
async function uploadToCloudinary(file) {
    if (!file || !file.buffer) return null;
    try {
        const base64Str = file.buffer.toString('base64');
        const dataURI = `data:${file.mimetype};base64,${base64Str}`;
        const response = await cloudinary.uploader.upload(dataURI);
        return response.secure_url;
    } catch (error) {
        console.error("Cloudinary Upload Error:", error);
        throw new Error("فشل في رفع الصورة");
    }
}

// مسار تسجيل الدخول
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "Email not registered" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect password" });
        }

        res.status(200).json({
            message: "Login successful! ✅",
            user: { 
                username: user.username, 
                email: user.email, 
                role: user.role,
                avatar: user.avatar 
            }
        });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ message: "Server error" });
    }
});

// مسار التسجيل
router.post('/register', uploadFields, async (req, res) => {
    try {
        const { 
            username, email, phone, password, role, 
            donorType, businessName, address, receiverType, availability 
        } = req.body;

        if (!username || !email || !phone || !password || !role) {
            return res.status(400).json({
                success: false,
                message: 'All required fields must be filled'
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        let userData = { username, email, phone, password: hashedPassword, role };

        userData.photos = [];

        // 1. معالجة الصور مع التأكد من وجود req.files لتجنب الأخطاء المفاجئة (Crash)
        if (req.files) {
            if ((role === 'Donor' || role === 'Receiver') && req.files['photos']) {
                const photoUrls = [];
                for (const file of req.files['photos']) {
                    const url = await uploadToCloudinary(file);
                    if (url) photoUrls.push(url);
                }
                userData.photos = photoUrls;
            }

            if (role === 'Driver') {
                if (req.files['avatar'] && req.files['avatar'].length > 0) {
                    userData.avatar = await uploadToCloudinary(req.files['avatar'][0]);
                }
                if (req.files['licenseImage'] && req.files['licenseImage'].length > 0) {
                    userData.licenseImage = await uploadToCloudinary(req.files['licenseImage'][0]);
                }
            }
        }

        // 2. معالجة الأدوار المختلفة
        if (role === 'Donor') {
            userData.donorType = donorType || 'Individual';
            userData.address = address;
            if (donorType === 'Restaurant' || donorType === 'Bakery') {
                userData.businessName = businessName;
            }
        } else if (role === 'Receiver') {
            userData.receiverType = receiverType;
            userData.address = address;
            if (receiverType === 'Trust' || receiverType === 'NGO') {
                userData.businessName = businessName;
            }
        } else if (role === 'Volunteer' && availability) {
            try {
                const parsedAvailability = typeof availability === 'string' ? JSON.parse(availability) : availability;
                userData.availability = {
                    timeSlot: parsedAvailability.timeSlot || '',
                    customTime: parsedAvailability.customTime || '',
                    days: parsedAvailability.days || [],
                    frequency: parsedAvailability.frequency || ''
                };
            } catch (e) {
                console.error("Invalid JSON format for availability");
            }
        } else if (role === 'Driver') {
            if (availability) {
                try {
                    const parsedAvailability = typeof availability === 'string' ? JSON.parse(availability) : availability;
                    userData.availability = {
                        timeSlot: parsedAvailability.timeSlot || '',
                        customTime: parsedAvailability.customTime || '',
                        days: parsedAvailability.days || [],
                        frequency: parsedAvailability.frequency || ''
                    };
                } catch (e) {
                    console.error("Invalid JSON format for availability");
                }
            }
        }

        const newUser = new User(userData);
        await newUser.save();

        res.status(201).json({
            success: true,
            message: 'Account Created Successfully!',
            user: newUser
        });

    } catch (error) {
        console.error('Register Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred',
            error: error.message
        });
    }
});

module.exports = router;