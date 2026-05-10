const express = require('express');
const router = express.Router();

const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Donation = require('../models/Donation');

//////////////////////////////////////////////////
// ACCESS CHAT
//////////////////////////////////////////////////

router.post('/access', async (req, res) => {
  try {
    const {
      donationId,
      senderId,
      receiverId,
    } = req.body;

    if (!donationId || !senderId || !receiverId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // التأكد إن التبرع موجود
    const donation = await Donation.findById(donationId);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found',
      });
    }

    // البحث عن شات موجود
    let chat = await Chat.findOne({
      donation: donationId,
      participants: {
        $all: [senderId, receiverId],
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

    // إنشاء شات جديد لو مش موجود
    if (!chat) {
      const createdChat = await Chat.create({
        donation: donationId,
        participants: [
          senderId,
          receiverId,
        ],
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

    return res.status(200).json({
      success: true,
      chat,
    });
  } catch (error) {
    console.log(
      'ACCESS CHAT ERROR:',
      error,
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

//////////////////////////////////////////////////
// SEND MESSAGE
//////////////////////////////////////////////////

router.post('/send', async (req, res) => {
  try {
    const {
      chatId,
      senderId,
      text,
    } = req.body;

    if (!chatId || !senderId || !text) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // التأكد إن الشات موجود
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    // إنشاء الرسالة
    const newMessage = await Message.create({
      chat: chatId,
      sender: senderId,
      text: text.trim(),
    });

    // تحديث آخر رسالة في الشات
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: {
        text: text.trim(),
        sender: senderId,
        createdAt: new Date(),
      },
    });

    // جلب الرسالة بعد الـ populate
    const message = await Message.findById(
      newMessage._id,
    )
      .populate(
        'sender',
        'username avatar role',
      )
      .populate('chat');

    return res.status(201).json({
      success: true,
      message,
    });
  } catch (error) {
    console.log(
      'SEND MESSAGE ERROR:',
      error,
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

//////////////////////////////////////////////////
// GET CHAT MESSAGES
//////////////////////////////////////////////////

router.get(
  '/:chatId/messages',
  async (req, res) => {
    try {
      const { chatId } = req.params;

      const messages =
        await Message.find({
          chat: chatId,
        })
          .populate(
            'sender',
            'username avatar role',
          )
          .populate('chat')
          .sort({
            createdAt: 1,
          });

      return res.status(200).json({
        success: true,
        messages,
      });
    } catch (error) {
      console.log(
        'GET MESSAGES ERROR:',
        error,
      );

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
);

//////////////////////////////////////////////////
// GET MY CHATS
//////////////////////////////////////////////////

router.get(
  '/my-chats/:userId',
  async (req, res) => {
    try {
      const { userId } = req.params;

      const chats = await Chat.find({
        participants: userId,
      })
        .populate(
          'participants',
          'username phone avatar role',
        )
        .populate(
          'donation',
          'title status',
        )
        .sort({
          updatedAt: -1,
        });

      return res.status(200).json({
        success: true,
        chats,
      });
    } catch (error) {
      console.log(
        'GET MY CHATS ERROR:',
        error,
      );

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
);

module.exports = router;