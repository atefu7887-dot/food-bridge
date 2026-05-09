const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
    donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true },
    description: { type: String, required: true },
    foodType: { 
        type: String, 
        enum: ['Cooked Food-Veg & NonVeg', 'Veg Only', 'NonVeg Only'],
        default: 'Cooked Food-Veg & NonVeg'
    },
    quantity: { type: Number, required: true },
    breakdown: {
        veg: { type: Number, default: 0 },
        nonVeg: { type: Number, default: 0 }
    },
    images: { type: [String], default: [] },
    location: { type: String, required: true },
    contactPhone: { type: String },
    expiryDate: { type: Date },      
    expiryTime: { type: String },    
    isQualityAssured: { type: Boolean, default: false }, 

    // 📍 إحداثيات السائق للتتبع اللحظي
    driverLocation: {
        lat: { type: Number, default: 30.5852 }, // الزقازيق
        lng: { type: Number, default: 31.5035 }
    },

    // 🕒 سجل المواعيد
    timeline: {
        assignedAt: { type: Date },
        pickedUpAt: { type: Date },
        deliveredAt: { type: Date }
    },

    // 🆕 حقل جديد لمعرفة حالة استجابة السائق
    driverRequestStatus: {
        type: String,
        enum: ['None', 'Pending', 'Accepted', 'Rejected'],
        default: 'None'
    },

    status: {
        type: String,
        enum: ['Pending', 'Pending Approval', 'Accepted', 'Assigned', 'Picked Up', 'Delivered'],
        default: 'Pending',
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true }, 
    toObject: { virtuals: true }
});

// Virtual لحساب قيمة شريط التقدم
donationSchema.virtual('progressValue').get(function() {
    const statusMap = {
        'Pending': 0.2,    
        'Accepted': 0.4,   
        'Assigned': 0.6,   
        'Picked Up': 0.8,  
        'Delivered': 1.0   
    };
    return statusMap[this.status] || 0.1;
});

// 🆕 Virtual لتزويد المستلم برسالة نصية عن حالة السائق
donationSchema.virtual('driverStatusMessage').get(function() {
    if (this.driverRequestStatus === 'Pending') return 'جاري البحث عن سائق...';
    if (this.driverRequestStatus === 'Accepted') return 'تم قبول طلبك بواسطة السائق';
    if (this.driverRequestStatus === 'Rejected') return 'رفض السائق الطلب، جاري البحث عن بديل';
    return 'لم يتم تحديد سائق بعد';
});

const Donation = mongoose.model('Donation', donationSchema);
module.exports = Donation;