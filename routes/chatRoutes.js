const express = require('express');
const router = express.Router();

const Chat = require('../models/Chat');
const User = require('../models/User');
const Donation = require('../models/Donation');

router.post('/access', async (req, res) => {

    try {

        console.log("BODY => ", req.body);

        const {
            donationId,
            senderId,
            targetRole,
        } = req.body;

        //////////////////////////////////////////////////////
        // VALIDATION
        //////////////////////////////////////////////////////

        if (!donationId || !senderId) {
            return res.status(400).json({
                success: false,
                message: "donationId or senderId missing"
            });
        }

        //////////////////////////////////////////////////////
        // FIND DATA
        //////////////////////////////////////////////////////

        const donation = await Donation.findById(
            donationId
        );

        const user = await User.findById(
            senderId
        );

        console.log("DONATION => ", donation);
        console.log("USER => ", user);

        if (!donation) {
            return res.status(404).json({
                success: false,
                message: "Donation not found"
            });
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (!donation.driver) {
            return res.status(400).json({
                success: false,
                message: "Driver not assigned yet"
            });
        }

        //////////////////////////////////////////////////////
        // CHAT TYPE
        //////////////////////////////////////////////////////

        let chatType = '';

        if (user.role === 'donor') {
            chatType = 'donor-driver';
        }

        else if (user.role === 'receiver') {
            chatType = 'receiver-driver';
        }

        else if (user.role === 'driver') {

            chatType =
                targetRole === 'donor'
                    ? 'donor-driver'
                    : 'receiver-driver';
        }

        console.log("CHAT TYPE => ", chatType);

        if (!chatType) {
            return res.status(400).json({
                success: false,
                message: "Invalid chat type"
            });
        }

        //////////////////////////////////////////////////////
        // FIND CHAT
        //////////////////////////////////////////////////////

        let chat = await Chat.findOne({
            donation: donationId,
            chatType: chatType,
        });

        //////////////////////////////////////////////////////
        // CREATE CHAT
        //////////////////////////////////////////////////////

        if (!chat) {

            let participants = [];

            if (chatType === 'donor-driver') {

                participants = [
                    donation.donor,
                    donation.driver,
                ];

            } else {

                participants = [
                    donation.receiver,
                    donation.driver,
                ];
            }

            console.log(
                "PARTICIPANTS => ",
                participants
            );

            chat = await Chat.create({
                donation: donationId,
                chatType,
                participants,
            });

            console.log("CHAT CREATED");
        }

        //////////////////////////////////////////////////////
        // RESPONSE
        //////////////////////////////////////////////////////

        const result =
            await Chat.findById(chat._id)
                .populate(
                    'participants',
                    'username avatar role'
                );

        return res.status(200).json({
            success: true,
            chat: result,
        });

    } catch (error) {

        console.log(
            "ACCESS CHAT ERROR => ",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

module.exports = router;