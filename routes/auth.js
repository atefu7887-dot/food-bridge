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

        // ✅ 1. التحقق من البيانات المطلوبة
        if (!username || !email || !phone || !password || !role) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                fields: { username, email, phone, password, role }
            });
        }

        // ✅ 2. التحقق من صحة الـ Role
        const roleMap = { driver: 'Driver', donor: 'Donor', receiver: 'Receiver' };
        const finalRole = roleMap[role?.toLowerCase()] || role;

        if (!['Donor', 'Receiver', 'Driver'].includes(finalRole)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role value',
                received: role
            });
        }

        // ✅ 3. التحقق من تكرار الإيميل
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        // ✅ 4. تشفير كلمة المرور
        const hashedPassword = await bcrypt.hash(password, 10);

        let userData = {
            username: username.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            password: hashedPassword,
            role: finalRole,
            address: address || "",
            avatar: "",
        };

        // ✅ 5. رفع الصور
        if (req.files) {
            try {
                if (req.files.avatar?.[0]) {
                    userData.avatar = await uploadToImgBB(req.files.avatar[0].buffer);
                }
                if (req.files.licenseImage?.[0]) {
                    userData.licenseImage = await uploadToImgBB(req.files.licenseImage[0].buffer);
                }
            } catch (imgErr) {
                console.log("Image upload failed:", imgErr.message);
            }
        }

        // ✅ 6. منطق الأدوار
        if (finalRole === 'Driver') {
            delete userData.businessName;

            if (availability) {
                try {
                    userData.availability =
                        typeof availability === 'string'
                            ? JSON.parse(availability)
                            : availability;
                } catch (e) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid availability format'
                    });
                }
            }
        } else {
            userData.businessName = businessName || username;
        }

        // ✅ 7. إنشاء المستخدم
        const newUser = await User.create(userData);

        return res.status(201).json({
            success: true,
            message: 'User created successfully 🎉',
            user: newUser
        });

    } catch (error) {
        console.error("🔥 REGISTER ERROR FULL:", error);

        // ✅ Mongo duplicate error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists (duplicate key)'
            });
        }

        // ✅ Validation error
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                details: error.message
            });
        }

        // ✅ أي خطأ غير معروف
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

//////////////////////////////////////////////////
// 🔐 LOGIN
//////////////////////////////////////////////////
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. التأكد من وصول البيانات
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        // 2. البحث عن المستخدم (تحويل الإيميل لـ lowercase لضمان التطابق)
        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Email not registered"
            });
        }

        // 3. مقارنة الباسورد المشفر
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Incorrect password"
            });
        }

        // 4. النجاح (الباسورد سيحذف تلقائياً بفضل دالة toJSON في الموديل)
        return res.status(200).json({
            success: true,
            message: "Login successful ✅",
            user: user
        });

    } catch (error) {
        console.error("🔥 LOGIN ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});

module.exports = router;