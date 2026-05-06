const mongoose = require('mongoose');

const donationListingSchema = new mongoose.Schema({
    donorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true,
    },
    title: {
        type: String,
        required: [true, 'Please add a food title'],
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    foodType: {
        type: String,
        required: true,
        enum: ['Cooked Food-Veg & NonVeg', 'Cooked Food-Veg', 'Cooked Food-NonVeg', 'Raw Food', 'Bakery', 'Dairy'], 
    },
    quantity: {
        veg: {
            type: Number,
            default: 0,
            min: 0,
        },
        nonVeg: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    photos: {
        type: [String], 
        default: [],
    },
    expirationDate: {
        type: Date,
        required: true,
    },
    expirationTime: {
        type: String,
        required: true,
    },
    isHygieneAssured: {
        type: Boolean,
        required: [true, 'You must assure the food quality and hygiene'],
    },
    status: {
        type: String,
        enum: ['Available', 'Reserved', 'Picked Up', 'Expired'],
        default: 'Available',
    }
}, { timestamps: true });

const DonationListing = mongoose.model('DonationListing', donationListingSchema);
module.exports = DonationListing;