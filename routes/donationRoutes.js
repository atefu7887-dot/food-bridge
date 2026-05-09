const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const Donation = require('../models/Donation');
const User = require('../models/User');

// إعداد multer لتخزين الصور في الذاكرة المؤقتة
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

// دالة رفع الصور إلى ImgBB
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

// 1. ➕ إضافة تبرع جديد
router.post('/add', upload.array('photos', 5), async (req, res) => {
    try {
        const {
            donorId, title, foodType, itemDetails, quantity,
            vegQty, nonVegQty, location, contactPhone,
            expiryDate, expiryTime, isQualityAssured, receiverId
        } = req.body;

        const donor = await User.findById(donorId);
        if (!donor) return res.status(400).json({ success: false, message: 'Donor not found' });

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
            location,
            contactPhone: contactPhone || donor.phone,
            expiryDate,
            expiryTime,
            isQualityAssured: isQualityAssured === 'true' || isQualityAssured === true,
            status: 'Pending'
        });

        await newDonation.save();
        res.status(201).json({ success: true, message: "Donation created!", donation: newDonation });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. 🚚 جلب قائمة السائقين المتاحين (حل مشكلة القائمة الفارغة)
router.get('/available-drivers', async (req, res) => {
    try {
        // نبحث عن المستخدمين الذين دورهم 'Driver'
        const drivers = await User.find({ role: 'Driver' })
            .select('username phone avatar')
            .lean();
        res.status(200).json({ success: true, drivers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.patch('/:id/assign-driver', async (req, res) => {
    try {
        const { driverId } = req.body;
        const donation = await Donation.findById(req.params.id);

        if (!donation) return res.status(404).json({ success: false, message: 'Donation not found' });
        
        // منع التعيين قبل موافقة المتبرع (Pending Approval)
        if (donation.status === 'Pending Approval') {
            return res.status(400).json({ success: false, message: 'انتظر موافقة المتبرع أولاً' });
        }

        donation.driver = driverId;
        donation.status = 'Assigned'; // الحالة الآن "تم التعيين" وفي انتظار رد السائق
        donation.timeline.assignedAt = Date.now(); 
        await donation.save();

        const populated = await Donation.findById(donation._id).populate('driver', 'username phone avatar');
        res.status(200).json({ success: true, donation: populated });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. ✅ قبول السائق للمهمة
router.patch('/:id/driver-accept', async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id);
        
        if (!donation) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });

        // نغير الحالة من Assigned إلى Accepted (وهي تعني أن السائق وافق وبدأ التحرك)
        donation.status = 'Accepted';
        await donation.save();

        res.status(200).json({ 
            success: true, 
            message: 'تم قبول المهمة بنجاح، يمكنك البدء في الاستلام الآن.',
            donation 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 5. ❌ رفض السائق للمهمة
router.patch('/:id/driver-reject', async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id);

        if (!donation) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });

        // عند الرفض: نقوم بمسح السائق وإعادة الحالة لـ Accepted (لأن المتبرع وافق أصلاً) 
        // أو Pending لكي تختار الجمعية سائقاً آخر
        donation.driver = null; 
        donation.status = 'Accepted'; // الطلب يعود متاحاً للتعيين مرة أخرى
        
        await donation.save();

        res.status(200).json({ 
            success: true, 
            message: 'تم رفض المهمة، وإعادة الطلب لقائمة الانتظار.' 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 6. 👤 عرض تاريخ تبرعات المتبرع
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

// 7. 🔍 التبرعات المتاحة للجمعيات
router.get('/available-for-ngo', async (req, res) => {
    try {
        const donations = await Donation.find({ status: 'Pending', receiver: null })
            .populate('donor', 'username phone location avatar');
        res.status(200).json({ success: true, donations });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 8. 📥 حجز تبرع من قبل الجمعية
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

// 10. 📋 مهام السائق
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

// 🏛️ جلب الجمعيات المتاحة (NGOs)
router.get('/available-ngos', async (req, res) => {
    try {
        const ngos = await User.find({ role: 'Receiver' }) // تأكد أن الـ Role في الداتا بيز Receiver
            .select('username email phone address avatar receiverType bio photos')
            .lean();
        res.status(200).json({ success: true, ngos });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// جلب التبرعات النشطة فقط (التي لم تنتهِ بعد)
router.get('/donor-active/:donorId', async (req, res) => {
    try {
        const activeDonations = await Donation.find({
            donor: req.params.donorId,
            status: { $ne: 'Delivered' } // أي حالة غير 'تم التوصيل'
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

        // البحث عن التبرع للتأكد من حالته قبل الحذف
        const donation = await Donation.findById(donationId);

        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation not found' });
        }

        // 🛡️ شرط أمان: لا يمكن الإلغاء إلا إذا كانت الحالة Pending
        // لو الجمعية وافقت أو السائق استلم، مينفعش المتبرع يحذف فجأة
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
// يسمح بالتعديل فقط إذا كانت الحالة لا تزال Pending
router.patch('/:id/update', upload.array('photos', 5), async (req, res) => {
    try {
        const donationId = req.params.id;
        const { title, foodType, itemDetails, quantity, vegQty, nonVegQty, location, contactPhone } = req.body;

        // 1. البحث عن التبرع
        const donation = await Donation.findById(donationId);
        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation not found' });
        }

        // 2. 🛡️ شرط الأمان: التعديل مسموح فقط في حالة الانتظار Pending
        if (donation.status !== 'Pending') {
            return res.status(400).json({
                success: false,
                message: 'لا يمكن تعديل التبرع بعد أن تم قبوله أو البدء في توصيله.'
            });
        }

        // 3. معالجة الصور الجديدة إذا تم رفعها
        let imageUrls = donation.images; // الاحتفاظ بالصور القديمة كافتراضي
        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(file => uploadToImgBB(file.buffer));
            imageUrls = await Promise.all(uploadPromises); // استبدال الصور القديمة بالجديدة
        }

        // 4. تحديث البيانات
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
            { new: true } // لإرجاع البيانات الجديدة بعد التعديل
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

// في ملف routes/donations.js

router.patch('/:id/claim', async (req, res) => {
    try {
        const { receiverId } = req.body;
        const donation = await Donation.findById(req.params.id).populate('donor');
        const receiver = await User.findById(receiverId);

        if (!donation || donation.receiver) {
            return res.status(400).json({ success: false, message: 'تبرع غير موجود أو محجوز مسبقاً' });
        }

        // تحديث التبرع
        donation.receiver = receiverId;
        donation.status = 'Pending Approval'; // حالة الانتظار
        await donation.save();

        // 🔔 إرسال إشعار للمتبرع
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

// ✅ مسار الموافقة
// ✅ مسار موافقة المتبرع المحدث
router.patch('/:id/approve-claim', async (req, res) => {
    try {
        const donation = await Donation.findByIdAndUpdate(
            req.params.id,
            { 
                status: 'Accepted', // تصبح متاحة في سوق السائقين
                driver: null        // التأكد أنها بدون سائق لكي تظهر للجميع
            },
            { new: true }
        ).populate('receiver');

        // إشعار عام للسائقين القريبين (اختياري عبر Socket.io أو FCM)
        // broadcastToDrivers("هناك طعام جاهز للاستلام بالقرب منك!");

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

        // إعادة التبرع للحالة العامة وحذف الجمعية منه
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

// ⚡ ميزة الاقتناص: السائق يحجز المهمة لنفسه فوراً
router.patch('/:id/driver-claim', async (req, res) => {
    try {
        const { driverId } = req.body;
        const donation = await Donation.findById(req.params.id);

        if (!donation) return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });

        // التأكد أن المهمة لم يحجزها سائق آخر في نفس اللحظة
        if (donation.driver) {
            return res.status(400).json({ success: false, message: 'عذراً، قام سائق آخر باقتناص هذه المهمة للتو!' });
        }

        donation.driver = driverId;
        donation.status = 'Assigned'; // تحويل الحالة لـ "تم التعيين"
        donation.driverRequestStatus = 'Accepted'; // السائق وافق تلقائياً لأنه هو من ضغط
        donation.timeline.assignedAt = Date.now();

        await donation.save();

        res.status(200).json({ 
            success: true, 
            message: 'مبروك! المهمة أصبحت ملكك الآن، توجه لنقطة الاستلام.', 
            donation 
        });
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

module.exports = router;