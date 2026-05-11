const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// --- 1. استيراد الراوتر الخاص بالشات ---
const authRouter = require('./routes/auth');
const forgotPasswordRouter = require('./routes/forgot_password');
const donationRoutes = require('./routes/donationRoutes');
const chatRoutes = require('./routes/chatRoutes'); // أضف هذا السطر

// --- 2. تعريف المسارات (Routes) ---
app.use('/auth', authRouter);
app.use('/auth/forgot-password', forgotPasswordRouter);
app.use('/api/donations', donationRoutes);
app.use('/api/chat', chatRoutes); // أضف هذا السطر لاستدعاء الشات

// الاتصال بـ MongoDB
mongoose.connect(process.env.MONGO_URI, {
    connectTimeoutMS: 10000,
})
.then(() => console.log('✅ MongoDB Connected successfully...'))
.catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));