const mongoose = require("mongoose");

const connectionSchema = new mongoose.Schema(
  {
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      validate: {
        validator: function (value) {
          return value.toString() !== this.toUserId.toString();
        },
        message: "Cannot send a connection request to yourself!",
      },
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: {
        values: ["ignored", "interested", "accepted", "rejected","matched","pending"],
        message: `{VALUE} not a valid status type!!`,
      },
      default: "interested",
      required: true,
    },
    likedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }]
  },
  { timestamps: true }
);

// removed broken pre save hook
// compound index mongoose
connectionSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true });

const connectionModel = mongoose.model("Connection", connectionSchema);

module.exports = connectionModel;
