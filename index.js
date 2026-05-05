const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');


dotenv.config();
const app = express();


app.use(express.json());
app.use(cors());


const authRouter = require('./routes/auth');
const donationsRouter = require('./routes/donations');
const forgotPasswordRouter = require('./routes/forgot_password');
const messagesRouter = require('./routes/messages');
const notificationsRouter = require('./routes/notifications');
const receiversRouter = require('./routes/receiver');
const volunteerRouter = require('./routes/volunteer');
const donorRouter = require('./routes/donations'); 


app.use('/auth', authRouter);
app.use('/api/donations', donationsRouter);
app.use('/auth/forgot-password', forgotPasswordRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/receiver', receiversRouter);
app.use('/api/volunteer', volunteerRouter);
app.use('/api/donor', donorRouter);


mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB Connected successfully...'))
.catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});