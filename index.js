const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config(); 

const app = express();

// --- PORT ---
const PORT = process.env.PORT || 3000; 


app.use(express.json());

const authRoutes = require('./routes/auth');

mongoose.connect(process.env.MONGO_URI);

app.use('/auth', authRoutes);

mongoose.connection.on('connected', () => {
    console.log('🟢 Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('🔴 MongoDB connection error:', err);
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});