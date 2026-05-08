const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const Donation = require('../models/Donation');
const User = require('../models/User');

// إعداد multer لتخزين الصور في الذاكرة المؤقتة
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

// دالة رفع الصور إلى ImgBB
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

// 1. ➕ إضافة تبرع جديد
router.post('/add', upload.array('photos', 5), async (req, res) => {
    try {
        const { 
            donorId, title, foodType, itemDetails, quantity, 
            vegQty, nonVegQty, location, contactPhone, 
            expiryDate, expiryTime, isQualityAssured, receiverId 
        } = req.body;

        const donor = await User.findById(donorId);
        if (!donor) return res.status(400).json({ success: false, message: 'Donor not found' });

        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(file => uploadToImgBB(file.buffer));
            imageUrls = await Promise.all(uploadPromises);
        }

        const newDonation = new Donation({
            donor: donorId,
            receiver: receiverId || null,
            title,
            foodType,
            description: itemDetails,
            quantity: parseInt(quantity),
            breakdown: {
                veg: parseInt(vegQty) || 0,
                nonVeg: parseInt(nonVegQty) || 0
            },
            images: imageUrls,
            location,
            contactPhone: contactPhone || donor.phone,
            expiryDate,
            expiryTime,
            isQualityAssured: isQualityAssured === 'true' || isQualityAssured === true,
            status: 'Pending'
        });

        await newDonation.save();
        res.status(201).json({ success: true, message: "Donation created!", donation: newDonation });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. 🚚 جلب قائمة السائقين المتاحين (حل مشكلة القائمة الفارغة)
router.get('/available-drivers', async (req, res) => {
    try {
        // نبحث عن المستخدمين الذين دورهم 'Driver'
        const drivers = await User.find({ role: 'Driver' })
            .select('username phone avatar')
            .lean();
        res.status(200).json({ success: true, drivers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. 🎯 تعيين سائق لطلب معين (بواسطة الجمعية)
router.patch('/:id/assign-driver', async (req, res) => {
    try {
        const { driverId } = req.body;
        const donation = await Donation.findByIdAndUpdate(
            req.params.id,
            { driver: driverId, status: 'Assigned' },
            { new: true }
        );
        res.status(200).json({ success: true, donation });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. ✅ قبول السائق للمهمة
router.patch('/:id/driver-accept', async (req, res) => {
    try {
        const donation = await Donation.findByIdAndUpdate(
            req.params.id,
            { status: 'Accepted' },
            { new: true }
        );
        res.status(200).json({ success: true, donation });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 5. ❌ رفض السائق للمهمة
router.patch('/:id/driver-reject', async (req, res) => {
    try {
        const donation = await Donation.findByIdAndUpdate(
            req.params.id,
            { driver: null, status: 'Pending' }, // إعادة الطلب للمسودة لتعيين سائق آخر
            { new: true }
        );
        res.status(200).json({ success: true, donation });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 6. 👤 عرض تاريخ تبرعات المتبرع
router.get('/donor-donations/:donorId', async (req, res) => {
    try {
        const donations = await Donation.find({ donor: req.params.donorId })
            .populate('receiver', 'username email phone avatar')
            .populate('driver', 'username phone avatar')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, donations });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 7. 🔍 التبرعات المتاحة للجمعيات
router.get('/available-for-ngo', async (req, res) => {
    try {
        const donations = await Donation.find({ status: 'Pending', receiver: null })
            .populate('donor', 'username phone location avatar');
        res.status(200).json({ success: true, donations });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 8. 📥 حجز تبرع من قبل الجمعية
router.patch('/:id/request-donation', async (req, res) => {
    try {
        const { receiverId } = req.body;
        const donation = await Donation.findById(req.params.id);
        if (!donation || donation.receiver) return res.status(400).json({ success: false, message: 'Taken or not found' });
        donation.receiver = receiverId;
        await donation.save();
        res.status(200).json({ success: true, donation });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 9. 📋 تبرعات جمعية معينة
router.get('/my-ngo-donations/:receiverId', async (req, res) => {
    try {
        const donations = await Donation.find({ receiver: req.params.receiverId })
            .populate('donor', 'username phone location')
            .populate('driver', 'username phone avatar')
            .sort({ updatedAt: -1 });
        res.status(200).json({ success: true, donations });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 10. 📋 مهام السائق
router.get('/my-tasks/:driverId', async (req, res) => {
    try {
        const tasks = await Donation.find({ driver: req.params.driverId })
            .populate('donor', 'username phone location')
            .populate('receiver', 'username phone address')
            .sort({ updatedAt: -1 });
        res.status(200).json({ success: true, tasks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 11. 🔄 تحديث حالة الطلب (Picked Up / Delivered)
router.patch('/:id/update-status', async (req, res) => {
    try {
        const { status, driverId } = req.body;
        const donation = await Donation.findOneAndUpdate(
            { _id: req.params.id, driver: driverId },
            { status },
            { new: true }
        );
        if (!donation) return res.status(404).json({ success: false, message: 'Task not found' });
        res.status(200).json({ success: true, donation });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;