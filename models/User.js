const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({
    timeSlot: { type: String, default: "" },
    customTime: { type: String, default: "" },
    days: [{ type: String }],
    frequency: { type: String, default: "" }
}, { _id: false });

const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        trim: true 
    },

    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true,
        trim: true 
    },

    phone: { 
        type: String, 
        required: true, 
        trim: true 
    },

    password: { 
        type: String, 
        required: true,
        select: false // 🔐 يمنع رجوع الباسورد
    },

    role: { 
        type: String, 
        enum: ['Donor', 'Receiver', 'Driver'],
        required: true 
    },

    donorType: { 
        type: String, 
        default: "" 
    },

    receiverType: { 
        type: String, 
        default: "" 
    },

    businessName: { 
        type: String, 
        default: "" 
    },

    address: { 
        type: String, 
        default: "" 
    },

    avatar: { 
        type: String, 
        default: "" 
    },

    licenseImage: { 
        type: String, 
        default: "" 
    },

    isVerified: { 
        type: Boolean, 
        default: false 
    },

    availability: {
        type: availabilitySchema,
        default: () => ({})
    }

}, { 
    timestamps: true 
});


// ✅ Middleware بدون next (حل المشكلة)
userSchema.pre('save', function () {
    if (this.role === 'Donor') {
        this.donorType = 'Donor';
        this.receiverType = '';
    }

    if (this.role === 'Receiver') {
        this.receiverType = 'Receiver';
        this.donorType = '';
    }

    if (this.role === 'Driver') {
        this.businessName = "";
    }
});


// 🔐 حذف الباسورد من أي response
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};


// ⚡ تحسين البحث
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);