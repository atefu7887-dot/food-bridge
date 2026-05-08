const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const Donation = require('../models/Donation');
const User = require('../models/User');


const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});


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


router.post('/add', upload.array('photos', 5), async (req, res) => {
    try {
        const { 
            donorId, 
            title, 
            foodType, 
            itemDetails, 
            quantity, 
            vegQty, 
            nonVegQty, 
            location, 
            contactPhone,
            expiryDate,
            expiryTime,        // الجديد
            isQualityAssured,  // الجديد
            receiverId 
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
            description: itemDetails, // itemDetails هو الـ Description في الـ UI
            quantity: parseInt(quantity),
            breakdown: {
                veg: parseInt(vegQty) || 0,
                nonVeg: parseInt(nonVegQty) || 0
            },
            images: imageUrls,
            location,
            contactPhone: contactPhone || donor.phone,
            expiryDate,
            expiryTime,        // تخزين الوقت
            isQualityAssured: isQualityAssured === 'true' || isQualityAssured === true, // التعامل مع FormData
            status: 'Pending'
        });

        await newDonation.save();
        res.status(201).json({ success: true, message: "Donation created!", donation: newDonation });

    } catch (error) {
        console.error("Add Donation Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 👤 عرض تاريخ التبرعات الخاص بالمتبرع
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

// 🏛️ جلب الجمعيات المتاحة
router.get('/available-ngos', async (req, res) => {
    try {
        const ngos = await User.find({ role: 'Receiver' })
            .select('username email phone address avatar receiverType bio photos')
            .lean();
        res.status(200).json({ success: true, ngos });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// 2. مسارات الجمعية (Receiver / NGO)
// ==========================================

// 🔍 التبرعات المتاحة في السوق
router.get('/available-for-ngo', async (req, res) => {
    try {
        const donations = await Donation.find({ status: 'Pending', receiver: null })
            .populate('donor', 'username phone location avatar');
        res.status(200).json({ success: true, donations });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 📥 حجز تبرع من قبل الجمعية
router.patch('/:id/request-donation', async (req, res) => {
    try {
        const { receiverId } = req.body;
        const donation = await Donation.findById(req.params.id);
        
        if (!donation || donation.receiver !== null) {
            return res.status(400).json({ success: false, message: 'Donation already taken or not found' });
        }

        donation.receiver = receiverId;
        await donation.save();
        res.status(200).json({ success: true, donation });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 📋 جلب التبرعات الخاصة بجمعية معينة
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

// ==========================================
// 3. مسارات السائق (Driver)
// ==========================================

// 📋 عرض المهام الموكلة للسائق
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

// 🔄 تحديث الحالة من قبل السائق
router.patch('/:id/update-status', async (req, res) => {
    try {
        const { status, driverId } = req.body;
        const donation = await Donation.findOne({ _id: req.params.id, driver: driverId });
        
        if (!donation) return res.status(404).json({ success: false, message: 'Task not found' });

        donation.status = status; 
        await donation.save();
        res.status(200).json({ success: true, message: `Status updated to ${status}`, donation });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;