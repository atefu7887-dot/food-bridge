const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); 
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const User = require('../models/User');
const Availability = require('../models/Availability');

const router = express.Router();


const JWT_SECRET = process.env.JWT_SECRET || "atef1234567890";


const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, role: user.role },
        JWT_SECRET,
        { expiresIn: '30d' } 
    );
};


const upload = multer({ storage: multer.memoryStorage() });
const uploadFields = upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'licenseImage', maxCount: 1 }]);

async function uploadToImgBB(buffer) {
    if (!buffer) return "";
    const apiKey = process.env.IMGBB_API_KEY || "e588c3e5bae57852fb441c6f15619cad";
    const formData = new FormData();
    formData.append('image', buffer.toString('base64'));
    try {
        const response = await axios.post(`https://api.imgbb.com/1/upload?key=${apiKey}`, formData, {
            headers: formData.getHeaders()
        });
        return response.data.data.url;
    } catch (error) { return ""; }
}

//////////////////////////////////////////////////
// 1. REGISTER (مع إضافة Token)
//////////////////////////////////////////////////

router.post('/register', uploadFields, async (req, res) => {
    try {
        const { username, email, phone, password, role, businessName, address, availability } = req.body;

        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) return res.status(400).json({ success: false, message: 'Email already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);

        let userData = {
            username: username.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            password: hashedPassword,
            role: role,
            address: address || "",
            businessName: role === 'Driver' ? '' : (businessName || "")
        };

        if (req.files) {
            if (req.files.avatar) userData.avatar = await uploadToImgBB(req.files.avatar[0].buffer);
            if (req.files.licenseImage) userData.licenseImage = await uploadToImgBB(req.files.licenseImage[0].buffer);
        }

        const createdUser = await User.create(userData);
        const newUser = await User.findById(createdUser._id).populate('availability');

       
        const token = generateToken(newUser);

        return res.status(201).json({
            success: true,
            message: 'User created successfully 🎉',
            token: token, 
            user: newUser
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

//////////////////////////////////////////////////
// 2. LOGIN (مع إضافة Token)
//////////////////////////////////////////////////

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email: email.toLowerCase().trim() })
            .select('+password')
            .populate('availability');

        if (!user) return res.status(400).json({ success: false, message: 'Email not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ success: false, message: 'Wrong password' });

      
        const token = generateToken(user);

        const userObj = user.toObject();
        delete userObj.password;

        return res.status(200).json({
            success: true,
            message: 'Login successful ✅',
            token: token, 
            user: userObj
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/update-profile/:userId', upload.single('avatar'), async (req, res) => {
    try {
        const { userId } = req.params;
        let updateData = { ...req.body };

        // 🛑 الخطوة المصيرية: تحويل النص القادم من الموبايل إلى Object 🛑
        if (updateData.availability && typeof updateData.availability === 'string') {
            try {
                updateData.availability = JSON.parse(updateData.availability);
            } catch (e) {
                console.error("Error parsing availability JSON:", e);
                // إذا فشل الـ parse نتركها كما هي أو نتعامل مع الخطأ
            }
        }

        // إذا قام المستخدم برفع صورة جديدة
        if (req.file) {
            updateData.avatar = await uploadToImgBB(req.file.buffer);
        }

        // تحديث البيانات في قاعدة البيانات
        // ملاحظة: استخدم populate لإرجاع البيانات كاملة للفلاتر
        const updatedUser = await User.findByIdAndUpdate(
            userId, 
            updateData, 
            { new: true }
        ).populate('availability');

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // إرجاع رد JSON سليم (هذا سيمنع الـ FormatException في فلاتر)
        res.status(200).json({
            success: true,
            message: "Profile updated successfully 🎉",
            user: updatedUser
        });

    } catch (error) {
        console.error("Update Error:", error);
        // 🛑 تأكد دائماً من إرسال JSON حتى في حالة الخطأ 🛑
        res.status(500).json({ 
            success: false, 
            message: "Internal Server Error: " + error.message 
        });
    }
});

module.exports = router;