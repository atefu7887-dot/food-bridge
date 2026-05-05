const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User'); // تأكد من المسار الصحيح لملف الـ Model الخاص بك
require('dotenv').config();

const dummyUsers = [
    {
        username: "restaurant_ahmed",
        email: "ahmed@restaurant.com",
        phone: "+201223456789",
        password: "hashed_password_placeholder",
        role: "Donor",
        donorType: "Restaurant",
        businessName: "مطعم ومشاوي البركة",
        address: "١٥ شارع التحرير، الدقي، الجيزة",
        photos: [
            "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4",
            "https://images.unsplash.com/photo-1555396273-367ea4eb4db5"
        ],
        isVerified: true
    },
    {
        username: "ngo_resala",
        email: "contact@resala.org",
        phone: "+201009876543",
        password: "hashed_password_placeholder",
        role: "Receiver",
        receiverType: "NGO",
        businessName: "جمعية رسالة للأعمال الخيرية",
        address: "٢٤ شارع جمال عبد الناصر، مدينة نصر، القاهرة",
        photos: [
            "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c",
            "https://images.unsplash.com/photo-1593113631714-998858d4a66a"
        ],
        isVerified: true
    },
    {
        username: "bakery_adel",
        email: "adel@bakery.com",
        phone: "+201551234567",
        password: "hashed_password_placeholder",
        role: "Donor",
        donorType: "Bakery",
        businessName: "مخبوزات الأندلس",
        address: "١٠ شارع الجيش، طنطا، الغربية",
        photos: [
            "https://images.unsplash.com/photo-1509440159596-0249088772ff",
            "https://images.unsplash.com/photo-1541167760496-1628856ab779"
        ],
        isVerified: false
    },
    {
        username: "trust_egypt",
        email: "trust@egyptcare.org",
        phone: "+201287654321",
        password: "hashed_password_placeholder",
        role: "Receiver",
        receiverType: "Trust",
        businessName: "مؤسسة مصر الخير",
        address: "القرية الذكية، الجيزة",
        photos: [
            "https://images.unsplash.com/photo-1594897030264-ab7d87efc473"
        ],
        isVerified: true
    },
    {
        username: "individual_donor",
        email: "kareem.donor@hotmail.com",
        phone: "+201098765432",
        password: "hashed_password_placeholder",
        role: "Donor",
        donorType: "Individual",
        address: "شيراتون، القاهرة",
        photos: [
            "https://images.unsplash.com/photo-1606787366850-de6330128bfc"
        ],
        isVerified: true
    },
    {
        username: "receiver_individual",
        email: "ahmed.receiver@yahoo.com",
        phone: "+201123456789",
        password: "hashed_password_placeholder",
        role: "Receiver",
        receiverType: "Individual",
        address: "شبين الكوم، المنوفية",
        photos: [
            "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e"
        ],
        isVerified: false
    },
    {
        username: "bakery_tasty",
        email: "tasty@baking.com",
        phone: "+201211231123",
        password: "hashed_password_placeholder",
        role: "Donor",
        donorType: "Bakery",
        businessName: "مخبز الحلويات السريعة",
        address: "ش فيصل الرئيسي، الجيزة",
        photos: [
            "https://images.unsplash.com/photo-1519730221234-14fa8dc3d91d"
        ],
        isVerified: true
    },
    {
        username: "restaurant_grand",
        email: "grand@restaurant.com",
        phone: "+201023456780",
        password: "hashed_password_placeholder",
        role: "Donor",
        donorType: "Restaurant",
        businessName: "مطعم ومطبخ الجراند",
        address: "١٢ شارع التسعين، التجمع الخامس، القاهرة",
        photos: [
            "https://images.unsplash.com/photo-1555396273-367ea4eb4db5",
            "https://images.unsplash.com/photo-1514933651103-005eec06c04b"
        ],
        isVerified: true
    }
];

async function seedData() {
    try {
        // 1. الاتصال بقاعدة البيانات
        await mongoose.connect(process.env.MONGO_URI);
        console.log("🟢 Connected to MongoDB successfully!");

        // 2. تشفير كلمات المرور
        const hashedPassword = await bcrypt.hash("12345678", 10);
        for (let user of dummyUsers) {
            user.password = hashedPassword; // استبدال الكلمة المؤقتة بكلمة مشفرة
        }

        // 3. إدخال البيانات
        await User.insertMany(dummyUsers);
        console.log("✅ Data inserted successfully!");

        // 4. إغلاق الاتصال
        mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error("🔴 Error inserting data:", error);
        mongoose.connection.close();
        process.exit(1);
    }
}

seedData();