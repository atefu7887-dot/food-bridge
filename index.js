const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const authRouter = require('./routes/auth');
const forgotPasswordRouter = require('./routes/forgot_password'); // الملف المنفصل
const donationRoutes = require('./routes/donationRoutes');
const chatRoutes = require('./routes/chatRoutes');

// تم تعديل المسار هنا لتجنب التعارض (Conflict)
app.use('/auth', authRouter);
app.use('/password', forgotPasswordRouter); 

app.use('/api/donations', donationRoutes);
app.use('/api/chat', chatRoutes);

mongoose.connect(process.env.MONGO_URI, {
    connectTimeoutMS: 10000,
})
.then(() => console.log('✅ MongoDB Connected successfully...'))
.catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});