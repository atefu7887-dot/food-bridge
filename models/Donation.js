const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
    donor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    title: { 
        type: String, 
        required: true 
    },
    foodType: { 
        type: String, 
        enum: ['Cooked Food-Veg & NonVeg', 'Veg Only', 'NonVeg Only', 'Other'],
        default: 'Cooked Food-Veg & NonVeg'
    },
    description: { 
        type: String,
        required: true,
    },
    quantity: { 
        type: Number, 
        required: true,
    },
    breakdown: {
        veg: { type: Number, default: 0 },
        nonVeg: { type: Number, default: 0 }
    },
    images: { 
        type: [String], 
        default: [] 
    },
    contactPhone: { 
        type: String 
    },
    status: {
        type: String,
        enum: ['Pending', 'Assigned', 'Picked Up', 'Delivered', 'Accepted'],
        default: 'Pending',
    },
    location: { 
        type: String,
        required: true,
    },
    expiryDate: {
        type: Date,
    }
}, { timestamps: true });

const Donation = mongoose.model('Donation', donationSchema);
module.exports = Donation;