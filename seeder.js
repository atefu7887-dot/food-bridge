const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// استدعاء النماذج (Models)
const User = require('./models/User');
const Donation = require('./models/Donation');
const Request = require('./models/Request');
const Notification = require('./models/Notification');
const Message = require('./models/Message');
const Delivery = require('./models/Delivery');

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/food-bridge');
        console.log('🔗 Connected to MongoDB for Seeding...');
    } catch (error) {
        console.error('🔴 MongoDB connection error:', error.message);
        process.exit(1);
    }
};

const sampleUsers = [
    {
        username: "مطعم ومشاوي الأقصى",
        email: "donor1@restaurant.com",
        phone: "01012345678",
        role: "Donor",
        password: "password123",
        donorType: "Restaurant",
        businessName: "مطعم الأقصى",
        address: "الزقازيق - شارع المحافظة",
        isVerified: true
    },
    {
        username: "مخبز البلد",
        email: "donor2@bakery.com",
        phone: "01098765432",
        role: "Donor",
        password: "password123",
        donorType: "Bakery",
        businessName: "مخبز البلد",
        address: "الزقازيق - ميدان المحطة",
        isVerified: true
    },
    {
        username: "جمعية الأمل الخيرية",
        email: "receiver1@charity.com",
        phone: "01222333444",
        role: "Receiver",
        password: "password123",
        address: "الزقازيق - أمام الجامعة",
        isVerified: true
    },
    {
        username: "أحمد السائق",
        email: "volunteer1@driver.com",
        phone: "01111122223",
        role: "Volunteer",
        password: "password123",
        avatar: "https://example.com/driver1.png",
        licenseImage: "https://example.com/license1.png",
        availability: {
            timeSlot: "Evening",
            customTime: "04:00 PM - 09:00 PM",
            days: ["Monday", "Wednesday", "Friday"],
            frequency: "Any Day"
        }
    },
    {
        username: "سارة متطوعة",
        email: "volunteer2@driver.com",
        phone: "01122334455",
        role: "Volunteer",
        password: "password123",
        avatar: "https://example.com/driver2.png",
        licenseImage: "https://example.com/license2.png",
        availability: {
            timeSlot: "Morning",
            customTime: "08:00 AM - 02:00 PM",
            days: ["Sunday", "Tuesday", "Thursday"],
            frequency: "All Weekdays"
        }
    }
];

const importData = async () => {
    await connectDB();

    try {
        // 1. مسح البيانات القديمة لضمان عدم التكرار
        await User.deleteMany();
        await Donation.deleteMany();
        await Request.deleteMany();
        await Notification.deleteMany();
        await Message.deleteMany();
        await Delivery.deleteMany();

        // 2. تشفير كلمات المرور
        const salt = await bcrypt.genSalt ? await bcrypt.genSalt(10) : await bcrypt.genSalt(10);
        const hashedUsers = await Promise.all(
            sampleUsers.map(async (user) => {
                const hashedPassword = await bcrypt.hash(user.password, salt);
                return { ...user, password: hashedPassword };
            })
        );

        const createdUsers = await User.create(hashedUsers);

        const donor1 = createdUsers[0]._id; 
        const donor2 = createdUsers[1]._id; 
        const receiver1 = createdUsers[2]._id; 
        const volunteer1 = createdUsers[3]._id; 

        // 3. إضافة بيانات تبرعات متنوعة
        const sampleDonations = [
            {
                donor: donor1,
                title: "وجبات دجاج ومكرونة طازجة",
                description: "وجبات ساخنة مطبوخة بحالة ممتازة تكفي 50 فرد",
                typeOfFood: "Cooked Food-Veg & NonVeg",
                foodQuantity: { veg: 10, nonVeg: 40 },
                expirationDate: new Date("2026-05-10"),
                expirationTime: "18:00",
                status: "Pending",
                assignedDriver: volunteer1
            },
            {
                donor: donor2,
                title: "مخبوزات وخبز طازج",
                description: "فائض إنتاج اليوم من الخبز والحلويات",
                // تم تغيير القيمة إلى قيمة مسموحة (مطابقة للقيم الموجودة في الـ Schema لديك)
                typeOfFood: "Cooked Food-Veg & NonVeg", 
                foodQuantity: { veg: 50, nonVeg: 0 },
                expirationDate: new Date("2026-05-07"),
                expirationTime: "22:00",
                status: "Pending"
            }
        ];

        const createdDonations = await Donation.create(sampleDonations);
        const donation1Id = createdDonations[0]._id;

        // 4. إضافة طلبات المتلقين
        const sampleRequests = [
            {
                receiver: receiver1,
                title: "طلب وجبات ساخنة لجمعية الأمل",
                description: "نحتاج وجبات لتوزيعها على الأسر المستحقة",
                typeOfFood: "Cooked Food-Veg & NonVeg",
                foodQuantity: "تكفي 50 فرداً",
                date: new Date("2026-05-08"),
                time: "12:00",
                contactDetails: {
                    phone: "01222333444",
                    address: "الزقازيق - أمام الجامعة"
                },
                donor: donor1,
                status: "Pending",
                assignedDriver: volunteer1
            }
        ];

        const createdRequests = await Request.create(sampleRequests);
        const request1Id = createdRequests[0]._id;

        // 5. إضافة بيانات التوصيل للمتطوع
        const sampleDeliveries = [
            {
                volunteer: volunteer1,
                request: request1Id,
                donor: donor1,
                receiver: receiver1,
                foodQuantity: "50 وجبة",
                address: "الزقازيق - أمام الجامعة",
                date: new Date("2026-05-08"),
                time: "12:00",
                status: "Assigned"
            }
        ];

        await Delivery.create(sampleDeliveries);

        // 6. إشعارات متنوعة
        await Notification.create([
            {
                user: receiver1,
                role: "Receiver",
                title: "تم تسجيل طلبك",
                message: "تم تسجيل طلبك للحصول على الوجبات بنجاح.",
                type: "Request",
                read: false
            },
            {
                user: donor1,
                role: "Donor",
                title: "طلب جديد",
                message: "لديك طلب تبرع جديد في النظام.",
                type: "Request",
                read: false
            }
        ]);

        // 7. رسائل المحادثة (Chat/Messages)
        await Message.create([
            {
                sender: donor1,
                receiver: receiver1,
                content: "مرحباً، هل يمكنكم استلام التبرع في تمام الساعة 12 ظهراً؟",
                read: false
            },
            {
                sender: receiver1,
                receiver: donor1,
                content: "نعم، بالتأكيد سيكون المندوب متواجداً لاستلام الطلب.",
                read: true
            }
        ]);

        console.log('Data Imported Successfully! ✅');
        process.exit();
    } catch (error) {
        console.error('🔴 Error with seeding data:', error.message);
        process.exit(1);
    }
};

importData();