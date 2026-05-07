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
            return res.status(400).json({ success: false, message: 'Invalid donor account' });
        }

        const newDonation = new Donation({
            donor: donorId,
            receiver: receiverId || null,
            itemDetails,
            quantity,
            location,
            expiryDate
        });

        await newDonation.save();
        res.status(201).json({ success: true, donation: newDonation });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 👤 عرض تاريخ تبرعات المتبرع نفسه
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

// 🔍 عرض التبرعات المتاحة للطلب (التي ليس لها جمعية بعد)
router.get('/available-for-ngo', async (req, res) => {
    try {
        const donations = await Donation.find({ status: 'Pending', receiver: null })
            .populate('donor', 'username phone location avatar');
        res.status(200).json({ success: true, donations });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 📥 حجز التبرع بواسطة الجمعية
router.patch('/:id/request-donation', async (req, res) => {
    try {
        const { receiverId } = req.body;
        const donation = await Donation.findById(req.params.id);

        if (!donation || donation.receiver !== null) {
            return res.status(400).json({ success: false, message: 'Donation already taken or not found' });
        }

        donation.receiver = receiverId;
        await donation.save();
        res.status(200).json({ success: true, message: 'Donation reserved successfully', donation });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 🚚 جلب قائمة السائقين (لاختيار أحدهم) - يعرض التوافر والبيانات
router.get('/available-drivers', async (req, res) => {
    try {
        const drivers = await User.find({ role: 'Driver' })
            .select('username phone email avatar availability')
            .lean();
        
        res.status(200).json({ success: true, drivers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 🎯 تعيين سائق محدد لطلب معين (تقوم به الجمعية)
router.patch('/:id/assign-driver', async (req, res) => {
    try {
        const { driverId, receiverId } = req.body;
        const donationId = req.params.id;

        const donation = await Donation.findById(donationId);
        if (!donation) return res.status(404).json({ success: false, message: 'Donation not found' });
        
        // التأكد أن الجمعية هي صاحبة الطلب
        if (donation.receiver.toString() !== receiverId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        // التأكد أن المختار هو سائق
        const driver = await User.findOne({ _id: driverId, role: 'Driver' });
        if (!driver) return res.status(400).json({ success: false, message: 'Invalid driver selected' });

        donation.driver = driverId;
        donation.status = 'Assigned'; // تحديث الحالة فور التعيين
        await donation.save();

        res.status(200).json({ success: true, message: 'Driver assigned', driverName: driver.username });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 🏠 عرض تبرعات الجمعية (التي حجزتها)
router.get('/receiver-donations/:receiverId', async (req, res) => {
    try {
        const donations = await Donation.find({ receiver: req.params.receiverId })
            .populate('donor', 'username phone')
            .populate('driver', 'username phone avatar availability');
        res.status(200).json({ success: true, donations });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// 3. مسارات السائق (Driver)
// ==========================================

// 📋 عرض المهام الموكلة للسائق (التي تم تعيينه فيها)
router.get('/my-tasks/:driverId', async (req, res) => {
    try {
        const tasks = await Donation.find({ driver: req.params.driverId })
            .populate('donor', 'username phone location')
            .populate('receiver', 'username phone address');
        res.status(200).json({ success: true, tasks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 🔄 تحديث حالة الطلب (Picked Up / Delivered)
router.patch('/:id/update-status', async (req, res) => {
    try {
        const { status, driverId } = req.body;
        const donation = await Donation.findOne({ _id: req.params.id, driver: driverId });

        if (!donation) return res.status(404).json({ success: false, message: 'Task not found for this driver' });

        donation.status = status;
        await donation.save();

        res.status(200).json({ success: true, message: `Status updated to ${status}` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;