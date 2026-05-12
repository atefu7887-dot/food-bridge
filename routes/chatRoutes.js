const express = require('express');
const router = express.Router();

const Chat = require('../models/Chat');
const User = require('../models/User');
const Donation = require('../models/Donation');
const Message = require('../models/Message');

////////////////////////////////////////////////////////
// ACCESS CHAT
////////////////////////////////////////////////////////

router.post('/access', async (req, res) => {
    try {
        const { donationId, senderId, targetRole } = req.body;

        if (!donationId || !senderId) {
            return res.status(400).json({ message: "بيانات ناقصة" });
        }

        const user = await User.findById(senderId);
        const donation = await Donation.findById(donationId);

        if (!donation || !user) {
            return res.status(404).json({ message: "البيانات غير موجودة" });
        }

        const role = user.role.toLowerCase();
        let chatType = '';
        let participants = [];

        if (role === 'donor') {
            chatType = 'donor-driver';
            participants = [donation.donor.toString(), donation.driver.toString()];
        } else if (role === 'receiver') {
            chatType = 'receiver-driver';
            participants = [donation.receiver.toString(), donation.driver.toString()];
        } else if (role === 'driver') {
            if (targetRole === 'donor') {
                chatType = 'donor-driver';
                participants = [donation.donor.toString(), donation.driver.toString()];
            } else {
                chatType = 'receiver-driver';
                participants = [donation.receiver.toString(), donation.driver.toString()];
            }
        }

        // البحث عن المحادثة أو إنشاؤها
        let chat = await Chat.findOne({ donation: donationId, chatType: chatType });

        if (!chat) {
            chat = await Chat.create({
                donation: donationId,
                chatType: chatType,
                participants: participants,
            });
        }

        // --- التعديل الجوهري هنا (Deep Populate) ---
        chat = await Chat.findById(chat._id)
            .populate({
                path: 'donation',
                populate: {
                    path: 'driver donor receiver',
                    select: 'username avatar role phone' // تأكد من جلب الـ avatar هنا
                }
            })
            .populate("participants", "username avatar role");

        res.status(200).json(chat);

    } catch (error) {
        console.log("ACCESS CHAT ERROR => ", error);
        res.status(500).json({ message: error.message });
    }
});

////////////////////////////////////////////////////////
// SEND MESSAGE
////////////////////////////////////////////////////////

router.post('/message', async (req, res) => {
    try {
        const { chatId, text, senderId } = req.body;

        if (!chatId || !text || !senderId) {
            return res.status(400).json({ message: "كل الحقول مطلوبة" });
        }


        let newMessage = await Message.create({
            chat: chatId,
            sender: senderId,
            text: text,
        });

        newMessage = await newMessage.populate("sender", "username avatar role");


        await Chat.findByIdAndUpdate(
            chatId,
            {
                lastMessage: {
                    text: text,
                    sender: senderId,
                    createdAt: new Date(),
                },

                updatedAt: new Date()
            },
            { new: true }
        );

        res.status(201).json(newMessage);
    } catch (error) {
        console.log("SEND MESSAGE ERROR => ", error);
        res.status(500).json({ message: "فشل إرسال الرسالة" });
    }
});
////////////////////////////////////////////////////////
// FETCH MESSAGES
////////////////////////////////////////////////////////

router.get(
    '/messages/:chatId',
    async (req, res) => {

        try {

            const messages =
                await Message.find({
                    chat:
                        req.params.chatId
                })

                    .populate(
                        "sender",
                        "username avatar role"
                    )

                    .sort({
                        createdAt: 1
                    });

            res.status(200).json(
                messages
            );

        } catch (error) {

            res.status(500).json({
                message:
                    error.message
            });
        }
    }
);

////////////////////////////////////////////////////////
// GET USER CHATS 
////////////////////////////////////////////////////////

// GET USER CHATS 
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

      
        const chats = await Chat.find({
            participants: userId
        })
        .populate({
            path: 'donation',
           
            select: 'title status donor driver receiver' 
        })
        .populate('participants', 'username avatar role')
        .sort({ updatedAt: -1 });

        const formattedChats = chats.map(chat => {
          
            const receiver = chat.participants.find(p => p._id.toString() !== userId);

            return {
                _id: chat._id,
                receiverName: receiver ? receiver.username : "User",
                receiverAvatar: receiver ? receiver.avatar : null,
         
                lastMessage: (chat.lastMessage && chat.lastMessage.text) 
                             ? chat.lastMessage.text 
                             : "No messages yet",
                donation: chat.donation,
                updatedAt: chat.updatedAt
            };
        });

        res.status(200).json(formattedChats);
    } catch (error) {
        console.log("GET USER CHATS ERROR => ", error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;