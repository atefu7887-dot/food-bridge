const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
    donor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    typeOfFood: {
        type: String, // مثل "Cooked Food-Veg & NonVeg"
        required: true,
    },
    meals: {
        veg: {
            selected: { type: Boolean, default: false },
            quantity: { type: Number, default: 0 },
        },
        nonVeg: {
            selected: { type: Boolean, default: false },
            quantity: { type: Number, default: 0 },
        }
    },
    photos: {
        type: [String],
        default: [],
    },
    expirationDate: {
        type: String, // مثل "15 feb 2023"
        required: true,
    },
    expirationTime: {
        type: String, // مثل "10:00 PM"
        required: true,
    },
    hygieneAssurance: {
        type: Boolean,
        required: true, // لضمان الجودة والنظافة
    },
}, { timestamps: true });

const Donation = mongoose.model('Donation', donationSchema);
module.exports = Donation;