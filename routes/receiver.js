const express = require('express');
const Request = require('../models/Request');
const Donation = require('../models/Donation');
const { protect, restrictTo } = require('../middleware/auth'); // تم تعديل المسار هنا

const router = express.Router();

router.get('/available-donations', protect, restrictTo('Receiver'), async (req, res) => {
    try {
        const availableDonations = await Donation.find({
            status: 'Pending'
        }).populate('donor', 'username phone address businessName');

        res.status(200).json({
            success: true,
            data: availableDonations
        });
    } catch (error) {
        console.error('Error fetching donations:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post('/request-donation', protect, restrictTo('Receiver'), async (req, res) => {
    try {
        const { 
            title, 
            description, 
            typeOfFood, 
            foodQuantity, 
            date, 
            time, 
            contactDetails, 
            donorId 
        } = req.body;

        if (!date || !time) {
            return res.status(400).json({ 
                success: false, 
                message: 'Date and Time are required for the request' 
            });
        }

        const newRequest = new Request({
            receiver: req.user.id,
            title,
            description,
            typeOfFood,
            foodQuantity,
            date,      
            time,      
            contactDetails,
            donor: donorId,
            status: 'Pending'
        });

        await newRequest.save();

        res.status(201).json({
            success: true,
            message: 'Request submitted successfully. Waiting for donor approval.',
            data: newRequest
        });
    } catch (error) {
        console.error('Request Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.get('/my-requests', protect, restrictTo('Receiver'), async (req, res) => {
    try {
        const requests = await Request.find({ receiver: req.user.id })
            .populate('donor', 'username businessName')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: requests
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;