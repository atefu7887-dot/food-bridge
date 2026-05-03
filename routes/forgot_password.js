const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const User = require('../models/User');


router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetPasswordOtp = otp;
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
        await user.save();

        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: 'atefu7887@gmail.com',
                pass: 'spcp xjmf kbbt gvqf',
            },
        });

        const mailOptions = {
            to: user.email,
            subject: 'FoodBridge - Password Reset Code',
            text: `Your verification code is: ${otp}. This code is valid for 10 minutes.`,
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({
            success: true,
            message: 'The code has been successfully sent to your email.',
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});


router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.resetPasswordOtp !== otp || user.resetPasswordExpire < Date.now()) {
            return res.status(400).json({
                success: false,
                message: 'Invalid code or has expired'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Code verified successfully'
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});


router.post('/reset-password', async (req, res) => {
    try {
        const { email, newPassword, otp } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }


        if (user.resetPasswordOtp !== otp || user.resetPasswordExpire < Date.now()) {
            return res.status(400).json({
                success: false,
                message: 'Invalid code or has expired'
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetPasswordOtp = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/resend-code', async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetPasswordOtp = otp;
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
        await user.save();

        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: 'atefu7887@gmail.com',
                pass: 'spcp xjmf kbbt gvqf',
            },
        });

        const mailOptions = {
            to: user.email,
            subject: 'FoodBridge - Password Reset Code',
            text: `Your new verification code is: ${otp}. This code is valid for 10 minutes.`,
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({
            success: true,
            message: 'A new code has been successfully sent to your email.',
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;