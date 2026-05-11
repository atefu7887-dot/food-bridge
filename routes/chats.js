const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Donation = require('../models/Donation');

//////////////////////////////////////////////////
// 1. 🚪 إنشاء أو جلب غرفة محادثة (Access Chat)
//////////////////////////////////////////////////
// استبدل دالة accessChat في ملف chats.js بهذا الكود المؤمن
router.post('/access', async (req, res) => {
  try {
    const { donationId, userId } = req.body; // نحتاج فقط معرف التبرع والمستخدم الحالي

    // 1. جلب بيانات التبرع لمعرفة الأطراف (المتبرع، الجمعية، السائق)
    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    // 2. تجميع الأطراف المتاحة حالياً
    const participants = [];
    if (donation.donor) participants.push(donation.donor.toString());
    if (donation.receiver) participants.push(donation.receiver.toString());
    if (donation.driver) participants.push(donation.driver.toString());

    // التأكد من أن المستخدم الحالي جزء من هذا التبرع
    if (!participants.includes(userId.toString())) {
       return res.status(403).json({ success: false, message: 'You are not part of this donation' });
    }

    // 3. البحث عن الغرفة أو إنشاؤها بناءً على الـ donationId فقط
    let chat = await Chat.findOne({ donation: donationId })
      .populate('participants', 'username phone avatar role')
      .populate('donation', 'title status');

    if (!chat) {
      chat = await Chat.create({
        donation: donationId,
        participants: participants,
      });
      
      chat = await Chat.findById(chat._id)
        .populate('participants', 'username phone avatar role')
        .populate('donation', 'title status');
    } else {
      // تحديث المشاركين في حال انضم سائق جديد لاحقاً
      chat.participants = participants;
      await chat.save();
    }

    return res.status(200).json({ success: true, chat });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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