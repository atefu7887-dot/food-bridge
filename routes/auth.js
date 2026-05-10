const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const User = require('../models/User');
const Availability = require('../models/Availability');

const router = express.Router();

//////////////////////////////////////////////////
// MULTER
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
// IMGBB
//////////////////////////////////////////////////

async function uploadToImgBB(buffer) {

    if (!buffer) return "";

    const apiKey =
        process.env.IMGBB_API_KEY ||
        "e588c3e5bae57852fb441c6f15619cad";

    const formData = new FormData();

    formData.append(
        'image',
        buffer.toString('base64')
    );

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

        console.log(
            "IMGBB ERROR:",
            error.message
        );

        return "";
    }
}

//////////////////////////////////////////////////
// REGISTER
//////////////////////////////////////////////////

router.post(
    '/register',

    (req, res, next) => {

        uploadFields(req, res, function (err) {

            if (err) {

                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }

            next();
        });
    },

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
            // VALIDATION
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
                    message: 'Missing required fields'
                });
            }

            //////////////////////////////////////////////////
            // ROLE
            //////////////////////////////////////////////////

            const roleMap = {
                donor: 'Donor',
                receiver: 'Receiver',
                driver: 'Driver'
            };

            const finalRole =
                roleMap[
                    role.toLowerCase()
                ] || role;

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

              businessName: finalRole === 'Driver' ? '' : (businessName ? businessName.trim() : ""),

                avatar: "",

                licenseImage: "",

                availability: null
            };

            //////////////////////////////////////////////////
            // UPLOAD IMAGES
            //////////////////////////////////////////////////

            if (req.files) {

                if (
                    req.files.avatar?.[0]
                ) {

                    userData.avatar =
                        await uploadToImgBB(
                            req.files.avatar[0]
                                .buffer
                        );
                }

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
            }

            //////////////////////////////////////////////////
            // DRIVER AVAILABILITY
            //////////////////////////////////////////////////

            if (
                finalRole === 'Driver' &&
                availability
            ) {

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

                } catch (err) {

                    return res.status(400).json({
                        success: false,
                        message:
                            'Invalid availability format'
                    });
                }
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

            console.log(
                "REGISTER ERROR:",
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

            if (
                !email ||
                !password
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        'Email and password required'
                });
            }

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

            const userObj =
                user.toObject();

            delete userObj.password;

            return res.status(200).json({
                success: true,
                message:
                    'Login successful ✅',
                user: userObj
            });

        } catch (error) {

            console.log(
                "LOGIN ERROR:",
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
// UPDATE PROFILE
//////////////////////////////////////////////////

router.put(
    '/update-profile/:id', // نستخدم PUT للتعديل ونرسل معرف المستخدم في الرابط
    (req, res, next) => {
        uploadFields(req, res, function (err) {
            if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            next();
        });
    },
    async (req, res) => {
        try {
            const userId = req.params.id;
            const {
                username,
                phone,
                businessName,
                address,
                role // عادة لا يتغير الدور ولكن نضعه للاحتياط
            } = req.body;

            // 1. البحث عن المستخدم الحالي
            let user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // 2. تجهيز البيانات الجديدة للتحديث
            let updateData = {
                username: username ? username.trim() : user.username,
                phone: phone ? phone.trim() : user.phone,
                address: address || user.address,
                businessName: user.role === 'Driver' ? '' : (businessName ? businessName.trim() : user.businessName)
            };

            // 3. تحديث الصور إذا تم رفع ملفات جديدة
            if (req.files) {
                if (req.files.avatar?.[0]) {
                    updateData.avatar = await uploadToImgBB(req.files.avatar[0].buffer);
                }
                if (req.files.licenseImage?.[0]) {
                    updateData.licenseImage = await uploadToImgBB(req.files.licenseImage[0].buffer);
                }
            }

            // 4. تنفيذ التحديث في قاعدة البيانات
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $set: updateData },
                { new: true, runValidators: true } // new: true ليرجع البيانات بعد التعديل
            ).populate('availability');

            return res.status(200).json({
                success: true,
                message: 'Profile updated successfully ✅',
                user: updatedUser
            });

        } catch (error) {
            console.log("UPDATE ERROR:", error);
            return res.status(500).json({
                success: false,
                message: 'Error updating profile',
                error: error.message
            });
        }
    }
);

module.exports = router;