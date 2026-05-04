const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const User = require('../models/User');

const router = express.Router();

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } 
});

// --- تسجيل الدخول ---
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
                role: user.role 
            }
        });

    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ message: "Server error" });
    }
});

// --- إنشاء حساب (Register) ---
router.post('/register', upload.array('photos', 5), async (req, res) => {
    try {
        const { 
            username, 
            email, 
            phone, 
            password, 
            role, 
            donorType, 
            businessName, 
            fullName, 
            address,
            commercialRegisterNumber, 
            businessPhone,
            receiverType,
            organizationName,
            registrationLicenseNumber
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

        let userData = {
            username,
            email,
            phone,
            password: hashedPassword,
            role,
        };

        // معالجة بيانات المتبرع
        if (role === 'Donor') {
            userData.donorType = donorType;
            userData.address = address;

            if (req.files && req.files.length > 0) {
                userData.photos = req.files.map(file => `${Date.now()}-${file.originalname}`);
            } else {
                userData.photos = [];
            }

            if (donorType === 'Restaurant' || donorType === 'Bakery') {
                userData.businessName = businessName;
                userData.commercialRegisterNumber = RegisterNumber; 
                userData.businessPhone = businessPhone; 
            } else if (donorType === 'Individual') {
                userData.fullName = fullName;
            }
        } 
        
        // معالجة بيانات المستلم
        else if (role === 'Receiver') {
            userData.receiverType = receiverType;
            userData.address = address;

            if (req.files && req.files.length > 0) {
                userData.photos = req.files.map(file => `${Date.now()}-${file.originalname}`);
            } else {
                userData.photos = [];
            }

            if (receiverType === 'Trust' || receiverType === 'NGO') {
                userData.organizationName = organizationName;
                userData.registrationLicenseNumber = registrationLicenseNumber;
            } else if (receiverType === 'Individual') {
                userData.fullName = fullName;
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
            message: 'Server error occurred'
        });
    }
});
module.exports = router;