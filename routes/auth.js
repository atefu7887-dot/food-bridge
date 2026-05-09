const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const User = require('../models/User');

const router = express.Router();

// إعداد multer لتخزين الصور في الذاكرة مؤقتاً
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // الحد الأقصى 5 ميجا
});

// تعريف الحقول المسموح برفعها
const uploadFields = upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'licenseImage', maxCount: 1 }
]);

// دالة الرفع لموقع ImgBB
async function uploadToImgBB(buffer) {
    const apiKey = "e588c3e5bae57852fb441c6f15619cad";
    const formData = new FormData();
    formData.append('image', buffer.toString('base64'));

    try {
        const res = await axios.post(
            `https://api.imgbb.com/1/upload?key=${apiKey}`,
            formData,
            { headers: formData.getHeaders() }
        );
        return res.data.data.url;
    } catch (err) {
        console.error("ImgBB Error:", err.message);
        throw new Error("Image upload failed");
    }
}

//////////////////////////////////////////////////
// 📝 REGISTER
//////////////////////////////////////////////////
router.post('/register', uploadFields, async (req, res) => {
    try {
        const {
            username, email, phone, password, role,
            businessName, address, availability
        } = req.body;

        // 1. التحقق من الحقول الأساسية
        if (!username || !email || !phone || !password || !role) {
            return res.status(400).json({ success: false, message: 'All required fields must be filled' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // 2. توحيد حالة أحرف الـ Role لتطابق الـ Enum في الموديل
        const roleLower = role.toLowerCase();
        let finalRole = role;
        if (roleLower === 'donor') finalRole = 'Donor';
        if (roleLower === 'receiver') finalRole = 'Receiver';
        if (roleLower === 'driver') finalRole = 'Driver';

        let userData = {
            username,
            email,
            phone,
            password: hashedPassword,
            role: finalRole,
            address: address || "",
            avatar: '', 
        };

        // 3. معالجة البيانات بناءً على الدور الموحد
        if (finalRole === 'Donor' || finalRole === 'Receiver') {
            // نضمن أن businessName لا يصل أبداً كـ null لقاعدة البيانات
            userData.businessName = businessName || username;
            
            if (finalRole === 'Donor') userData.donorType = 'Donor';
            if (finalRole === 'Receiver') userData.receiverType = 'Receiver';
        } else {
            userData.businessName = undefined; // للسائق نلغي الحقل تماماً
        }

        // 4. رفع الصور (مع إضافة try-catch لكل صورة لضمان عدم توقف التسجيل)
        if (req.files?.avatar?.[0]) {
            try { userData.avatar = await uploadToImgBB(req.files.avatar[0].buffer); } catch (e) {}
        }
        
        if (finalRole === 'Driver' && req.files?.licenseImage?.[0]) {
            try { userData.licenseImage = await uploadToImgBB(req.files.licenseImage[0].buffer); } catch (e) {}
        }

        // 5. إنشاء المستخدم
        const newUser = await User.create(userData);

        res.status(201).json({
            success: true,
            message: "Account Created Successfully 🎉",
            user: newUser
        });

    } catch (error) {
        console.error("REGISTER ERROR:", error);
        res.status(500).json({
            success: false,
            message: error.name === 'ValidationError' ? "بيانات غير صالحة: " + error.message : "Internal Server Error",
        });
    }
});

//////////////////////////////////////////////////
// 🔐 LOGIN
//////////////////////////////////////////////////
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

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
            message: "Login successful ✅",
            user: user
        });

    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({
            success: false,
            message: "Server error during login"
        });
    }
});

module.exports = router;