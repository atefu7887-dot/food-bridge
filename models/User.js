const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, trim: true },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    phone: { type: String, required: true, trim: true },

    password: { type: String, required: true },

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

    businessName: String,
    receiverType: {
        type: String,
        enum: ['Trust', 'NGO', 'Individual'],
    },

    organizationName: String,
    registrationLicenseNumber: String,

    fullName: String,
    commercialRegisterNumber: String,
    businessPhone: String,
    address: String,

    photos: {
        type: [String],
        default: [],
    },

    isVerified: {
        type: Boolean,
        default: false,
    },

    resetPasswordOtp: String,
    resetPasswordExpire: Date,

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);