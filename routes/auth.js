const express = require('express');
const router = express.Router();
const User = require('../models/User');

// --- تسجيل الدخول (Login) ---
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "Email not registered" });
        }

        if (user.password !== password) {
            return res.status(400).json({ message: "Incorrect password"});
        }

        res.status(200).json({
            message: "Login successful! ✅",
            user: { 
                username: user.username, 
                email: user.email, 
                role: user.role 
            }
        });

    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});


// --- إنشاء حساب (Register) ---
router.post('/register', async (req, res) => {
  try {
    const { 
      username, 
      email, 
      phone, 
      password, 
      role, 
      donorType, 
      businessName, 
      fullName, 
      address,
      commercialRegisterNumber, 
      businessPhone,           
      photos 
    } = req.body;

    if (!username || !email || !phone || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be filled'
      });
    }

   
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

  
    const hashedPassword = await bcrypt.hash(password, 10);

   
    let userData = {
      username,
      email,
      phone,
      password: hashedPassword,
      role,
    };

    
    if (role === 'Donor') {
      userData.donorType = donorType;
      userData.address = address;
      userData.photos = photos || [];

     
      if (donorType === 'Restaurant' || donorType === 'Bakery') {
        userData.businessName = businessName;
        userData.commercialRegisterNumber = commercialRegisterNumber; 
        userData.businessPhone = businessPhone; 
      } else if (donorType === 'Individual') {
        userData.fullName = fullName;
      }
    }

    const newUser = new User(userData);
    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'Account Created Successfully!',
      user: newUser
    });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
});

module.exports = router;