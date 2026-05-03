const express = require('express');
const router = express.Router();
const User = require('../models/User');

// --- تسجيل الدخول (Login) ---
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });


        if (!user) {
            return res.status(400).json({ message: "Email not registered" });
        }


        if (user.password !== password) {
            return res.status(400).json({ message: "Incorrect password"});
        }

        res.status(200).json({
            message: "Login successful! ✅",
            user: { username: user.username, email: user.email }
        });

    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});


router.post('/register', async (req, res) => {
    const { username, email, password, phone } = req.body;

    try {

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message:"This email is already registered." });
        }

        const newUser = new User({
            username,
            email,
            password,
            phone
        });

        await newUser.save();
        res.status(201).json({ message:"Account created successfully! 🎉"});

    } catch (err) {
        res.status(500).json({ message: "Account creation failed", error: err.message });
    }
});

module.exports = router;