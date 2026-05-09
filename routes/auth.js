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

// تعريف الحقول المسموح برفعها (تم حذف photos)
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

        // 1. التحقق من الحقول المطلوبة
        if (!username || !email || !phone || !password || !role) {
            return res.status(400).json({
                success: false,
                message: 'All required fields must be filled'
            });
        }

        // 2. التحقق من وجود البريد الإلكتروني مسبقاً
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        // 3. تشفير كلمة المرور
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. تجهيز بيانات المستخدم
        let userData = {
            username,
            email,
            phone,
            password: hashedPassword,
            role,
            address,
            avatar: '', // سيتم ملؤه إذا تم رفع صورة
        };

        // --- التعبئة التلقائية للأنواع (Auto-Type Logic) ---
        if (role === 'Donor') {
            userData.donorType = 'Donor';
            userData.businessName = businessName;
        } else if (role === 'Receiver') {
            userData.receiverType = 'Receiver';
            userData.businessName = businessName;
        }

        // 5. معالجة رفع الـ Avatar (متاح لجميع الأدوار الآن)
        if (req.files?.avatar?.[0]) {
            try {
                userData.avatar = await uploadToImgBB(req.files.avatar[0].buffer);
            } catch (e) {
                console.log("Avatar upload error ignored");
            }
        }

        // 6. معالجة بيانات السائق الخاصة
        if (role === 'Driver') {
            // رفع الرخصة
            if (req.files?.licenseImage?.[0]) {
                try {
                    userData.licenseImage = await uploadToImgBB(req.files.licenseImage[0].buffer);
                } catch (e) {
                    console.log("License upload error ignored");
                }
            }

            // معالجة المواعيد (Availability)
            if (availability) {
                try {
                    userData.availability = typeof availability === 'string' 
                        ? JSON.parse(availability) 
                        : availability;
                } catch (e) {
                    console.log("Invalid availability format");
                }
            }
        }

        // 7. إنشاء المستخدم في قاعدة البيانات
        const newUser = await User.create(userData);

        res.status(201).json({
            success: true,
            message: "Account Created Successfully 🎉",
            user: newUser
        });

    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error occurred",
            error: error.message
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
            message: "Server error"
        });
    }
});

module.exports = router;