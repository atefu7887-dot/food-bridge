const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config(); 

const app = express();

// --- PORT ---
const PORT = process.env.PORT || 3000; 

app.use(express.json());

// --- استدعاء المسارات (Routes) ---
const authRoutes = require('./routes/auth');
const forgetRouter = require('./routes/forgot_password');
const receiversRouter = require('./routes/receivers');
const donorRouter = require('./routes/donor');

// تم إضافة مسار الطلبات الجديد هنا
const requestRouter = require('./routes/requestRoutes'); 

// --- الاتصال بقاعدة البيانات ---
mongoose.connect(process.env.MONGO_URI);

// --- تفعيل المسارات (Middleware) ---
app.use('/auth', authRoutes);
app.use('/auth', forgetRouter);
app.use('/api', receiversRouter);
app.use('/api', donorRouter);

// تم تفعيل مسار الطلبات الجديد هنا
app.use('/api', requestRouter); 

// --- أحداث قاعدة البيانات ---
mongoose.connection.on('connected', () => {
    console.log('🟢 Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('🔴 MongoDB connection error:', err);
});

// --- بدء الخادم ---
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});

module.exports = app;