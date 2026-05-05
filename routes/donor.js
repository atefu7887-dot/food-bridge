const express = require('express');
const Donation = require('../models/Donation');

const router = express.Router();

// routes/donations.js
router.get('/my-donations', async (req, res) => {
  try {
    // جلب جميع التبرعات
    const donations = await Donation.find()
      .populate('donor', 'username'); // جلب بيانات المتبرع

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