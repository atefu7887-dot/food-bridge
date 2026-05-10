const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['Donor', 'Receiver', 'Driver'], required: true },
    donorType: { type: String, default: "" },
    receiverType: { type: String, default: "" },
    businessName: { type: String, default: "" },
    address: { type: String, default: "" },
    avatar: { type: String, default: "" },
    licenseImage: { type: String, default: "" },
    isVerified: { type: Boolean, default: false },
    availability: { type: mongoose.Schema.Types.ObjectId, ref: 'Availability', default: null }
}, { timestamps: true });

// الإصلاح هنا: إضافة next لضمان استمرار العملية
userSchema.pre('save', function (next) {
    if (this.role === 'Donor') {
        this.donorType = this.donorType || 'Donor';
        this.receiverType = '';
    } else if (this.role === 'Receiver') {
        this.receiverType = this.receiverType || 'Receiver';
        this.donorType = '';
    } else if (this.role === 'Driver') {
        this.businessName = '';
    }
    next(); // ضروري جداً
});

userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

module.exports = mongoose.model('User', userSchema);