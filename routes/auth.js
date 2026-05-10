const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const User = require('../models/User');
const Availability = require('../models/Availability');

const router = express.Router();

//////////////////////////////////////////////////
// MULTER CONFIG
//////////////////////////////////////////////////

const upload = multer({

    storage: multer.memoryStorage(),

    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

//////////////////////////////////////////////////
// ALLOWED FILES
//////////////////////////////////////////////////

const uploadFields = upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'licenseImage', maxCount: 1 }
]);

//////////////////////////////////////////////////
// IMGBB UPLOAD
//////////////////////////////////////////////////

async function uploadToImgBB(buffer) {

    const apiKey =
        "e588c3e5bae57852fb441c6f15619cad";

    const formData = new FormData();

    formData.append(
        'image',
        buffer.toString('base64')
    );

    try {

        const res = await axios.post(
            `https://api.imgbb.com/1/upload?key=${apiKey}`,
            formData,
            {
                headers: formData.getHeaders()
            }
        );

        return res.data.data.url;

    } catch (err) {

        console.error(
            "ImgBB Error:",
            err.message
        );

        throw new Error(
            "Image upload failed"
        );
    }
}

//////////////////////////////////////////////////
// REGISTER
//////////////////////////////////////////////////

router.post(
    '/register',
    uploadFields,
    async (req, res) => {

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
            // REQUIRED FIELDS
            //////////////////////////////////////////////////

            if (
                !username ||
                !email ||
                !phone ||
                !password ||
                !role
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        'Missing required fields'
                });
            }

            //////////////////////////////////////////////////
            // ROLE
            //////////////////////////////////////////////////

            const roleMap = {
                driver: 'Driver',
                donor: 'Donor',
                receiver: 'Receiver'
            };

            const finalRole =
                roleMap[
                    role?.toLowerCase()
                ] || role;

            if (
                ![
                    'Driver',
                    'Donor',
                    'Receiver'
                ].includes(finalRole)
            ) {

                return res.status(400).json({
                    success: false,
                    message: 'Invalid role'
                });
            }

            //////////////////////////////////////////////////
            // CHECK EMAIL
            //////////////////////////////////////////////////

            const existingUser =
                await User.findOne({
                    email:
                        email
                            .toLowerCase()
                            .trim()
                });

            if (existingUser) {

                return res.status(400).json({
                    success: false,
                    message:
                        'Email already exists'
                });
            }

            //////////////////////////////////////////////////
            // HASH PASSWORD
            //////////////////////////////////////////////////

            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );

            //////////////////////////////////////////////////
            // USER DATA
            //////////////////////////////////////////////////

            let userData = {

                username:
                    username.trim(),

                email:
                    email
                        .toLowerCase()
                        .trim(),

                phone:
                    phone.trim(),

                password:
                    hashedPassword,

                role:
                    finalRole,

                address:
                    address || "",

                businessName:
                    businessName || "",

                avatar: "",

                licenseImage: "",

                availability: null
            };

            //////////////////////////////////////////////////
            // IMAGE UPLOAD
            //////////////////////////////////////////////////

            if (req.files) {

                try {

                    // Avatar
                    if (
                        req.files.avatar?.[0]
                    ) {

                        userData.avatar =
                            await uploadToImgBB(
                                req.files.avatar[0]
                                    .buffer
                            );
                    }

                    // License Image
                    if (
                        req.files
                            .licenseImage?.[0]
                    ) {

                        userData.licenseImage =
                            await uploadToImgBB(
                                req.files
                                    .licenseImage[0]
                                    .buffer
                            );
                    }

                } catch (imgErr) {

                    console.log(
                        'Image upload failed:',
                        imgErr.message
                    );
                }
            }

            //////////////////////////////////////////////////
            // DRIVER AVAILABILITY
            //////////////////////////////////////////////////

            if (
                finalRole === 'Driver'
            ) {

                userData.businessName =
                    '';

                if (availability) {

                    try {

                        const parsedAvailability =
                            typeof availability ===
                            'string'
                                ? JSON.parse(
                                      availability
                                  )
                                : availability;

                        const availabilityDoc =
                            await Availability.create({

                                timeSlot:
                                    parsedAvailability.timeSlot ||
                                    "",

                                customTime:
                                    parsedAvailability.customTime ||
                                    "",

                                days:
                                    parsedAvailability.days ||
                                    [],

                                frequency:
                                    parsedAvailability.frequency ||
                                    ""
                            });

                        userData.availability =
                            availabilityDoc._id;

                    } catch (e) {

                        return res.status(400).json({
                            success: false,
                            message:
                                'Invalid availability format'
                        });
                    }
                }

            } else {

                userData.businessName =
                    businessName ||
                    username;
            }

            //////////////////////////////////////////////////
            // CREATE USER
            //////////////////////////////////////////////////

            const newUser =
                await User.create(
                    userData
                );

            //////////////////////////////////////////////////
            // RESPONSE
            //////////////////////////////////////////////////

            return res.status(201).json({
                success: true,
                message:
                    'User created successfully 🎉',
                user: newUser
            });

        } catch (error) {

            console.error(
                'REGISTER ERROR:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Internal server error',
                error:
                    error.message
            });
        }
    }
);

//////////////////////////////////////////////////
// LOGIN
//////////////////////////////////////////////////

router.post(
    '/login',
    async (req, res) => {

        try {

            const {
                email,
                password
            } = req.body;

            //////////////////////////////////////////////////
            // VALIDATION
            //////////////////////////////////////////////////

            if (
                !email ||
                !password
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        'Email and password are required'
                });
            }

            //////////////////////////////////////////////////
            // FIND USER
            //////////////////////////////////////////////////

            const user =
                await User.findOne({

                    email:
                        email
                            .toLowerCase()
                            .trim()

                })
                .select('+password')
                .populate(
                    'availability'
                );

            if (!user) {

                return res.status(400).json({
                    success: false,
                    message:
                        'Email not found'
                });
            }

            //////////////////////////////////////////////////
            // CHECK PASSWORD
            //////////////////////////////////////////////////

            const isMatch =
                await bcrypt.compare(
                    password,
                    user.password
                );

            if (!isMatch) {

                return res.status(400).json({
                    success: false,
                    message:
                        'Wrong password'
                });
            }

            //////////////////////////////////////////////////
            // REMOVE PASSWORD
            //////////////////////////////////////////////////

            const userObj =
                user.toObject();

            delete userObj.password;

            //////////////////////////////////////////////////
            // SUCCESS
            //////////////////////////////////////////////////

            return res.status(200).json({
                success: true,
                message:
                    'Login successful ✅',
                user: userObj
            });

        } catch (error) {

            console.log(
                'LOGIN ERROR:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Internal server error',
                error:
                    error.message
            });
        }
    }
);

module.exports = router;