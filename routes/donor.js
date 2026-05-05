const express = require('express');
const { protect, restrictTo } = require('../middleware/auth'); 
const Donation = require('../models/Donation');

const router = express.Router();

// routes/donations.js
router.get('/my-donations', protect, restrictTo('Donor'), async (req, res) => {
  try {
    // جلب التبرعات التي تخص المتبرع الحالي
    const donations = await Donation.find({ donor: req.user._id })
      .populate('donor', 'username'); // جلب بيانات المتبرع إذا لزم الأمر

    res.status(200).json({
      status: 'success',
      results: donations.length,
      data: {
        donations,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
});

module.exports = router;