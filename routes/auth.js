const express = require('express');
const bcrypt = require('bcryptjs'); // استخدام bcryptjs أفضل لبيئة Vercel
const User = require('../models/User');
const Availability = require('../models/Availability');
const router = express.Router();

// ... (Multer & ImgBB Config تبقى كما هي لديك) ...

router.post('/register', uploadFields, async (req, res) => {
    try {
        const { username, email, phone, password, role, businessName, address, availability } = req.body;

        // 1. التحقق الأساسي
        if (!username || !email || !password || !role) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // 2. فحص تكرار الإيميل
        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) return res.status(400).json({ success: false, message: 'Email already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        let userData = {
            username: username.trim(),
            email: email.toLowerCase().trim(),
            phone: phone,
            password: hashedPassword,
            role: role,
            address: address || "",
            businessName: (role !== 'Driver') ? (businessName || username) : ""
        };

        // 3. رفع الصور (Avatar & License)
        if (req.files?.avatar?.[0]) {
            userData.avatar = await uploadToImgBB(req.files.avatar[0].buffer).catch(() => "");
        }
        if (role === 'Driver' && req.files?.licenseImage?.[0]) {
            userData.licenseImage = await uploadToImgBB(req.files.licenseImage[0].buffer).catch(() => "");
        }

        // 4. معالجة المواعيد (Availability) كـ Reference
        if (role === 'Driver' && availability) {
            const parsed = typeof availability === 'string' ? JSON.parse(availability) : availability;
            const availDoc = await Availability.create(parsed);
            userData.availability = availDoc._id;
        }

        // 5. إنشاء المستخدم وعمل Populate فوراً لرجوع البيانات كاملة
        const newUser = await User.create(userData);
        const populatedUser = await User.findById(newUser._id).populate('availability');

        return res.status(201).json({ success: true, user: populatedUser });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

// راوت Login مع جلب الباسورد المخفي
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password').populate('availability');
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        return res.status(200).json({ success: true, user });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;