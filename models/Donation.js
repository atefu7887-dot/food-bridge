const donationSchema = new mongoose.Schema({
    // ... الحقول القديمة كما هي
    donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    title: { type: String, required: true },
    description: { type: String, required: true },
    foodType: { 
        type: String, 
        enum: ['Cooked Food-Veg & NonVeg', 'Veg Only', 'NonVeg Only', 'Other'],
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
    
    // --- الإضافات الجديدة لتطابق الصور ---
    expiryDate: { type: Date },      // Expiration Date
    expiryTime: { type: String },    // Expiration Time (مثلاً "10:00 PM")
    isQualityAssured: { type: Boolean, default: false }, // حقل التأكيد (I assure...)
    
    status: {
        type: String,
        enum: ['Pending', 'Assigned', 'Picked Up', 'Delivered', 'Accepted'],
        default: 'Pending',
    }
}, { timestamps: true });