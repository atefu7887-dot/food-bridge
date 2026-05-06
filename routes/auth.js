const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const User = require('../models/User');

const router = express.Router();

// ✅ Multer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

const uploadFields = upload.fields([
    { name: 'photos', maxCount: 5 },
    { name: 'avatar', maxCount: 1 },
    { name: 'licenseImage', maxCount: 1 }
]);

// ✅ ImgBB Upload
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
// 🔐 LOGIN (تم إصلاح المشكلة هنا)
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

        // ✅ رجّع المستخدم كامل (المهم!)
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

//////////////////////////////////////////////////
// 📝 REGISTER
//////////////////////////////////////////////////
router.post('/register', uploadFields, async (req, res) => {
    try {
        const {
            username, email, phone, password, role,
            donorType, businessName, address, receiverType, availability
        } = req.body;

        // 🔴 Validation
        if (!username || !email || !phone || !password || !role) {
            return res.status(400).json({
                success: false,
                message: 'All required fields must be filled'
            });
        }

        // 🔍 Check existing
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        // 🔐 Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        let userData = {
            username,
            email,
            phone,
            password: hashedPassword,
            role,
            photos: []
        };

        //////////////////////////////////////////////////
        // 🖼️ Photos (Donor / Receiver)
        //////////////////////////////////////////////////
        if ((role === 'Donor' || role === 'Receiver') && req.files?.photos) {
            for (const file of req.files.photos) {
                try {
                    const url = await uploadToImgBB(file.buffer);
                    userData.photos.push(url);
                } catch (e) {
                    console.log("Photo upload failed");
                }
            }
        }

        //////////////////////////////////////////////////
        // 🚚 Driver
        //////////////////////////////////////////////////
        if (role === 'Driver') {

            // Avatar
            if (req.files?.avatar?.length > 0) {
                try {
                    userData.avatar = await uploadToImgBB(req.files.avatar[0].buffer);
                } catch (e) {
                    console.log("Avatar upload failed");
                }
            }

            // License
            if (req.files?.licenseImage?.length > 0) {
                try {
                    userData.licenseImage = await uploadToImgBB(req.files.licenseImage[0].buffer);
                } catch (e) {
                    console.log("License upload failed");
                }
            }

            // Availability
            if (availability) {
                try {
                    const parsed = typeof availability === 'string'
                        ? JSON.parse(availability)
                        : availability;

                    userData.availability = {
                        timeSlot: parsed.timeSlot || '',
                        customTime: parsed.customTime || '',
                        days: parsed.days || [],
                        frequency: parsed.frequency || ''
                    };
                } catch (e) {
                    console.log("Invalid availability JSON");
                }
            }
        }

        //////////////////////////////////////////////////
        // 💾 Save
        //////////////////////////////////////////////////
        const newUser = await User.create(userData);

        //////////////////////////////////////////////////
        // ✅ Response
        //////////////////////////////////////////////////
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

module.exports = router;