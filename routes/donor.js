const express = require('express');
const User = require('../models/User');

const router = express.Router();

router.get('/donors', async (req, res) => {
    try {
        const { donorType } = req.query;

        let query = { role: 'Donor' };
        if (donorType) {
            query.donorType = donorType;
        }

        const donors = await User.find(query).select('businessName phone address');

        res.status(200).json({
            success: true,
            count: donors.length,
            data: donors
        });

    } catch (error) {
        console.error('Fetch Donors Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred'
        });
    }
});

module.exports = router;