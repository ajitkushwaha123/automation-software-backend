import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      required: true,
    },
    otp: {
      type: String,
      required: true,
    },
    expiry: {
      type: Date,
      default: () => Date.now() + 600000, 
      required: true,
    },
  },
  { timestamps: true }
);

export const Otp = mongoose.model("Otp", otpSchema);
