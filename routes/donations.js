const express = require('express');
const Donation = require('../models/Donation');
const { protect, restrictTo } = require('./auth'); 

const router = express.Router();


router.post('/create-donation', protect, restrictTo('Donor'), async (req, res) => {
    try {
        const { 
            title, 
            description, 
            typeOfFood, 
            foodQuantity, 
            expirationDate, 
            expirationTime 
        } = req.body;

   
        if (!expirationDate || !expirationTime) {
            return res.status(400).json({ 
                success: false, 
                message: 'Expiration date and expiration time are required' 
            });
        }

        const newDonation = new Donation({
            donor: req.user.id, 
            title,
            description,
            typeOfFood,
            foodQuantity,
            expirationDate,   
            expirationTime,  
            status: 'Pending'
        });

        await newDonation.save();

        res.status(201).json({
            success: true,
            message: 'Donation listing created successfully.',
            data: newDonation
        });
    } catch (error) {
        console.error('Create Donation Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


router.get('/my-donations', protect, restrictTo('Donor'), async (req, res) => {
    try {
        const donations = await Donation.find({ donor: req.user.id })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: donations
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;