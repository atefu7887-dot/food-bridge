const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const Donation = require('../models/Donation');
const User = require('../models/User');


const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

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
// ➕ ADD NEW DONATION 
//////////////////////////////////////////////////

router.post('/add', upload.array('photos', 5), async (req, res) => {
    try {
        const {
            donorId,
            title,
            foodType,
            itemDetails,
            quantity,
            vegQty,
            nonVegQty,
            location, 
            lat,      
            lng,      
            contactPhone,
            expiryDate,
            expiryTime,
            isQualityAssured,
            receiverId
        } = req.body;
        
        const donor = await User.findById(donorId);
        if (!donor) {
            return res.status(400).json({ success: false, message: 'Donor not found' });
        }

        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(file => uploadToImgBB(file.buffer));
            imageUrls = await Promise.all(uploadPromises);
        }
        const newDonation = new Donation({
            donor: donorId,
            receiver: receiverId || null,
            title,
            foodType,
            description: itemDetails,
            quantity: parseInt(quantity),
            breakdown: {
                veg: parseInt(vegQty) || 0,
                nonVeg: parseInt(nonVegQty) || 0
            },
            images: imageUrls,
            location: location, 
            pickupLocation: {
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                address: location
            },
       
            contactPhone: contactPhone || donor.phone,
            expiryDate,
            expiryTime,
            isQualityAssured: isQualityAssured === 'true' || isQualityAssured === true,
            status: 'Pending'
        });
        await newDonation.save();
        res.status(201).json({ 
            success: true, 
            message: "Donation created successfully!", 
            donation: newDonation 
        });

    } catch (error) {
        console.error("Error adding donation:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

//////////////////////////////////////////////////
// 2. Select driver
//////////////////////////////////////////////////

router.get('/available-drivers', async (req, res) => {
    try {
      
        const drivers = await User.find({ role: 'Driver' })
            .select('username phone avatar')
            .lean();
        res.status(200).json({ success: true, drivers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

//////////////////////////////////////////////////
// ✅ NGO APPROVAL FOR DRIVER (Updated)
//////////////////////////////////////////////////

router.patch('/:id/assign-driver', async (req, res) => {
    try {
        const { driverId } = req.body;
        const donation = await Donation.findById(req.params.id);
        if (!donation) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
        donation.driver = driverId;
        donation.status = 'Assigned'; 
        donation.driverRequestStatus = 'Approved'; 
        donation.timeline.assignedAt = Date.now(); 
        await donation.save();
        const populated = await Donation.findById(donation._id)
            .populate('driver', 'username phone avatar')
            .populate('receiver', 'username phone');

        res.status(200).json({ success: true, donation: populated });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

//////////////////////////////////////////////////
// 4. ✅ DRIVER ACCEPTANCE OF TASK
//////////////////////////////////////////////////

router.patch('/:id/driver-accept', async (req, res) => {
    try {
      
        const donation = await Donation.findById(req.params.id).populate('receiver');
        
        if (!donation) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });

        donation.status = 'Accepted';
        await donation.save();

        if (donation.receiver && donation.receiver.fcmToken) {
            sendNotification(
                donation.receiver.fcmToken,
                "تم قبول طلب التوصيل 🚚",
                `السائق وافق على استلام طلبك (${donation.title}) وهو في الطريق الآن.`
            );
        }

        res.status(200).json({ 
            success: true, 
            message: 'تم قبول المهمة بنجاح، يمكنك البدء في الاستلام الآن.',
            donation 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

//////////////////////////////////////////////////
// 5. ❌ DRIVER REJECTION OF TASK
//////////////////////////////////////////////////

router.patch('/:id/driver-reject', async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id);
        if (!donation) return res.status(404).json({ success: false, message: 'Not found' });

        donation.driver = null; 
        donation.driverRequestStatus = null; 
        donation.status = 'Accepted'; 
        
        await donation.save();
        res.status(200).json({ success: true, message: 'Driver rejected and task is back to market' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

//////////////////////////////////////////////////
// 6. 👤 GET DONOR DONATION HISTORY
//////////////////////////////////////////////////

router.get('/donor-donations/:donorId', async (req, res) => {
    try {
        const donations = await Donation.find({ donor: req.params.donorId })
            .populate('receiver', 'username email phone avatar')
            .populate('driver', 'username phone avatar')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, donations });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

//////////////////////////////////////////////////
// 7. 🔍 GET AVAILABLE DONATIONS FOR NGOs
//////////////////////////////////////////////////

router.get('/available-for-ngo', async (req, res) => {
    try {
        const donations = await Donation.find({ status: 'Pending', receiver: null })
            .populate('donor', 'username phone location avatar');
        res.status(200).json({ success: true, donations });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

//////////////////////////////////////////////////
// 8. 📥 RESERVE DONATION BY NGO
//////////////////////////////////////////////////

router.patch('/:id/request-donation', async (req, res) => {
    try {
        const { receiverId } = req.body;
        const donation = await Donation.findById(req.params.id);
        if (!donation || donation.receiver) return res.status(400).json({ success: false, message: 'Taken or not found' });
        donation.receiver = receiverId;
        await donation.save();
        res.status(200).json({ success: true, donation });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 9. 📋 تبرعات جمعية معينة
router.get('/my-ngo-donations/:receiverId', async (req, res) => {
    try {
        const donations = await Donation.find({ receiver: req.params.receiverId })
            .populate('donor', 'username phone location')
            .populate('driver', 'username phone avatar')
            .sort({ updatedAt: -1 });
        res.status(200).json({ success: true, donations });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

//////////////////////////////////////////////////
// 10. 📋 DRIVER TASKS (Current Assignments)
//////////////////////////////////////////////////

router.get('/my-tasks/:driverId', async (req, res) => {
    try {
        const tasks = await Donation.find({ driver: req.params.driverId })
            .populate('donor', 'username phone location')
            .populate('receiver', 'username phone address')
            .sort({ updatedAt: -1 });
        res.status(200).json({ success: true, tasks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


router.patch('/:id/update-status', async (req, res) => {
    try {
        const { status } = req.body;
        const donation = await Donation.findById(req.params.id);

        if (!donation) return res.status(404).json({ success: false, message: 'Donation not found' });

        donation.status = status;

        if (status === 'Picked Up') donation.timeline.pickedUpAt = Date.now();
        if (status === 'Delivered') donation.timeline.deliveredAt = Date.now();

        await donation.save();

        const result = await Donation.findById(donation._id)
            .populate('donor driver receiver');

        res.status(200).json({ success: true, donation: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// جلب التبرعات النشطة فقط (التي لم تنتهِ بعد)
router.get('/donor-active/:donorId', async (req, res) => {
    try {
        const activeDonations = await Donation.find({
            donor: req.params.donorId,
            status: { $ne: 'Delivered' } 
        })
            .populate('receiver', 'username avatar address')
            .populate('driver', 'username phone avatar')
            .sort({ updatedAt: -1 });

        res.status(200).json({
            success: true,
            count: activeDonations.length,
            donations: activeDonations
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ❌ مسار إلغاء التبرع (Delete Donation)
router.delete('/:id/cancel', async (req, res) => {
    try {
        const donationId = req.params.id;

       
        const donation = await Donation.findById(donationId);

        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation not found' });
        }
        if (donation.status !== 'Pending') {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel donation after it has been accepted or assigned.'
            });
        }

        await Donation.findByIdAndDelete(donationId);

        res.status(200).json({ success: true, message: 'Donation cancelled successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// 📝 تعديل بيانات التبرع (Update Donation)

router.patch('/:id/update', upload.array('photos', 5), async (req, res) => {
    try {
        const donationId = req.params.id;
        const { title, foodType, itemDetails, quantity, vegQty, nonVegQty, location, contactPhone } = req.body;

       
        const donation = await Donation.findById(donationId);
        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation not found' });
        }
        if (donation.status !== 'Pending') {
            return res.status(400).json({
                success: false,
                message: 'لا يمكن تعديل التبرع بعد أن تم قبوله أو البدء في توصيله.'
            });
        }
        let imageUrls = donation.images; 
        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(file => uploadToImgBB(file.buffer));
            imageUrls = await Promise.all(uploadPromises); 
        }
        const updatedDonation = await Donation.findByIdAndUpdate(
            donationId,
            {
                title,
                foodType,
                description: itemDetails,
                quantity: parseInt(quantity),
                breakdown: {
                    veg: parseInt(vegQty) || 0,
                    nonVeg: parseInt(nonVegQty) || 0
                },
                images: imageUrls,
                location,
                contactPhone
            },
            { new: true } 
        );

        res.status(200).json({
            success: true,
            message: "تم تحديث التبرع بنجاح",
            donation: updatedDonation
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.patch('/:id/claim', async (req, res) => {
    try {
        const { receiverId } = req.body;
        const donation = await Donation.findById(req.params.id).populate('donor');
        const receiver = await User.findById(receiverId);

        if (!donation || donation.receiver) {
            return res.status(400).json({ success: false, message: 'تبرع غير موجود أو محجوز مسبقاً' });
        }
     
        donation.receiver = receiverId;
        donation.status = 'Pending Approval';
        await donation.save();
    
        const donor = donation.donor;
        if (donor && donor.fcmToken) {
            sendNotification(
                donor.fcmToken,
                "طلب استلام جديد 📥",
                `ترغب جمعية (${receiver.username}) في استلام تبرعك: ${donation.title}`
            );
        }

        res.status(200).json({ success: true, message: 'تم إرسال طلبك للمتبرع بنجاح' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.patch('/:id/approve-claim', async (req, res) => {
    try {
        const donation = await Donation.findByIdAndUpdate(
            req.params.id,
            { 
                status: 'Accepted', 
                driver: null       
            },
            { new: true }
        ).populate('receiver');

        res.status(200).json({ success: true, message: 'تمت الموافقة، المهمة الآن معروضة للسائقين في السوق.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ❌ مسار الرفض
router.patch('/:id/reject-claim', async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id).populate('receiver');
        const receiver = donation.receiver;

        donation.receiver = null;
        donation.status = 'Pending';
        await donation.save();

        // 🔔 إرسال إشعار للجمعية بالرفض
        if (receiver && receiver.fcmToken) {
            sendNotification(receiver.fcmToken, "نعتذر منك 😔", "تم رفض طلب الاستلام من قبل المتبرع.");
        }

        res.status(200).json({ success: true, message: 'تم رفض الطلب وإعادة التبرع للقائمة' });
    } catch (error) { /* error handling */ }
});

// 📍 تحديث موقع السائق اللحظي (للتتبع على الخريطة)
router.patch('/:id/update-location', async (req, res) => {
    try {
        const { lat, lng } = req.body;
        const donation = await Donation.findByIdAndUpdate(
            req.params.id,
            { 'driverLocation.lat': lat, 'driverLocation.lng': lng },
            { new: true }
        );
        res.status(200).json({ success: true, location: donation.driverLocation });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 🚚 جلب المهام المتاحة في السوق (التي وافق عليها المتبرع ولم يحجزها سائق بعد)
router.get('/driver/available-tasks', async (req, res) => {
    try {
        // نبحث عن الطلبات التي حالتها Accepted (تمت موافقة المتبرع) 
        // وبشرط أن يكون حقل السائق فارغاً
        const tasks = await Donation.find({ 
            status: 'Accepted', 
            driver: null 
        })
        .populate('donor', 'username phone location avatar')
        .populate('receiver', 'username phone address')
        .sort({ updatedAt: -1 });

        res.status(200).json({ success: true, tasks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. ✅ قبول السائق للمهمة (المعدل لفرض نظام موافقة الجمعية)
router.patch('/:id/driver-accept', async (req, res) => {
    try {
        // عمل populate لجلب بيانات الجمعية (receiver) لإرسال الإشعارات لاحقاً
        const donation = await Donation.findById(req.params.id).populate('receiver');
        
        if (!donation) {
            return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
        }
        if (donation.driverRequestStatus === 'Pending') {
            return res.status(403).json({ 
                success: false, 
                message: 'لا يمكنك تأكيد استلام المهمة قبل أن توافق الجمعية على طلبك أولاً.' 
            });
        }
        donation.status = 'Accepted';
        
        donation.driverRequestStatus = 'Approved'; 
        
        await donation.save();
        if (donation.receiver && donation.receiver.fcmToken) {
            sendNotification(
                donation.receiver.fcmToken,
                "السائق أكد المهمة! 🚚",
                `وافق السائق رسمياً على توصيل طلبك (${donation.title}) وهو في طريقه للاستلام.`
            );
        }

        res.status(200).json({ 
            success: true, 
            message: 'تم تأكيد المهمة بنجاح، يمكنك الآن التوجه لموقع الاستلام.',
            donation 
        });

    } catch (error) {
        console.error("Driver Accept Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// تعديل مسار assign-driver (عندما تختار الجمعية السائق بنفسها)
router.patch('/:id/assign-driver', async (req, res) => {
    try {
        const { driverId } = req.body;
        const donation = await Donation.findById(req.params.id);

        if (!donation) return res.status(404).json({ success: false, message: 'Donation not found' });

        donation.driver = driverId;
        donation.status = 'Assigned';
        
        donation.driverRequestStatus = 'Approved'; 
        
        donation.timeline.assignedAt = Date.now(); 
        await donation.save();

        const populated = await Donation.findById(donation._id)
            .populate('driver', 'username phone avatar')
            .populate('receiver', 'username phone');

        res.status(200).json({ success: true, donation: populated });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ⚡ ميزة "الاقتناص الحر" للسائق
router.patch('/:id/driver-pickup-anyway', async (req, res) => {
    try {
        const { driverId } = req.body;
        const donation = await Donation.findById(req.params.id);

        if (!donation || donation.status !== 'Pending') {
            return res.status(400).json({ success: false, message: 'التبرع محجوز أو غير متاح' });
        }

        // السائق بيحجز الطلب لنفسه قبل ما أي جمعية تدخل
        donation.driver = driverId;
        donation.status = 'Picked Up'; // هنعتبره استلم فعلياً أو في طريقه للاستلام
        donation.timeline.pickedUpAt = Date.now();
        
        await donation.save();

        // 💡 ترشيح أقرب جمعية للسائق عشان يوديلها الأكل
        const nearestNGO = await User.findOne({ role: 'Receiver' }); // ممكن تحسنها بـ Location

        res.status(200).json({ 
            success: true, 
            message: 'تم حجز التبرع، يرجى التوجه للاستلام وتوصيله لأقرب جمعية',
            suggestedNGO: nearestNGO 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// إضافة مسار طلب السائق للمهمة من الماركت
router.patch('/:id/driver-request', async (req, res) => {
    try {
        const { driverId } = req.body;
        const donation = await Donation.findById(req.params.id);

        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation not found' });
        }
        donation.driver = driverId;
        donation.driverRequestStatus = 'Pending';
        donation.status = 'Assigned';

        await donation.save();

        res.status(200).json({ 
            success: true, 
            message: 'Request sent to NGO successfully',
            donation 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;