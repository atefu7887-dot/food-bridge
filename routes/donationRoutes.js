const express = require('express');
const router = express.Router();
const Donation = require('../models/Donation');
const User = require('../models/User');

// ==========================================
// 1. قسم المتبرع (Donor)
// ==========================================

// إضافة تبرع جديد
router.post('/add', async (req, res) => {
    try {
        const newDonation = new Donation(req.body);
        await newDonation.save();
        res.status(201).json({ success: true, donation: newDonation });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// عرض التاريخ (History) - يرى المتبرع حالة التبرع، اسم الجمعية، وبيانات السائق
router.get('/my-history/:donorId', async (req, res) => {
    try {
        const history = await Donation.find({ donor: req.params.donorId })
            .populate('receiver', 'username phone') // بيانات الجمعية
            .populate('driver', 'username phone')   // بيانات السائق
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, history });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// 2. قسم الجمعية (NGO)
// ==========================================

// أ- موافقة الجمعية على التبرع (تصبح الحالة Accepted)
router.patch('/:id/approve', async (req, res) => {
    try {
        const { receiverId } = req.body;
        const donation = await Donation.findByIdAndUpdate(
            req.params.id,
            { receiver: receiverId, status: 'Accepted', acceptedAt: new Date() },
            { new: true }
        );
        res.status(200).json({ success: true, donation });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ب- جلب قائمة السائقين المتاحين لتختار الجمعية منهم
router.get('/list-drivers', async (req, res) => {
    try {
        const drivers = await User.find({ role: 'Driver' }).select('username phone');
        res.status(200).json({ success: true, drivers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ج- الجمعية تختار سائقاً معيناً (تصبح الحالة Assigned)
router.patch('/:id/assign-driver', async (req, res) => {
    try {
        const { driverId } = req.body;
        const donation = await Donation.findByIdAndUpdate(
            req.params.id,
            { driver: driverId, status: 'Assigned', estimatedArrivalTime: 'جاري التحديد من السائق...' },
            { new: true }
        );
        res.status(200).json({ success: true, message: 'تم تعيين السائق بنجاح', donation });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// 3. قسم السائق (Driver)
// ==========================================

// أ- عرض الطلبات التي تم تكليفه بها من قبل الجمعية
router.get('/my-tasks/:driverId', async (req, res) => {
    try {
        const tasks = await Donation.find({ driver: req.params.driverId, status: 'Assigned' })
            .populate('donor', 'username location phone')
            .populate('receiver', 'username address');
        res.status(200).json({ success: true, tasks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ب- السائق يحدد وقت الوصول (يظهر فوراً للمتبرع)
router.patch('/:id/update-eta', async (req, res) => {
    try {
        const { eta } = req.body; // مثال: "15 دقيقة"
        const donation = await Donation.findByIdAndUpdate(
            req.params.id,
            { estimatedArrivalTime: eta },
            { new: true }
        );
        res.status(200).json({ success: true, donation });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;