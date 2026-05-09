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
        const { username, email, phone, password, role, address, availability } = req.body;

        // توحيد الـ Role ليتوافق مع الـ Enum
        const roleMap = { 'driver': 'Driver', 'donor': 'Donor', 'receiver': 'Receiver' };
        const finalRole = roleMap[role?.toLowerCase()] || role;

        const hashedPassword = await bcrypt.hash(password, 10);

        // إنشاء كائن بيانات المستخدم
        let userData = {
            username,
            email,
            phone,
            password: hashedPassword,
            role: finalRole,
            address: address || "",
        };

        // معالجة الصور بشكل منفصل وآمن
        if (req.files) {
            if (req.files.avatar) {
                userData.avatar = await uploadToImgBB(req.files.avatar[0].buffer).catch(() => "");
            }
            if (req.files.licenseImage) {
                userData.licenseImage = await uploadToImgBB(req.files.licenseImage[0].buffer).catch(() => "");
            }
        }

        // معالجة المواعيد للسائق (هام جداً)
        if (finalRole === 'Driver') {
            userData.businessName = undefined; // إزالة الحقل تماماً للسائق
            if (availability) {
                try {
                    // السيرفر يحاول فك التشفير سواء كان نصاً أو كائناً
                    userData.availability = typeof availability === 'string' 
                        ? JSON.parse(availability) 
                        : availability;
                } catch (e) { console.log("Availability parse error"); }
            }
        } else {
            userData.businessName = req.body.businessName || username;
        }

        const newUser = await User.create(userData);
        res.status(201).json({ success: true, user: newUser });

    } catch (error) {
        console.error("FULL ERROR LOG:", error);
        res.status(500).json({ success: false, message: error.message });
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