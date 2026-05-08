const mongoose = require('mongoose'); // <--- السطر ده هو اللي ناقصك!

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
    
    // --- الإضافات الجديدة ---
    expiryDate: { type: Date },      
    expiryTime: { type: String },    
    isQualityAssured: { type: Boolean, default: false }, 
    
    status: {
        type: String,
        enum: ['Pending', 'Assigned', 'Picked Up', 'Delivered', 'Accepted'],
        default: 'Pending',
    }
}, { timestamps: true });

const Donation = mongoose.model('Donation', donationSchema);
module.exports = Donation;