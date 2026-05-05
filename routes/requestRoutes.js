const express = require('express');
const FoodRequest = require('../models/FoodRequest');
const User = require('../models/User');

const router = express.Router();


router.post('/', async (req, res) => {
    try {
        const {
            user,
            foodType,
            title,
            description,
            foodQuantity,
            requestMeal,
            contactDetails
        } = req.body;


        const userExists = await User.findById(user);
        if (!userExists) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const newFoodRequest = new FoodRequest({
            user,
            foodType,
            title,
            description,
            foodQuantity,
            requestMeal,
            contactDetails
        });

        await newFoodRequest.save();

        res.status(201).json({
            success: true,
            message: 'Food request created successfully',
            data: newFoodRequest
        });

    } catch (error) {
        console.error('Create Request Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred',
            error: error.message
        });
    }
});


router.get('/', async (req, res) => {
    try {
        const requests = await FoodRequest.find().populate('user', 'username email phone');

        res.status(200).json({
            success: true,
            count: requests.length,
            data: requests
        });
    } catch (error) {
        console.error('Fetch Requests Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred'
        });
    }
});


router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const userRequests = await FoodRequest.find({ user: userId }).populate('user', 'username email phone');

        res.status(200).json({
            success: true,
            count: userRequests.length,
            data: userRequests
        });
    } catch (error) {
        console.error('Fetch User Requests Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred'
        });
    }
});

module.exports = router;