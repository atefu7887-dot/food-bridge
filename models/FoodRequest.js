const mongoose = require('mongoose');

const foodRequestSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true,
    },
    foodType: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    foodQuantity: {
        type: String,
        required: true,
    },
    requestMeal: {
        veg: {
            selected: { type: Boolean, default: false },
            quantity: { type: Number, default: 0 },
        },
        nonVeg: {
            selected: { type: Boolean, default: false },
            quantity: { type: Number, default: 0 },
        }
    },
    contactDetails: {
        phone: {
            type: String,
            required: true,
        },
        address: {
            type: String,
            required: true,
        }
    },
    status: {
        type: String,
        enum: ['Pending', 'In Progress', 'Completed'],
        default: 'Pending',
    }
}, { timestamps: true });

const FoodRequest = mongoose.model('FoodRequest', foodRequestSchema);
module.exports = FoodRequest;