const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const User = require('../models/User');
const Availability = require('../models/Availability');

const router = express.Router();

//////////////////////////////////////////////////
// Multer Config
//////////////////////////////////////////////////

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

const uploadFields = upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'licenseImage', maxCount: 1 }
]);

//////////////////////////////////////////////////
// Upload To ImgBB
//////////////////////////////////////////////////

async function uploadToImgBB(buffer) {

    const apiKey = e588c3e5bae57852fb441c6f15619cad;

    const formData = new FormData();

    formData.append('image', buffer.toString('base64'));

    try {

        const response = await axios.post(
            `https://api.imgbb.com/1/upload?key=${apiKey}`,
            formData,
            {
                headers: formData.getHeaders()
            }
        );

        return response.data.data.url;

    } catch (error) {

        console.log('ImgBB Error:', error.message);

        throw new Error('Image upload failed');
    }
}

//////////////////////////////////////////////////
// REGISTER
//////////////////////////////////////////////////

router.post('/register', uploadFields, async (req, res) => {

    try {

        const {
            username,
            email,
            phone,
            password,
            role,
            businessName,
            address,
            availability
        } = req.body;

        //////////////////////////////////////////////////
        // Validate Required Fields
        //////////////////////////////////////////////////

        if (!username || !email || !phone || !password || !role) {

            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        //////////////////////////////////////////////////
        // Role Validation
        //////////////////////////////////////////////////

        const roleMap = {
            driver: 'Driver',
            donor: 'Donor',
            receiver: 'Receiver'
        };

        const finalRole = role
            ? roleMap[role.toLowerCase()] || role
            : null;

        if (!['Donor', 'Receiver', 'Driver'].includes(finalRole)) {

            return res.status(400).json({
                success: false,
                message: 'Invalid role'
            });
        }

        //////////////////////////////////////////////////
        // Check Existing Email
        //////////////////////////////////////////////////

        const existingUser = await User.findOne({
            email: email.toLowerCase().trim()
        });

        if (existingUser) {

            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        //////////////////////////////////////////////////
        // Hash Password
        //////////////////////////////////////////////////

        const hashedPassword = await bcrypt.hash(password, 10);

        //////////////////////////////////////////////////
        // User Data
        //////////////////////////////////////////////////

        let userData = {

            username: username.trim(),

            email: email.toLowerCase().trim(),

            phone: phone.trim(),

            password: hashedPassword,

            role: finalRole,

            address: address || "",

            avatar: "",

            licenseImage: "",

            availability: null
        };

        //////////////////////////////////////////////////
        // Upload Images
        //////////////////////////////////////////////////

        if (req.files) {

            try {

                if (req.files.avatar?.[0]) {

                    userData.avatar = await uploadToImgBB(
                        req.files.avatar[0].buffer
                    );
                }

                if (req.files.licenseImage?.[0]) {

                    userData.licenseImage = await uploadToImgBB(
                        req.files.licenseImage[0].buffer
                    );
                }

            } catch (imgError) {

                console.log('Image Upload Error:', imgError.message);
            }
        }

        //////////////////////////////////////////////////
        // Driver Availability
        //////////////////////////////////////////////////

        if (finalRole === 'Driver') {

            userData.businessName = '';

            if (availability) {

                try {

                    const parsedAvailability =
                        typeof availability === 'string'
                            ? JSON.parse(availability)
                            : availability;

                    const availabilityDoc =
                        await Availability.create({

                            timeSlot:
                                parsedAvailability.timeSlot || "",

                            customTime:
                                parsedAvailability.customTime || "",

                            days:
                                parsedAvailability.days || [],

                            frequency:
                                parsedAvailability.frequency || ""
                        });

                    userData.availability =
                        availabilityDoc._id;

                } catch (error) {

                    return res.status(400).json({
                        success: false,
                        message: 'Invalid availability format'
                    });
                }
            }

        } else {

            userData.businessName =
                businessName || username;
        }

        //////////////////////////////////////////////////
        // Create User
        //////////////////////////////////////////////////

        const newUser = await User.create(userData);

        //////////////////////////////////////////////////
        // Response
        //////////////////////////////////////////////////

        return res.status(201).json({
            success: true,
            message: 'User created successfully 🎉',
            user: newUser
        });

    } catch (error) {

        console.log('REGISTER ERROR:', error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

//////////////////////////////////////////////////
// LOGIN
//////////////////////////////////////////////////

router.post('/login', async (req, res) => {

    try {

        const { email, password } = req.body;

        //////////////////////////////////////////////////
        // Validate
        //////////////////////////////////////////////////

        if (!email || !password) {

            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        //////////////////////////////////////////////////
        // Find User
        //////////////////////////////////////////////////

        const user = await User.findOne({
            email: email.toLowerCase().trim()
        })
        .select('+password')
        .populate('availability');

        if (!user) {

            return res.status(400).json({
                success: false,
                message: 'Email not found'
            });
        }

        //////////////////////////////////////////////////
        // Compare Password
        //////////////////////////////////////////////////

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {

            return res.status(400).json({
                success: false,
                message: 'Wrong password'
            });
        }

        //////////////////////////////////////////////////
        // Remove Password
        //////////////////////////////////////////////////

        const userObj = user.toObject();

        delete userObj.password;

        //////////////////////////////////////////////////
        // Success
        //////////////////////////////////////////////////

        return res.status(200).json({
            success: true,
            message: 'Login successful ✅',
            user: userObj
        });

    } catch (error) {

        console.log('LOGIN ERROR:', error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

module.exports = router;