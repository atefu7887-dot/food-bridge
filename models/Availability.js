const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({

    timeSlot: {
        type: String,
        default: ""
    },

    customTime: {
        type: String,
        default: ""
    },

    days: [
        {
            type: String
        }
    ],

    frequency: {
        type: String,
        default: ""
    }

},
{
    timestamps: true
});

module.exports = mongoose.model('Availability', availabilitySchema);