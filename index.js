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

// Routes
const authRouter = require('./routes/auth');
const forgotPasswordRouter = require('./routes/forgot_password');
const donationRoutes = require('./routes/donationRoutes');

app.use('/auth', authRouter);
app.use('/auth/forgot-password', forgotPasswordRouter);
app.use('/api/donations', donationRoutes);

// MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB Connected successfully...'))
.catch(err => console.error('MongoDB connection error:', err));

// Server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});