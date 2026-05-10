const mongoose = require('mongoose');

const chatSchema =
  new mongoose.Schema(
    {
      donation: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: 'Donation',
        required: true,
      },

      participants: [
        {
          type:
            mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
      ],

      lastMessage: {
        text: {
          type: String,
          default: '',
        },

        sender: {
          type:
            mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },

        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    },
    {
      timestamps: true,
    },
  );

// منع التكرار
chatSchema.index(
  {
    donation: 1,
    participants: 1,
  },
  {
    unique: true,
  },
);

module.exports = mongoose.model(
  'Chat',
  chatSchema,
);