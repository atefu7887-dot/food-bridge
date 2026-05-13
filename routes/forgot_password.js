const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'atefu7887@gmail.com',
        pass: 'spcp xjmf kbbt gvqf', 
    },
});

// //* =============================================================
// //* ! SECTION: PASSWORD RESET OPERATIONS
// //* =============================================================

/**
 * ? 1. طلب استعادة كلمة المرور (إرسال كود OTP)
 * * Endpoint: POST /auth/forgot-password
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'البريد الإلكتروني مطلوب' });

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(404).json({ success: false, message: 'هذا البريد الإلكتروني غير مسجل لدينا' });
        }

        // ! توليد كود OTP وتحديد وقت انتهاء الصلاحية
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        user.resetPasswordOtp = otp;
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // صلاحية لمدة 10 دقائق
        await user.save();

        const mailOptions = {
            to: user.email,
            subject: 'FoodBridge - Password Reset Code',
            text: `كود التحقق الخاص بك هو: ${otp}. هذا الكود صالح لمدة 10 دقائق فقط.`,
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({
            success: true,
            message: 'تم إرسال كود التحقق إلى بريدك الإلكتروني بنجاح',
        });
    } catch (error) {
        console.error("FORGOT PASSWORD ERROR:", error);
        return res.status(500).json({ success: false, message: 'حدث خطأ في الخادم أثناء إرسال الكود' });
    }
});

/**
 * ? 2. التحقق من صحة كود OTP
 * * Endpoint: POST /auth/verify-otp
 */
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ success: false, message: 'البيانات ناقصة' });

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }

        // ! التحقق من مطابقة الكود وعدم انتهاء الوقت
        if (user.resetPasswordOtp !== otp || user.resetPasswordExpire < Date.now()) {
            return res.status(400).json({
                success: false,
                message: 'كود التحقق غير صحيح أو انتهت صلاحيته'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'تم التحقق من الكود بنجاح'
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * ? 3. إعادة تعيين كلمة المرور الجديدة
 * * Endpoint: POST /auth/reset-password
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { email, newPassword, otp } = req.body;
        if (!email || !newPassword || !otp) return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }

        // ! التحقق الأخير قبل تغيير كلمة السر
        if (user.resetPasswordOtp !== otp || user.resetPasswordExpire < Date.now()) {
            return res.status(400).json({
                success: false,
                message: 'انتهت صلاحية الجلسة، يرجى طلب كود جديد'
            });
        }

        // * تشفير كلمة السر الجديدة وحذف بيانات الـ OTP
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetPasswordOtp = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'تم تغيير كلمة المرور بنجاح ✅'
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * ? 4. إعادة إرسال الكود (Resend OTP)
 * * Endpoint: POST /auth/resend-code
 */
router.post('/resend-code', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }

        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        user.resetPasswordOtp = otp;
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
        await user.save();

        const mailOptions = {
            to: user.email,
            subject: 'FoodBridge - New Reset Code',
            text: `كود التحقق الجديد الخاص بك هو: ${otp}.`,
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({
            success: true,
            message: 'تم إعادة إرسال الكود بنجاح إلى بريدك الإلكتروني',
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;