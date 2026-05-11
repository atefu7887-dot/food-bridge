const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// إعداد متغيرات البيئة
dotenv.config();

const app = express();

// //* =============================================================
// //* ! 1. MIDDLEWARES (يجب أن تسبق المسارات دائماً)
// //* =============================================================
app.use(express.json()); // لقراءة بيانات JSON المرسلة من Flutter
app.use(express.urlencoded({ extended: true }));
app.use(cors()); // للسماح بالاتصال من تطبيقات خارجية

// //* =============================================================
// //* ! 2. ROUTES IMPORT (استيراد الملفات)
// //* =============================================================
const authRouter = require('./routes/auth');
const forgotPasswordRouter = require('./routes/forgot_password');
const donationRoutes = require('./routes/donationRoutes');
const chatRoutes = require('./routes/chatRoutes');

// //* =============================================================
// //* ! 3. ROUTES DEFINITION (تعريف المسارات)
// //* =============================================================

/** * ? تم حل مشكلة الـ 404 هنا:
 * جعلنا 'forgotPasswordRouter' يعمل تحت '/auth' مباشرة.
 * الرابط الصحيح في Flutter و Thunder Client سيكون الآن:
 * http://localhost:3000/auth/forgot-password
 */
app.use('/auth', authRouter); 
app.use('/auth', forgotPasswordRouter); 

app.use('/api/donations', donationRoutes);
app.use('/api/chat', chatRoutes);

// //* =============================================================
// //* ! 4. DATABASE CONNECTION (الاتصال بقاعدة البيانات)
// //* =============================================================
mongoose.connect(process.env.MONGO_URI, {
    connectTimeoutMS: 10000,
})
.then(() => console.log('✅ MongoDB Connected successfully...'))
.catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
});

// //* =============================================================
// //* ! 5. SERVER START
// //* =============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);

});