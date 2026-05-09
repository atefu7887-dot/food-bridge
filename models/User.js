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
        enum: ['Donor', 'Receiver', 'Driver'],
        required: true,
    },
    // بيتم تخزين النوع تلقائياً بناءً على الـ role في الـ Logic
    donorType: {
        type: String,
        default: "",
    },
    receiverType: {
        type: String,
        default: "",
    },
    businessName: {
        type: String,
        validate: {
            validator: function (value) {
                // السائق فقط هو اللي ممنوع يكون له اسم نشاط تجاري
                if (this.role === 'Driver') {
                    return !value || value.trim() === '';
                }
                return true;
            },
            message: 'Business name is not allowed for the Driver role.'
        }
    },
    address: {
        type: String,
    },
    // الصورة الموحدة (شخصية أو لوجو)
    avatar: {
        type: String,
        default: '',
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    resetPasswordOtp: { type: String },
    resetPasswordExpire: { type: Date },

    // بيانات خاصة بالسائق فقط
    licenseImage: {
        type: String,
        default: '',
    },
    availability: {
        timeSlot: { type: String },
        customTime: { type: String, default: "" },
        days: { type: [String] },
        frequency: {
            type: String,
            enum: ['All Weekdays', 'All Weekend', 'Any Day'],
        },
    },
}, { timestamps: true });

// Middleware (Pre-save) لضمان التلقائية في قاعدة البيانات
userSchema.pre('save', function (next) {
    if (this.role === 'Donor') {
        this.donorType = 'Donor';
        this.receiverType = ""; // تنظيف الحقل الآخر
    } else if (this.role === 'Receiver') {
        this.receiverType = 'Receiver';
        this.donorType = ""; // تنظيف الحقل الآخر
    }
    next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;