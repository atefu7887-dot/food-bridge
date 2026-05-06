const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const DonationListing = require('../models/DonationListing');
const User = require('../models/User');

const router = express.Router();

// إعداد Multer لتخزين الملفات في الذاكرة
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB كحد أقصى
});

// دالة رفع الصور إلى ImgBB (مطابقة للتي تستخدمها)
async function uploadToImgBB(buffer) {
    const apiKey = "e588c3e5bae57852fb441c6f15619cad";

    const formData = new FormData();
    formData.append('image', buffer.toString('base64'));

    try {
        const res = await axios.post(
            `https://api.imgbb.com/1/upload?key=${apiKey}`,
            formData,
            { headers: formData.getHeaders() }
        );

        return res.data.data.url;
    } catch (err) {
        console.error("ImgBB Error:", err.message);
        throw new Error("Image upload failed");
    }
}

//////////////////////////////////////////////////
// ➕ إضافة تبرع جديد (خاص بالـ Donor فقط)
//////////////////////////////////////////////////
router.post('/add-listing', upload.array('photos', 5), async (req, res) => {
    try {
        const {
            donorId,
            title,
            description,
            foodType,
            quantity, // يمكن إرساله كـ JSON string
            expirationDate,
            expirationTime,
            isHygieneAssured
        } = req.body;

        // التحقق من الحقول الأساسية
        if (!donorId || !title || !foodType || !expirationDate || !expirationTime || !isHygieneAssured) {
            return res.status(400).json({
                success: false,
                message: 'All required fields must be filled'
            });
        }

        // التحقق من أن المستخدم مسجل كـ Donor
        const user = await User.findById(donorId);
        if (!user || user.role !== 'Donor') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only Donors can create listings.'
            });
        }

        // رفع الصور
        const photoUrls = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                try {
                    const url = await uploadToImgBB(file.buffer);
                    photoUrls.push(url);
                } catch (e) {
                    console.log("Photo upload failed for a file");
                }
            }
        }

        // تحويل الـ Quantity إلى كائن (Object) إذا كان مبعوثاً كنص JSON
        let parsedQuantity = quantity;
        if (typeof quantity === 'string') {
            try {
                parsedQuantity = JSON.parse(quantity);
            } catch (e) {
                parsedQuantity = { veg: 0, nonVeg: 0 };
            }
        }

        // إنشاء التبرع الجديد
        const newListing = await DonationListing.create({
            donorId,
            title,
            description,
            foodType,
            quantity: parsedQuantity,
            photos: photoUrls,
            expirationDate: new Date(expirationDate),
            expirationTime,
            isHygieneAssured: isHygieneAssured === 'true' || isHygieneAssured === true
        });

        res.status(201).json({
            success: true,
            message: "Listing created successfully 🎉",
            listing: newListing
        });

    } catch (error) {
        console.error("Create Listing Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error occurred",
            error: error.message
        });
    }
});

module.exports = router;