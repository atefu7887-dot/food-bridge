const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
    donor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // يمكن أن تكون جمعية (NGO) أو جهة استقبال
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // السائق الذي سيقوم بالتوصيل
    },
    itemDetails: {
        type: String,
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['Pending', 'Assigned', 'Picked Up', 'Delivered'],
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