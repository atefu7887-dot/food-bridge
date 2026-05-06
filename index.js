const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');


dotenv.config();
const app = express();


app.use(express.json());
app.use(cors());


const authRouter = require('./routes/auth');
const forgotPasswordRouter = require('./routes/forgot_password');
const donationRouter = require('./routes/donation');


app.use('/auth', authRouter);

app.use('/auth/forgot-password', forgotPasswordRouter);
app.use('/api/donation', donationRouter);


mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB Connected successfully...'))
.catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});