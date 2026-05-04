const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    phone: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['Donor', 'Receiver', 'Volunteer'],
        required: true,
    },
    donorType: {
        type: String,
        enum: ['Restaurant', 'Bakery', 'Individual'],
        default: 'Individual',
    },
    businessName: {
        type: String,
    },
    receiverType: {
        type: String,
        enum: ['Trust', 'NGO', 'Individual'],
    },
    fullName: {
        type: String,
    },
    address: {
        type: String,
    },
    photos: {
        type: [String],
        default: [],
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    resetPasswordOtp: {
        type: String,
    },
    resetPasswordExpire: {
        type: Date,
    },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
module.exports = User;