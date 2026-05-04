const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const User = require('../models/User');

const router = express.Router();


// ================= MULTER =================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });


// ================= LOGIN =================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email: email.trim().toLowerCase() });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Email not registered"
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Incorrect password"
            });
        }

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});


// ================= REGISTER =================
router.post('/register', upload.array('photos', 5), async (req, res) => {
    try {

        let {
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

        // ===== تنظيف البيانات =====
        email = email?.trim().toLowerCase();
        username = username?.trim();

        // ===== تحقق أساسي =====
        if (!username || !email || !phone || !password || !role) {
            return res.status(400).json({
                success: false,
                message: 'All required fields must be filled'
            });
        }

        // ===== تحقق حسب النوع =====
        if (role === 'Donor' && !donorType) {
            return res.status(400).json({
                success: false,
                message: 'Donor type required'
            });
        }

        if (role === 'Receiver' && !receiverType) {
            return res.status(400).json({
                success: false,
                message: 'Receiver type required'
            });
        }

        // ===== تحقق من وجود المستخدم =====
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        // ===== تشفير الباسورد =====
        const hashedPassword = await bcrypt.hash(password, 10);

        let userData = {
            username,
            email,
            phone,
            password: hashedPassword,
            role,
            address
        };

        // ===== الصور =====
        if (req.files && req.files.length > 0) {
            userData.photos = req.files.map(file => file.filename);
        }

        // ===== Donor =====
        if (role === 'Donor') {
            userData.donorType = donorType;

            if (donorType === 'Restaurant' || donorType === 'Bakery') {
                userData.businessName = businessName;
                userData.commercialRegisterNumber = commercialRegisterNumber;
                userData.businessPhone = businessPhone;
            } else {
                userData.fullName = fullName;
            }
        }

        // ===== Receiver =====
        if (role === 'Receiver') {
            userData.receiverType = receiverType;

            if (receiverType === 'Trust' || receiverType === 'NGO') {
                userData.organizationName = organizationName;
                userData.registrationLicenseNumber = registrationLicenseNumber;
            } else {
                userData.fullName = fullName;
            }
        }

        // ===== إنشاء المستخدم =====
        const newUser = await User.create(userData);

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            data: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role
            }
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