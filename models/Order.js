const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    listingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DonationListing',
        required: true,
    },
    donorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null, // يتم تعيينه عندما يقبل السائق الطلب
    },
    status: {
        type: String,
        enum: ['Pending', 'Driver Assigned', 'Picked Up', 'Delivered'],
        default: 'Pending',
    }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;