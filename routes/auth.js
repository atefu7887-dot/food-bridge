const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const User = require('../models/User');

const router = express.Router();

// 1. إعداد multer لتخزين الصور في الذاكرة (Memory Storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // الحد الأقصى 5 ميجا بايت للملف
});

// تعريف الحقول المسموح برفعها من الموبايل
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
// 📝 REGISTER ROUTE
//////////////////////////////////////////////////
router.post('/register', uploadFields, async (req, res) => {
    try {
        const {
            username, email, phone, password, role,
            businessName, address, availability
        } = req.body;

        // --- أ: التحقق من الحقول المطلوبة (Validation) ---
        if (!username || !email || !phone || !password || !role) {
            return res.status(400).json({
                success: false,
                message: 'الرجاء ملء جميع الحقول المطلوبة (الاسم، البريد، الهاتف، كلمة المرور، الدور)'
            });
        }

        // --- ب: التحقق من عدم تكرار البريد الإلكتروني ---
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'هذا البريد الإلكتروني مسجل بالفعل'
            });
        }

        // --- ج: تشفير كلمة المرور ---
        const hashedPassword = await bcrypt.hash(password, 10);

        // --- د: توحيد حالة أحرف الدور (Enum Handling) ---
        const roleMap = { 'driver': 'Driver', 'donor': 'Donor', 'receiver': 'Receiver' };
        const finalRole = roleMap[role.toLowerCase()] || role;

        // تجهيز كائن بيانات المستخدم
        let userData = {
            username: username.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            password: hashedPassword,
            role: finalRole,
            address: address || "",
            avatar: "", // قيمة افتراضية
        };

        // --- هـ: معالجة الصور (بشكل آمن) ---
        if (req.files) {
            if (req.files.avatar && req.files.avatar[0]) {
                userData.avatar = await uploadToImgBB(req.files.avatar[0].buffer).catch(() => "");
            }
            if (req.files.licenseImage && req.files.licenseImage[0]) {
                userData.licenseImage = await uploadToImgBB(req.files.licenseImage[0].buffer).catch(() => "");
            }
        }

        // --- و: منطق الأدوار المخصص ---
        if (finalRole === 'Driver') {
            userData.businessName = undefined; // السائق لا يملك نشاطاً تجارياً
            
            // معالجة المواعيد (Availability)
            if (availability) {
                try {
                    userData.availability = typeof availability === 'string' 
                        ? JSON.parse(availability) 
                        : availability;
                } catch (e) {
                    console.error("خطأ في تنسيق بيانات المواعيد");
                }
            }
        } else {
            // للمتبرع والمستلم: نضمن وجود اسم النشاط التجاري
            userData.businessName = businessName || username;
        }

        // --- ز: إنشاء المستخدم في قاعدة البيانات ---
        const newUser = await User.create(userData);

        res.status(201).json({
            success: true,
            message: "تم إنشاء الحساب بنجاح 🎉",
            user: newUser
        });

    } catch (error) {
        console.error("REGISTER ERROR:", error);
        
        // التعامل مع أخطاء MongoDB الخاصة بالتكرار
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "البريد الإلكتروني موجود مسبقاً"
            });
        }

        res.status(500).json({
            success: false,
            message: "حدث خطأ داخلي في الخادم",
            error: error.message
        });
    }
});

module.exports = router;