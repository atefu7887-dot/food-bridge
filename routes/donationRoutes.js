const express = require('express');
const router = express.Router();
const Donation = require('../models/Donation');
const User = require('../models/User');

// ==========================================
// 1. مسارات المتبرع (Donor)
// ==========================================

// ➕ إضافة تبرع جديد
router.post('/add', async (req, res) => {
    try {
        const { donorId, itemDetails, quantity, location, expiryDate, receiverId } = req.body;
        const donor = await User.findById(donorId);
        if (!donor || donor.role !== 'Donor') {
            return res.status(400).json({ success: false, message: 'Invalid donor' });
        }
        const newDonation = new Donation({
            donor: donorId,
            receiver: receiverId || null,
            itemDetails, quantity, location, expiryDate
        });
        await newDonation.save();
        res.status(201).json({ success: true, donation: newDonation });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 👤 عرض تاريخ التبرعات للمتبرع
router.get('/donor-donations/:donorId', async (req, res) => {
    try {
        const donations = await Donation.find({ donor: req.params.donorId })
            .populate('receiver', 'username email')
            .populate('driver', 'username phone')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, donations });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// 2. مسارات الجمعية (Receiver / NGO)
// ==========================================

// 🔍 التبرعات المتاحة للحجز
router.get('/available-for-ngo', async (req, res) => {
    try {
        const donations = await Donation.find({ status: 'Pending', receiver: null })
            .populate('donor', 'username phone location avatar');
        res.status(200).json({ success: true, donations });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 📥 حجز تبرع
router.patch('/:id/request-donation', async (req, res) => {
    try {
        const { receiverId } = req.body;
        const donation = await Donation.findById(req.params.id);
        if (!donation || donation.receiver !== null) {
            return res.status(400).json({ success: false, message: 'Unavailable' });
        }
        donation.receiver = receiverId;
        await donation.save();
        res.status(200).json({ success: true, donation });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 🚚 جلب السائقين المتاحين
router.get('/available-drivers', async (req, res) => {
    try {
        const drivers = await User.find({ role: 'Driver' }).select('username phone email avatar availability');
        res.status(200).json({ success: true, drivers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 🎯 تعيين سائق (بانتظار موافقته)
router.patch('/:id/assign-driver', async (req, res) => {
    try {
        const { driverId, receiverId } = req.body;
        const donation = await Donation.findById(req.params.id);
        if (donation.receiver.toString() !== receiverId) return res.status(403).json({ success: false });

        donation.driver = driverId;
        donation.status = 'Assigned'; // حالة "تم التوجيه للسائق"
        await donation.save();
        res.status(200).json({ success: true, message: 'Driver assigned, waiting for approval' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// 3. مسارات السائق (Driver) - نظام القبول والرفض
// ==========================================

// 📋 عرض المهام (الموجهة للسائق والمقبولة)
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

// ✅ قبول المهمة من السائق
router.patch('/:id/driver-accept', async (req, res) => {
    try {
        const { driverId } = req.body;
        const donation = await Donation.findOne({ _id: req.params.id, driver: driverId });
        if (!donation) return res.status(404).json({ success: false, message: 'Not found' });

        donation.status = 'Accepted'; 
        await donation.save();
        res.status(200).json({ success: true, message: 'Task Accepted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ❌ رفض المهمة من السائق
router.patch('/:id/driver-reject', async (req, res) => {
    try {
        const { driverId } = req.body;
        const donation = await Donation.findOne({ _id: req.params.id, driver: driverId });
        if (!donation) return res.status(404).json({ success: false, message: 'Not found' });

        // إعادة الطلب للحالة Pending وحذف السائق لاختيار غيره
        donation.driver = null;
        donation.status = 'Pending'; 
        await donation.save();
        res.status(200).json({ success: true, message: 'Task Rejected' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 🔄 تحديث الحالة للتوصيل (Picked Up / Delivered)
router.patch('/:id/update-status', async (req, res) => {
    try {
        const { status, driverId } = req.body;
        const donation = await Donation.findOne({ _id: req.params.id, driver: driverId });
        donation.status = status;
        await donation.save();
        res.status(200).json({ success: true, message: `Status updated to ${status}` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;