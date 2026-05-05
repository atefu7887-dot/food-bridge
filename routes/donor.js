const express = require('express');
const { protect, restrictTo } = require('../middleware/auth'); 
const Donation = require('../models/Donation');

const router = express.Router();

router.get('/my-donations', protect, restrictTo('Donor'), async (req, res) => {
    try {
        res.status(200).json({ success: true, message: 'هذه مسارات المتبرع' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;