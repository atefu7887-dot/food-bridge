const express = require('express');
const Delivery = require('../models/Delivery');
const { protect, restrictTo } = require('./auth'); 

const router = express.Router();


router.get('/requests-to-deliver', protect, restrictTo('Volunteer'), async (req, res) => {
    try {
   
        const deliveries = await Delivery.find({
            volunteer: req.user.id,
            status: 'Assigned'
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: deliveries
        });
    } catch (error) {
        console.error('Error fetching delivery requests:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


router.patch('/update-status/:id', protect, restrictTo('Volunteer'), async (req, res) => {
    try {
        const { status } = req.body;
        
        const delivery = await Delivery.findById(req.params.id);

        if (!delivery) {
            return res.status(404).json({ success: false, message: 'Delivery not found' });
        }

        delivery.status = status;
        await delivery.save();

        res.status(200).json({
            success: true,
            message: 'Status updated successfully',
            data: delivery
        });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;