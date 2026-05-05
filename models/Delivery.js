const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
    volunteer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    request: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Request',
        required: true
    },
    donor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    foodQuantity: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    
    status: {
        type: String,
        enum: ['Assigned', 'Picked Up', 'Delivered', 'Cancelled'],
        default: 'Assigned'
    }
}, { timestamps: true });

module.exports = mongoose.model('Delivery', deliverySchema);