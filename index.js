const express = require('express');
const mongoose = require('mongoose');

const app = express();

app.use(express.json());

// routes
const authRoutes = require('./routes/auth');
const forgetRouter = require('./routes/forgot_password');
const receiversRouter = require('./routes/receivers');
const donorRouter = require('./routes/donor');

// routes usage
app.use('/auth', authRoutes);
app.use('/auth', forgetRouter);
app.use('/api', receiversRouter);
app.use('/api', donorRouter);

// اتصال الداتا بيز (بدون تكرار)
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    isConnected = true;
    console.log("🟢 MongoDB Connected");
  } catch (err) {
    console.error("🔴 DB Error:", err);
  }
};

module.exports = { app, connectDB };