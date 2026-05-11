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

        const {
            donationId,
            senderId,
            targetRole
        } = req.body;

        //////////////////////////////////////////////////////
        // VALIDATION
        //////////////////////////////////////////////////////

        if (!donationId || !senderId) {

            return res.status(400).json({
                message: "بيانات ناقصة"
            });
        }

        //////////////////////////////////////////////////////
        // FIND DATA
        //////////////////////////////////////////////////////

        const donation =
            await Donation.findById(
                donationId
            );

        const user =
            await User.findById(
                senderId
            );

        if (!donation || !user) {

            return res.status(404).json({
                message: "البيانات غير موجودة"
            });
        }

        if (!donation.driver) {

            return res.status(400).json({
                message:
                    "لا يوجد سائق لهذا الطلب"
            });
        }

        //////////////////////////////////////////////////////
        // ROLE
        //////////////////////////////////////////////////////

        const role =
            user.role.toLowerCase();

        //////////////////////////////////////////////////////
        // CHAT TYPE
        //////////////////////////////////////////////////////

        let chatType = '';

        let participants = [];

        //////////////////////////////////////////////////////
        // DONOR
        //////////////////////////////////////////////////////

        if (role === 'donor') {

            chatType =
                'donor-driver';

            participants = [
                donation.donor.toString(),
                donation.driver.toString(),
            ];
        }

        //////////////////////////////////////////////////////
        // RECEIVER
        //////////////////////////////////////////////////////

        else if (role === 'receiver') {

            chatType =
                'receiver-driver';

            participants = [
                donation.receiver.toString(),
                donation.driver.toString(),
            ];
        }

        //////////////////////////////////////////////////////
        // DRIVER
        //////////////////////////////////////////////////////

        else if (role === 'driver') {

            if (targetRole === 'donor') {

                chatType =
                    'donor-driver';

                participants = [
                    donation.donor.toString(),
                    donation.driver.toString(),
                ];

            } else {

                chatType =
                    'receiver-driver';

                participants = [
                    donation.receiver.toString(),
                    donation.driver.toString(),
                ];
            }
        }

        //////////////////////////////////////////////////////
        // INVALID CHAT TYPE
        //////////////////////////////////////////////////////

        if (!chatType) {

            return res.status(400).json({
                message:
                    "نوع المحادثة غير صالح"
            });
        }

        //////////////////////////////////////////////////////
        // FIND OR CREATE CHAT
        //////////////////////////////////////////////////////

        let chat =
            await Chat.findOne({
                donation: donationId,
                chatType: chatType,
            });

        //////////////////////////////////////////////////////
        // CREATE
        //////////////////////////////////////////////////////

        if (!chat) {

            chat =
                await Chat.create({

                    donation:
                        donationId,

                    chatType:
                        chatType,

                    participants:
                        participants,
                });
        }

        //////////////////////////////////////////////////////
        // POPULATE
        //////////////////////////////////////////////////////

        chat =
            await Chat.findById(
                chat._id
            ).populate(
                "participants",
                "username avatar role"
            );

        //////////////////////////////////////////////////////
        // RESPONSE
        //////////////////////////////////////////////////////

        res.status(200).json(chat);

    } catch (error) {

        console.log(
            "ACCESS CHAT ERROR => ",
            error
        );

        res.status(500).json({
            message:
                error.message
        });
    }
});

////////////////////////////////////////////////////////
// SEND MESSAGE
////////////////////////////////////////////////////////

router.post('/message', async (req, res) => {

    try {

        const {
            chatId,
            text,
            senderId,
        } = req.body;

        if (
            !chatId ||
            !text ||
            !senderId
        ) {

            return res.status(400).json({
                message:
                    "كل الحقول مطلوبة"
            });
        }

        //////////////////////////////////////////////////////
        // CREATE MESSAGE
        //////////////////////////////////////////////////////

        let newMessage =
            await Message.create({

                chat: chatId,

                sender: senderId,

                text: text,
            });

        //////////////////////////////////////////////////////
        // POPULATE
        //////////////////////////////////////////////////////

        newMessage =
            await newMessage.populate(
                "sender",
                "username avatar role"
            );

        //////////////////////////////////////////////////////
        // UPDATE LAST MESSAGE
        //////////////////////////////////////////////////////

        await Chat.findByIdAndUpdate(
            chatId,
            {
                lastMessage: {
                    text: text,
                    sender: senderId,
                    createdAt: new Date(),
                }
            }
        );

        //////////////////////////////////////////////////////
        // RESPONSE
        //////////////////////////////////////////////////////

        res.status(201).json(
            newMessage
        );

    } catch (error) {

        console.log(
            "SEND MESSAGE ERROR => ",
            error
        );

        res.status(500).json({
            message:
                "فشل إرسال الرسالة"
        });
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

module.exports = router;