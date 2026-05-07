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

// 🏛️ جلب الجمعيات المتاحة (لإظهارها للمتبرع في الواجهة)
router.get('/available-ngos', async (req, res) => {
    try {
        // نجلب المستخدمين الذين دورهم "Receiver" فقط
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

// 🔍 التبرعات المتاحة في السوق (التي لم تحجزها أي جمعية بعد)
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
            return res.status(400).json({ success: false, message: 'هذا التبرع محجوز بالفعل أو غير موجود' });
        }

        donation.receiver = receiverId;
        // الحالة تبقى Pending حتى يتم تعيين سائق ويقبل المهمة
        await donation.save();
        res.status(200).json({ success: true, donation });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 📋 جلب التبرعات التي حجزتها جمعية معينة
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

// 🚚 جلب قائمة السائقين المتاحين للتعيين
router.get('/available-drivers', async (req, res) => {
    try {
        const drivers = await User.find({ role: 'Driver' })
            .select('username phone email avatar availability');
        res.status(200).json({ success: true, drivers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 🎯 تعيين سائق لمهمة معينة
router.patch('/:id/assign-driver', async (req, res) => {
    try {
        const { driverId, receiverId } = req.body;
        const donation = await Donation.findById(req.params.id);
        
        if (!donation) return res.status(404).json({ success: false, message: 'Donation not found' });
        if (donation.receiver.toString() !== receiverId) {
            return res.status(403).json({ success: false, message: 'Unauthorized action' });
        }

        donation.driver = driverId;
        donation.status = 'Assigned'; // بانتظار قبول السائق
        await donation.save();
        res.status(200).json({ success: true, message: 'Driver assigned successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// 3. مسارات السائق (Driver)
// ==========================================

// 📋 عرض المهام الموكلة للسائق (الجديدة والمكتملة)
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

// ✅ قبول المهمة من قبل السائق
router.patch('/:id/driver-accept', async (req, res) => {
    try {
        const { driverId } = req.body;
        const donation = await Donation.findOne({ _id: req.params.id, driver: driverId });
        
        if (!donation) return res.status(404).json({ success: false, message: 'Task not found' });

        donation.status = 'Accepted'; 
        await donation.save();
        res.status(200).json({ success: true, message: 'Task Accepted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ❌ رفض المهمة من قبل السائق
router.patch('/:id/driver-reject', async (req, res) => {
    try {
        const { driverId } = req.body;
        const donation = await Donation.findOne({ _id: req.params.id, driver: driverId });
        
        if (!donation) return res.status(404).json({ success: false, message: 'Task not found' });

        donation.driver = null; // إزالة السائق لإتاحة تعيين غيره
        donation.status = 'Pending'; 
        await donation.save();
        res.status(200).json({ success: true, message: 'Task Rejected' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 🔄 تحديث الحالة (تم الاستلام / تم التوصيل)
router.patch('/:id/update-status', async (req, res) => {
    try {
        const { status, driverId } = req.body;
        const donation = await Donation.findOne({ _id: req.params.id, driver: driverId });
        
        if (!donation) return res.status(404).json({ success: false, message: 'Task not found' });

        donation.status = status; // مثل 'Picked Up' أو 'Delivered'
        await donation.save();
        res.status(200).json({ success: true, message: `Status updated to ${status}` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;