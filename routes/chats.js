const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Donation = require('../models/Donation');

//////////////////////////////////////////////////
// 1. 🚪 إنشاء أو جلب غرفة محادثة (Access Chat)
//////////////////////////////////////////////////
router.post('/access', async (req, res) => {
  try {
    let { donationId, senderId, receiverId } = req.body;

    // 1. التحقق من وجود الحقول المطلوبة
    if (!donationId || !senderId || !receiverId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // تنظيف المعرفات
    donationId = donationId.toString().trim();
    senderId = senderId.toString().trim();
    receiverId = receiverId.toString().trim();

    // 2. التحقق من صحة الـ Object IDs
    if (
      !mongoose.Types.ObjectId.isValid(donationId) ||
      !mongoose.Types.ObjectId.isValid(senderId) ||
      !mongoose.Types.ObjectId.isValid(receiverId)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid IDs format',
      });
    }

    // 3. التحقق من وجود التبرع
    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found',
      });
    }

    // 4. ترتيب أطراف المحادثة لضمان فريديتها
    const participants = [senderId, receiverId].sort();

    // 5. البحث عن الغرفة أولاً
    let chat = await Chat.findOne({
      donation: donationId,
      participants: {
        $all: participants,
        $size: 2,
      },
    })
      .populate('participants', 'username phone avatar role')
      .populate('donation', 'title status');

    // 6. إذا لم توجد، نقوم بالإنشاء مع معالجة أمان عالية
    if (!chat) {
      try {
        const createdChat = await Chat.create({
          donation: donationId,
          participants: participants,
        });

        // جلب البيانات بعد الإنشاء لضمان الـ Populate
        chat = await Chat.findById(createdChat._id)
          .populate('participants', 'username phone avatar role')
          .populate('donation', 'title status');
          
      } catch (dbError) {
        // في حالة التكرار أو التعارض اللحظي (Race Condition)، نحاول البحث مجدداً
        chat = await Chat.findOne({
          donation: donationId,
          participants: { $all: participants, $size: 2 },
        })
          .populate('participants', 'username phone avatar role')
          .populate('donation', 'title status');

        // إذا فشل البحث بعد الخطأ، نمرر الخطأ للـ catch الرئيسي
        if (!chat) throw dbError;
      }
    }

    // 7. التأكد النهائي من وجود الكائن قبل الإرسال لمنع قيمة null
    if (!chat) {
        return res.status(500).json({
            success: false,
            message: 'Failed to access or create chat room'
        });
    }

    return res.status(200).json({
      success: true,
      chat,
    });

  } catch (error) {
    console.error('CRITICAL ACCESS CHAT ERROR =>', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

//////////////////////////////////////////////////
// 2. ✉️ إرسال رسالة جديدة (Send Message)
//////////////////////////////////////////////////
router.post('/send', async (req, res) => {
  try {
    const { chatId, senderId, text } = req.body;

    if (!chatId || !senderId || !text) {
      return res.status(400).json({
        success: false,
        message: "Missing fields. Required: chatId, senderId, text"
      });
    }

    // إنشاء وحفظ الرسالة
    const newMessage = await Message.create({
      chat: chatId,
      sender: senderId,
      text: text.trim()
    });

    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'username avatar role');

    // تحديث المحادثة ببيانات آخر رسالة
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: {
        text: text.trim(),
        sender: senderId,
        createdAt: new Date()
      }
    });

    res.status(201).json({
      success: true,
      message: populatedMessage
    });
  } catch (error) {
    console.error("SEND MESSAGE ERROR =>", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

//////////////////////////////////////////////////
// 3. 📜 جلب رسائل غرفة معينة
//////////////////////////////////////////////////
router.get('/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;

    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'username avatar role')
      .sort({ createdAt: 1 }); // من الأقدم للأحدث

    res.status(200).json({
      success: true,
      messages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

//////////////////////////////////////////////////
// 4. 🗂️ جلب المحادثات الخاصة بمستخدم معين
//////////////////////////////////////////////////
router.get('/my-chats/:userId', async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.params.userId
    })
      .populate('participants', 'username phone avatar role')
      .populate('donation', 'title status')
      .sort({ updatedAt: -1 }); // فرز حسب أحدث نشاط

    res.status(200).json({
      success: true,
      chats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;