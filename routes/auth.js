const express = require('express');
const router = express.Router();
const User = require('../models/User');

// --- تسجيل الدخول (Login) ---
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });


        if (!user) {
            return res.status(400).json({ message: "الايميل غير مسجل" });
        }


        if (user.password !== password) {
            return res.status(400).json({ message: "كلمة المرور خطأ" });
        }

        res.status(200).json({
            message: "تم تسجيل الدخول بنجاح! ✅",
            user: { username: user.username, email: user.email }
        });

    } catch (err) {
        res.status(500).json({ message: "خطأ في السيرفر" });
    }
});


router.post('/register', async (req, res) => {
    const { username, email, password, phone } = req.body;

    try {

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "هذا الايميل مسجل بالفعل" });
        }

        const newUser = new User({
            username,
            email,
            password,
            phone
        });

        await newUser.save();
        res.status(201).json({ message: "تم إنشاء الحساب بنجاح! 🎉" });

    } catch (err) {
        res.status(500).json({ message: "فشل إنشاء الحساب", error: err.message });
    }
});

module.exports = router;