const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
    donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // الجمعية
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },   // السائق المختار
    itemDetails: { type: String, required: true },
    quantity: { type: Number, required: true },
    location: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['Pending', 'Accepted', 'Assigned', 'Picked Up', 'Delivered'], 
        default: 'Pending' 
    },
    acceptedAt: { type: Date }, // وقت موافقة الجمعية
    estimatedArrivalTime: { type: String }, // وقت وصول السائق المتوقع
    expiryDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Donation', donationSchema);