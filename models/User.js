import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      unique: [true, "Username must be unique."],
      required: [true, "Username is required."],
      trim: true,
      minlength: [3, "Username must be at least 3 characters long."],
      maxlength: [30, "Username cannot exceed 30 characters."],
    },
    name: {
      type: String,
      trim: true,
      minlength: [2, "Name must be at least 2 characters long."],
      maxlength: [50, "Name cannot exceed 50 characters."],
    },
    email: {
      type: String,
      unique: [true, "Email must be unique."],
      required: [true, "Email is required."],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format."],
      trim: true,
    },
    password: {
      type: String,
      minlength: [8, "Password must be at least 8 characters long."],
    },
    phone: {
      type: String,
      match: [/^[0-9]{10}$/, "Phone number must be a valid 10-digit number."],
      trim: true,
    },
    role: {
      type: String,
      enum: {
        values: ["owner", "staff", "admin"],
        message: "Role must be one of 'owner', 'staff', or 'admin'.",
      },
      default: "owner",
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
    },
    staff: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Staff",
      },
    ],
    subscriptionPlan: {
      type: String,
      enum: {
        values: ["free", "basic", "premium"],
        message: "Subscription plan must be 'free', 'basic', or 'premium'.",
      },
      default: "free",
    },
    accessPermissions: {
      billing: { type: Boolean, default: true },
      reports: { type: Boolean, default: true },
      menuManagement: { type: Boolean, default: true },
      staffManagement: { type: Boolean, default: true },
      settings: { type: Boolean, default: true },
    },
    profilePicture: {
      type: String,
      match: [
        /^(https?:\/\/.*\.(?:png|jpg|jpeg|svg))$/,
        "Profile picture must be a valid image URL.",
      ],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
    subscriptionRenewalDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
