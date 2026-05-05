const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config(); 

const app = express();

// --- PORT ---
const PORT = process.env.PORT || 3000; 

app.use(express.json());

const authRoutes = require('./routes/auth');
const forgetRouter = require('./routes/forgot_password');
const receiverRoutes = require('./routes/receiver');
const donorRoutes = require('./routes/donor');
const volunteerRoutes = require('./routes/volunteer');
const notificationRoutes = require('./routes/notifications');
const messageRoutes = require('./routes/messages');


mongoose.connect(process.env.MONGO_URI);

app.use('/auth', authRoutes);
app.use('/auth', forgetRouter);
app.use('/api/receiver', receiverRoutes);
app.use('/api/donor', donorRoutes);
app.use('/api/volunteer', volunteerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);

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