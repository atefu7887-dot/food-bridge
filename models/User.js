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
    // البيانات الخاصة بأوقات العمل للمتطوع
    availability: {
        timeSlot: {
            type: String,
            enum: ['Morning 9 to 11', 'Afternoon 1 to 3', 'Night 10 to 11', 'Others'],
        },
        customTime: {
            type: String,
        },
        days: {
            type: [String],
        },
        frequency: {
            type: String,
            enum: ['All Weekdays', 'All Weekend', 'Any Day'],
        },
    },

    avatar: {
        type: String,
        default: '',
    },
    licenseImage: {
        type: String,
        default: '',
    },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
module.exports = User;