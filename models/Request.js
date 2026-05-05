const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
    },
    typeOfFood: {
        type: String,
        required: true,
        enum: ['Cooked Food-Veg & NonVeg', 'Packed Food', 'Raw Ingredients']
    },
    foodQuantity: {
        type: String, 
        required: true
    },

    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        required: true
    },

    contactDetails: {
        phone: { type: String, required: true },
        address: { type: String, required: true }
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Assigned', 'Picked Up', 'Completed'],
        default: 'Pending'
    },
    donor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    assignedDriver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

module.exports = mongoose.model('Request', requestSchema);