const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    interval: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
    },
    features: [
      {
        type: String,
        required: true,
      },
    ],
    limits: {
      postsPerMonth: {
        type: Number,
        required: true,
        min: 0,
      },
      aiCredits: {
        type: Number,
        required: true,
        min: 0,
      },
      teamMembers: {
        type: Number,
        required: true,
        min: 1,
      },
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add index for faster queries
subscriptionSchema.index({ isActive: 1, price: 1 });

module.exports = mongoose.model("Subscription", subscriptionSchema);
