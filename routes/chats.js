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
    // CHECK OBJECT IDS
    //////////////////////////////////////////////////

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

    //////////////////////////////////////////////////
    // CHECK DONATION
    //////////////////////////////////////////////////

    const donation = await Donation.findById(
      donationId,
    );

    if (!donation) {

      return res.status(404).json({
        success: false,
        message: 'Donation not found',
      });
    }

    //////////////////////////////////////////////////
    // SORT PARTICIPANTS
    // مهم جداً لمنع duplicate key
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
      message: error.message,
    });
  }
});

module.exports = router;