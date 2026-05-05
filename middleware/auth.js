const jwt = require('jsonwebtoken');
const User = require('../models/User');

// دالة حماية المسارات (تتطلب تسجيل الدخول)
exports.protect = async (req, res, next) => {
    try {
        let token;

        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'غير مصرح لك بالدخول، يرجى تسجيل الدخول.'
            });
        }

        // التحقق من التوكن
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        
        // العثور على المستخدم
        req.user = await User.findById(decoded.id || decoded._id);

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'المستخدم غير موجود.'
            });
        }

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'رمز الدخول غير صالح أو انتهت صلاحيته.'
        });
    }
};

// دالة تقييد الصلاحيات (حسب الدور)
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك الصلاحيات للوصول إلى هذا المسار.'
            });
        }
        next();
    };
};