const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['Donor', 'Receiver', 'Driver'], // تأكد أن الحرف الأول كبير
        required: true 
    },
    // جعلنا هذه الحقول مرنة جداً لتجنب الـ Server Error
    donorType: { type: String, default: "" },
    receiverType: { type: String, default: "" },
    businessName: { type: String, default: "" }, // حذفنا الـ Validator الصعب هنا
    address: { type: String, default: "" },
    avatar: { type: String, default: "" },
    licenseImage: { type: String, default: "" },
    isVerified: { type: Boolean, default: false },
    availability: {
        timeSlot: String,
        customTime: String,
        days: [String],
        frequency: String
    }
}, { timestamps: true });

// هذا الجزء يضمن ملء البيانات تلقائياً قبل الحفظ
userSchema.pre('save', function (next) {
    if (this.role === 'Donor') this.donorType = 'Donor';
    if (this.role === 'Receiver') this.receiverType = 'Receiver';
    next();
});

module.exports = mongoose.model('User', userSchema);