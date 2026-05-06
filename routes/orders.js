const express = require('express');
const Order = require('../models/Order');
const DonationListing = require('../models/DonationListing');
const User = require('../models/User');

const router = express.Router();

//////////////////////////////////////////////////
// ➕ 1. إنشاء طلب جديد (خاص بالـ Receiver)
//////////////////////////////////////////////////
router.post('/', async (req, res) => {
    try {
        const { listingId, receiverId } = req.body;

        if (!listingId || !receiverId) {
            return res.status(400).json({
                success: false,
                message: 'Listing ID and Receiver ID are required'
            });
        }

        // التحقق من أن المستخدم مسجل كـ Receiver
        const receiver = await User.findById(receiverId);
        if (!receiver || receiver.role !== 'Receiver') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only Receivers can create orders.'
            });
        }

        // التحقق من وجود التبرع
        const listing = await DonationListing.findById(listingId);
        if (!listing) {
            return res.status(404).json({
                success: false,
                message: 'Donation listing not found'
            });
        }

        // التحقق من حالة التبرع
        if (listing.status !== 'Available') {
            return res.status(400).json({
                success: false,
                message: 'This listing is not available anymore'
            });
        }

        // إنشاء الطلب
        const newOrder = await Order.create({
            listingId,
            donorId: listing.donorId,
            receiverId,
            status: 'Pending'
        });

        // تحديث حالة التبرع إلى Reserved (محجوز)
        listing.status = 'Reserved';
        await listing.save();

        res.status(201).json({
            success: true,
            message: 'Order created successfully 🎉',
            order: newOrder
        });

    } catch (error) {
        console.error('Create Order Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred',
            error: error.message
        });
    }
});

//////////////////////////////////////////////////
// 👀 2. جلب جميع التبرعات المتاحة للجمعيات
//////////////////////////////////////////////////
router.get('/listings/available', async (req, res) => {
    try {
        const availableListings = await DonationListing.find({ status: 'Available' })
            .populate('donorId', 'username phone address')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: availableListings.length,
            listings: availableListings
        });
    } catch (error) {
        console.error('Get Available Listings Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred',
            error: error.message
        });
    }
});

//////////////////////////////////////////////////
// 🏍️ 3. جلب الطلبات المتاحة للسائقين (Pending)
//////////////////////////////////////////////////
router.get('/available', async (req, res) => {
    try {
        const orders = await Order.find({ status: 'Pending' })
            .populate('listingId', 'title foodType quantity expirationDate expirationTime photos')
            .populate('donorId', 'username phone address')
            .populate('receiverId', 'username phone address')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: orders.length,
            orders
        });
    } catch (error) {
        console.error('Get Available Orders Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred',
            error: error.message
        });
    }
});

//////////////////////////////////////////////////
// 🤝 4. قبول الطلب من قِبل السائق (Driver)
//////////////////////////////////////////////////
router.patch('/:id/accept', async (req, res) => {
    try {
        const { driverId } = req.body;

        if (!driverId) {
            return res.status(400).json({
                success: false,
                message: 'Driver ID is required'
            });
        }

        // التحقق من أن المستخدم مسجل كـ Driver
        const driver = await User.findById(driverId);
        if (!driver || driver.role !== 'Driver') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only Drivers can accept orders.'
            });
        }

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (order.status !== 'Pending') {
            return res.status(400).json({
                success: false,
                message: 'Order is not available for acceptance'
            });
        }

        // تحديث الطلب
        order.driverId = driverId;
        order.status = 'Driver Assigned';
        await order.save();

        res.status(200).json({
            success: true,
            message: 'Order accepted by driver successfully',
            order
        });

    } catch (error) {
        console.error('Accept Order Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred',
            error: error.message
        });
    }
});

//////////////////////////////////////////////////
// 📦 5. تحديث حالة الطلب من قِبل السائق (Picked Up أو Delivered)
//////////////////////////////////////////////////
router.patch('/:id/status', async (req, res) => {
    try {
        const { status, driverId } = req.body;

        const validStatuses = ['Driver Assigned', 'Picked Up', 'Delivered'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // التحقق من أن السائق هو من يملك الطلب
        if (!order.driverId || order.driverId.toString() !== driverId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You are not assigned to this order.'
            });
        }

        order.status = status;
        await order.save();

        // إذا تم التسليم، نقوم بتحديث حالة التبرع (DonationListing)
        if (status === 'Delivered') {
            const listing = await DonationListing.findById(order.listingId);
            if (listing) {
                listing.status = 'Picked Up'; // أو 'Delivered' حسب التقسيم
                await listing.save();
            }
        }

        res.status(200).json({
            success: true,
            message: `Order status updated to ${status} 🚚`,
            order
        });

    } catch (error) {
        console.error('Update Order Status Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred',
            error: error.message
        });
    }
});

module.exports = router;