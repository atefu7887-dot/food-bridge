const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const User = require('../models/User');

const router = express.Router();

// إعداد Multer لتخزين الملفات في الذاكرة المؤقتة (Memory Storage)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } 
});

const uploadFields = upload.fields([
    { name: 'photos', maxCount: 5 },
    { name: 'avatar', maxCount: 1 },
    { name: 'licenseImage', maxCount: 1 }
]);

// دالة مساعدة لرفع الصورة إلى ImgBB
async function uploadToImgBB(buffer) {
    // ضع مفتاح API الخاص بك هنا بين علامتي التنصيص
    const apiKey = "e588c3e5bae57852fb441c6f15619cad"; 
    const base64Image = buffer.toString('base64');

    const formData = new FormData();
    formData.append('image', base64Image);

    try {
        const response = await axios.post(`https://api.imgbb.com/1/upload?key=${apiKey}`, formData, {
            headers: {
                ...formData.getHeaders()
            }
        });
        return response.data.data.url; // إرجاع الرابط الدائم للصورة
    } catch (error) {
        console.error("ImgBB Upload Error:", error.response?.data || error.message);
        throw new Error('Failed to upload image to external storage');
    }
}

// مسار تسجيل الدخول
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "Email not registered" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect password" });
        }

        res.status(200).json({
            message: "Login successful! ✅",
            user: { 
                username: user.username, 
                email: user.email, 
                role: user.role 
            }
        });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ message: "Server error" });
    }
});

// مسار التسجيل
router.post('/register', uploadFields, async (req, res) => {
    try {
        const { 
            username, email, phone, password, role, 
            donorType, businessName, address, receiverType, availability 
        } = req.body;

        if (!username || !email || !phone || !password || !role) {
            return res.status(400).json({
                success: false,
                message: 'All required fields must be filled'
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        let userData = { username, email, phone, password: hashedPassword, role };

        userData.photos = [];
        // معالجة الصور المتعددة (Photos)
        if ((role === 'Donor' || role === 'Receiver') && req.files && req.files['photos']) {
            const photoUrls = [];
            for (const file of req.files['photos']) {
                const url = await uploadToImgBB(file.buffer);
                photoUrls.push(url);
            }
            userData.photos = photoUrls;
        }

        if (role === 'Donor') {
            userData.donorType = donorType || 'Individual';
            userData.address = address;
            if (donorType === 'Restaurant' || donorType === 'Bakery') {
                userData.businessName = businessName;
            }
        } else if (role === 'Receiver') {
            userData.receiverType = receiverType;
            userData.address = address;
            if (receiverType === 'Trust' || receiverType === 'NGO') {
                userData.businessName = businessName;
            }
        } else if (role === 'Volunteer' && availability) {
            try {
                const parsedAvailability = typeof availability === 'string' ? JSON.parse(availability) : availability;
                userData.availability = {
                    timeSlot: parsedAvailability.timeSlot || '',
                    customTime: parsedAvailability.customTime || '',
                    days: parsedAvailability.days || [],
                    frequency: parsedAvailability.frequency || ''
                };
            } catch (e) {
                console.error("Invalid JSON format");
            }
        } else if (role === 'Driver') {
            if (req.files) {
                if (req.files['avatar']) {
                    userData.avatar = await uploadToImgBB(req.files['avatar'][0].buffer);
                }
                if (req.files['licenseImage']) {
                    userData.licenseImage = await uploadToImgBB(req.files['licenseImage'][0].buffer);
                }
            }
            if (availability) {
                try {
                    const parsedAvailability = typeof availability === 'string' ? JSON.parse(availability) : availability;
                    userData.availability = {
                        timeSlot: parsedAvailability.timeSlot || '',
                        customTime: parsedAvailability.customTime || '',
                        days: parsedAvailability.days || [],
                        frequency: parsedAvailability.frequency || ''
                    };
                } catch (e) {
                    console.error("Invalid JSON format");
                }
            }
        }

        const newUser = new User(userData);
        await newUser.save();

        res.status(201).json({
            success: true,
            message: 'Account Created Successfully!',
            user: newUser
        });

    } catch (error) {
        console.error('Register Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred',
            error: error.message
        });
    }
});

module.exports = router;