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

    // التحقق من وجود الحقول المطلوبة
    if (!donationId || !senderId || !receiverId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    donationId = donationId.toString().trim();
    senderId = senderId.toString().trim();
    receiverId = receiverId.toString().trim();

    // التحقق من صحة الـ Object IDs لـ MongoDB
    if (
      !mongoose.Types.ObjectId.isValid(donationId) ||
      !mongoose.Types.ObjectId.isValid(senderId) ||
      !mongoose.Types.ObjectId.isValid(receiverId)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ids',
      });
    }

    // التحقق من وجود التبرع
    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found',
      });
    }

    // ترتيب أطراف المحادثة لضمان ربط دائم وتجنب تكرار المفاتيح الفريدة
    const participants = [senderId, receiverId].sort();

    // البحث عن غرفة محادثة قائمة تجمع هذين الطرفين بالذات بخصوص هذا التبرع
    let chat = await Chat.findOne({
      donation: donationId,
      participants: {
        $all: participants,
        $size: 2,
      },
    })
      .populate('participants', 'username phone avatar role')
      .populate('donation', 'title status');

    // إذا لم تكن الغرفة موجودة، نقوم بإنشائها
    if (!chat) {
      try {
        const createdChat = await Chat.create({
          donation: donationId,
          participants: participants,
        });

        chat = await Chat.findById(createdChat._id)
          .populate('participants', 'username phone avatar role')
          .populate('donation', 'title status');
      } catch (dbError) {
        // إذا حدث خطأ تكرار (11000) بسبب تعارض متزامن، نقوم بجلب الغرفة الموجودة مسبقاً فوراً بدلاً من إرجاع رسالة فقط!
        if (dbError.code === 11000) {
          chat = await Chat.findOne({
            donation: donationId,
            participants: {
              $all: participants,
              $size: 2,
            },
          })
            .populate('participants', 'username phone avatar role')
            .populate('donation', 'title status');
        } else {
          throw dbError; // تمرير أي خطأ آخر للـ catch الرئيسي
        }
      }
    }

    // الرد الناجح يحتوي دائماً على كائن الـ chat
    return res.status(200).json({
      success: true,
      chat,
    });

  } catch (error) {
    console.log('ACCESS CHAT ERROR =>', error);

    // معالجة إضافية احتياطية لخطأ التكرار في الـ catch الخارجي
    if (error.code === 11000) {
      try {
        const { donationId, senderId, receiverId } = req.body;
        const participants = [senderId.toString().trim(), receiverId.toString().trim()].sort();
        
        const existingChat = await Chat.findOne({
          donation: donationId.toString().trim(),
          participants: {
            $all: participants,
            $size: 2,
          },
        })
          .populate('participants', 'username phone avatar role')
          .populate('donation', 'title status');

        if (existingChat) {
          return res.status(200).json({
            success: true,
            chat: existingChat,
          });
        }
      } catch (innerError) {
        console.log('INNER CHAT FETCH ERROR =>', innerError);
      }
    }

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

    // حفظ الرسالة بداخل قاعدة البيانات
    const newMessage = new Message({
      chat: chatId,
      sender: senderId,
      text: text.trim()
    });
    await newMessage.save();

    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'username avatar role');

    // تحديث تفاصيل آخر رسالة تم إرسالها لتسهيل عرضها في القوائم
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
    console.log("SEND MESSAGE ERROR =>", error);
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
      .sort({ createdAt: 1 }); // الترتيب من الأقدم للأحدث

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