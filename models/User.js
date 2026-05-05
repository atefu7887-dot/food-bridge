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
        enum: ['Donor', 'Receiver', 'Volunteer', 'Driver'],
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
    // البيانات الخاصة بأوقات العمل للمتطوع أو السائق
    availability: {
        timeSlot: {
            type: String,
            required: true,
            // تم إزالة الـ enum هنا ليقبل أي قيمة مخصصة يتم إرسالها من التطبيق
        },
        customTime: {
            type: String,
            default: "",
        },
        days: {
            type: [String], 
        },
        frequency: {
            type: String,
            enum: ['All Weekdays', 'All Weekend', 'Any Day'],
        },
    },
    // --- الحقول الجديدة الخاصة بالسائق ---
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