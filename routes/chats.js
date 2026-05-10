const express = require('express');
const router = express.Router();

const mongoose = require('mongoose');

const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Donation = require('../models/Donation');

//////////////////////////////////////////////////
// ACCESS CHAT
//////////////////////////////////////////////////

router.post('/access', async (req, res) => {

  try {

    let {
      donationId,
      senderId,
      receiverId,
    } = req.body;

    //////////////////////////////////////////////////
    // VALIDATION
    //////////////////////////////////////////////////

    if (
      !donationId ||
      !senderId ||
      !receiverId
    ) {

      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    //////////////////////////////////////////////////
    // STRING IDs
    //////////////////////////////////////////////////

    donationId = donationId.toString();
    senderId = senderId.toString();
    receiverId = receiverId.toString();

    //////////////////////////////////////////////////
    // CHECK OBJECT IDs
    //////////////////////////////////////////////////

    if (
      !mongoose.Types.ObjectId.isValid(donationId) ||
      !mongoose.Types.ObjectId.isValid(senderId) ||
      !mongoose.Types.ObjectId.isValid(receiverId)
    ) {

      return res.status(400).json({
        success: false,
        message: 'Invalid Object ID(s) provided',
      });
    }

    //////////////////////////////////////////////////
    // PREPARE PARTICIPANTS
    //////////////////////////////////////////////////

    const participants = [
      senderId,
      receiverId,
    ].sort();

    //////////////////////////////////////////////////
    // FIND CHAT
    //////////////////////////////////////////////////

    let chat = await Chat.findOne({
      donation: donationId,

      participants: {
        $all: participants,

        $size: 2,
      },
    })
      .populate(
        'participants',
        'username phone avatar role',
      )
      .populate(
        'donation',
        'title status',
      );

    //////////////////////////////////////////////////
    // CREATE CHAT
    //////////////////////////////////////////////////

    if (!chat) {

      const createdChat =
        await Chat.create({

          donation: donationId,

          participants: participants,
        });

      chat = await Chat.findById(
        createdChat._id,
      )
        .populate(
          'participants',
          'username phone avatar role',
        )
        .populate(
          'donation',
          'title status',
        );
    }

    //////////////////////////////////////////////////
    // RESPONSE
    //////////////////////////////////////////////////

    return res.status(200).json({
      success: true,
      chat,
    });

  } catch (error) {

    console.log(
      'ACCESS CHAT ERROR =>',
      error,
    );

    //////////////////////////////////////////////////
    // DUPLICATE KEY
    //////////////////////////////////////////////////

    if (error.code === 11000) {

      return res.status(200).json({
        success: true,
        message:
          'Chat already exists',
      });
    }

    return res.status(500).json({
      success: false,

      error: error.message,
    });
  }
});

//////////////////////////////////////////////////
// SEND MESSAGE (يستقبل الحقول المصححة بنجاح ✅)
//////////////////////////////////////////////////

router.post('/send', async (req, res) => {
    try {
        const { chatId, senderId, text } = req.body;

        // التحقق من وصول المدخلات المطلوبة
        if (!chatId || !senderId || !text) {
            return res.status(400).json({ 
                success: false, 
                message: "Missing fields. Required: chatId, senderId, text" 
            });
        }

        // 1. إنشاء الرسالة وحفظها
        const newMessage = new Message({
            chat: chatId,
            sender: senderId,
            text: text.trim()
        });
        await newMessage.save();

        // عمل Populate لبيانات المرسل لترجع كاملة لتطبيق الهاتف
        const populatedMessage = await Message.findById(newMessage._id)
            .populate('sender', 'username avatar role');

        // 2. تحديث آخر رسالة (lastMessage) في المحادثة لتسهيل العرض
        await Chat.findByIdAndUpdate(chatId, {
            lastMessage: {
                text: text.trim(),
                sender: senderId,
                createdAt: new Date()
            }
        });

        res.status(201).json({ success: true, message: populatedMessage });
    } catch (error) {
        console.log("SEND MESSAGE ERROR =>", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

//////////////////////////////////////////////////
// GET CHAT MESSAGES
//////////////////////////////////////////////////

router.get('/:chatId/messages', async (req, res) => {
    try {
        const { chatId } = req.params;

        const messages = await Message.find({ chat: chatId })
            .populate('sender', 'username avatar role')
            .sort({ createdAt: 1 }); // ترتيب من الأقدم للأحدث ليظهر كتسلسل شات طبيعي
        
        res.status(200).json({ success: true, messages });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

//////////////////////////////////////////////////
// GET MY CHATS
//////////////////////////////////////////////////

router.get('/my-chats/:userId', async (req, res) => {
    try {
        const chats = await Chat.find({
            participants: req.params.userId
        })
        .populate('participants', 'username phone avatar role')
        .populate('donation', 'title status')
        .sort({ updatedAt: -1 }); // عرض أحدث المحادثات النشطة أولاً

        res.status(200).json({ success: true, chats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;