const express = require('express');
const router = express.Router();
const Donation = require('../models/Donation');
const User = require('../models/User');

// 1. ➕ إضافة تبرع جديد
router.post('/add', async (req, res) => {
    try {
        const { donorId, itemDetails, quantity, location, expiryDate, receiverId } = req.body;

        // التحقق من أن المستخدم مسجل ومتبرع (Donor)
        const donor = await User.findById(donorId);
        if (!donor || donor.role !== 'Donor') {
            return res.status(400).json({ success: false, message: 'Invalid donor or insufficient permissions' });
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
        res.status(201).json({ success: true, message: 'Donation added successfully', donation: newDonation });
    } catch (error) {
        console.error('Add Donation Error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// 2. 📋 عرض الطلبات المتاحة (للسائقين - الحالة Pending)
router.get('/available-requests', async (req, res) => {
    try {
        const donations = await Donation.find({ status: 'Pending' })
            .populate('donor', 'username email phone')
            .populate('receiver', 'username email address');

        res.status(200).json({ success: true, donations });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// 3. 🔍 عرض التبرعات المتاحة للجمعيات (التي لا تملك جمعية محددة بعد)
router.get('/available-for-ngo', async (req, res) => {
    try {
        const donations = await Donation.find({ status: 'Pending', receiver: null })
            .populate('donor', 'username phone location');
        res.status(200).json({ success: true, donations });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// 4. 📥 طلب تبرع بواسطة الجمعية (حجز التبرع)
router.patch('/:id/request-donation', async (req, res) => {
    try {
        const { receiverId } = req.body;

        const receiverUser = await User.findById(receiverId);
        if (!receiverUser || receiverUser.role !== 'Receiver') {
            return res.status(403).json({ success: false, message: 'Access denied. Only receivers can request donations.' });
        }

        const donation = await Donation.findById(req.params.id);
        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation not found.' });
        }

        // التأكد من أن التبرع متاح
        if (donation.status !== 'Pending' || donation.receiver !== null) {
            return res.status(400).json({ success: false, message: 'This donation is not available or already assigned.' });
        }

        // ربط التبرع بالجمعية
        donation.receiver = receiverId;
        await donation.save();

        res.status(200).json({ success: true, message: 'Donation successfully requested by NGO', donation });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// 5. 🤝 قبول الطلب بواسطة السائق
router.put('/:id/accept', async (req, res) => {
    try {
        const { driverId } = req.body;

        // التحقق من أن المستخدم سائق
        const driver = await User.findById(driverId);
        if (!driver || driver.role !== 'Driver') {
            return res.status(403).json({ success: false, message: 'Access denied. Only drivers can accept requests.' });
        }

        const donation = await Donation.findById(req.params.id);
        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation request not found.' });
        }

        // التأكد من أن الطلب متاح للقبول
        if (donation.status !== 'Pending') {
            return res.status(400).json({ success: false, message: 'This donation request is already assigned or taken.' });
        }

        // تخصيص السائق وتغيير الحالة
        donation.driver = driverId;
        donation.status = 'Assigned';
        await donation.save();

        res.status(200).json({ success: true, message: 'Donation request accepted successfully', donation });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// 6. 🔄 تحديث حالة الطلب من قبل السائق (Picked Up أو Delivered)
router.patch('/:id/update-status', async (req, res) => {
    try {
        const { status, driverId } = req.body;

        const validStatuses = ['Picked Up', 'Delivered'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status provided' });
        }

        // التأكد أن السائق يملك هذا الطلب
        const donation = await Donation.findOne({ _id: req.params.id, driver: driverId });
        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation not found or not assigned to this driver' });
        }

        donation.status = status;
        await donation.save();

        res.status(200).json({ success: true, message: `Donation status updated to ${status}`, donation });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// 7. 🏠 عرض التبرعات الخاصة بالجمعية
router.get('/receiver-donations/:receiverId', async (req, res) => {
    try {
        const { receiverId } = req.params;
        const donations = await Donation.find({ receiver: receiverId })
            .populate('donor', 'username phone')
            .populate('driver', 'username phone');

        res.status(200).json({ success: true, donations });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

module.exports = router;