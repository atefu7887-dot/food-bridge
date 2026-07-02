const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// شحن متغيرات البيئة
dotenv.config();

const app = express();

// --- MIDDLEWARES ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// --- ROUTES IMPORTS ---
const authRouter = require('./routes/auth');
const forgotPasswordRouter = require('./routes/forgot_password'); 
const donationRoutes = require('./routes/donationRoutes');
const chatRoutes = require('./routes/chatRoutes');

// --- ROUTES CONFIGURATION ---
// تم دمج راوتر استعادة كلمة المرور تحت مسار '/auth' 
// ليتطابق مع الـ baseUrl في الفلاتر ويمنع خطأ الـ 404 على Vercel
app.use('/auth', authRouter);
app.use('/auth', forgotPasswordRouter); 

app.use('/api/donations', donationRoutes);
app.use('/api/chat', chatRoutes);

// --- BASE ENDPOINT FOR TESTING ---
app.get('/', (req, res) => {
    res.status(200).json({ success: true, message: "FoodBridge API is running smoothly 🚀" });
});

// --- MONGOOSE CONNECTION ---
mongoose.connect(process.env.MONGO_URI, {
    connectTimeoutMS: 10000,
})
.then(() => console.log('✅ MongoDB Connected successfully...'))
.catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
});

// --- SERVER LISTEN ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});