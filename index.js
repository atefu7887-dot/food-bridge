const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// استدعاء المسارات (Routes)
const authRouter = require('./routes/auth');
const donationsRouter = require('./routes/donations');
const forgotPasswordRouter = require('./routes/forgot_password');
const messagesRouter = require('./routes/messages');
const notificationsRouter = require('./routes/notifications');
const receiversRouter = require('./routes/receiver');
const volunteerRouter = require('./routes/volunteer');
const donorRouter = require('./routes/donations'); 

// تعريف المسارات
app.use('/api/auth', authRouter);
app.use('/api/donations', donationsRouter);
app.use('/api/forgot-password', forgotPasswordRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/receiver', receiversRouter);
app.use('/api/volunteer', volunteerRouter);
app.use('/api/donor', donorRouter);

// إدارة اتصال قاعدة البيانات لبيئة Serverless (Vercel)
let isConnected = false;

const connectDB = async () => {
    if (isConnected) {
        console.log('=> استخدام الاتصال الحالي بقاعدة البيانات.');
        return;
    }

    try {
        await mongoose.connect(process.env.MONGO_URI);
        isConnected = true;
        console.log('=> تم الاتصال بقاعدة البيانات بنجاح.');
    } catch (error) {
        console.error('خطأ في الاتصال بقاعدة البيانات:', error);
        throw error;
    }
};

// Middleware للتحقق من الاتصال قبل معالجة أي طلب (Request)
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        res.status(500).json({ message: "Server database connection error" });
    }
});

const PORT = process.env.PORT || 3000;

// تشغيل الخادم محلياً
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// تصدير التطبيق ليعمل بسلاسة على Vercel
module.exports = app;