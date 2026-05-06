const express = require('express');
const Donation = require('../models/Donation');
const User = require('../models/User');

const router = express.Router();

// 1. 📦 إنشاء تبرع جديد (المانح - Donor)
router.post('/create', async (req, res) => {
    try {
        const { donorId, items, quantity, location } = req.body;

        const newDonation = new Donation({
            donor: donorId,
            items,
            quantity,
            location,
            status: 'Pending'
        });

        await newDonation.save();
        res.status(201).json({ success: true, message: 'Donation created successfully', donation: newDonation });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. 👀 استعراض التبرعات المتاحة (للمستقبل أو السائق)
router.get('/available', async (req, res) => {
    try {
        const donations = await Donation.find({ status: 'Pending' }).populate('donor', 'username phone email');
        res.status(200).json({ success: true, donations });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. 🤝 قبول/تخصيص التبرع للسائق (Driver)
router.patch('/assign-driver/:donationId', async (req, res) => {
    try {
        const { driverId } = req.body;
        const { donationId } = req.params;

        const donation = await Donation.findById(donationId);
        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation not found' });
        }

        // تحديث الحالة والسائق
        donation.driver = driverId;
        donation.status = 'Assigned';
        await donation.save();

        res.status(200).json({ success: true, message: 'Driver assigned successfully', donation });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 4. 🚚 السائق يستلم التبرع من المانح
router.patch('/pickup/:donationId', async (req, res) => {
    try {
        const { donationId } = req.params;

        const donation = await Donation.findById(donationId);
        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation not found' });
        }

        // تحديث الحالة إلى تم الاستلام
        donation.status = 'Picked Up';
        await donation.save();

        res.status(200).json({ success: true, message: 'Donation picked up by driver successfully', donation });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;