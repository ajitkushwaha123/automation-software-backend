import express from "express";

import {
  register,
  getAllUser,
  getUserById,
  login,
  verifyToken,
  getUser,
  refreshToken,
  generateOtp,
  verifyOtp,
  userEmailExist,
  usernameExist,
  deleteUser,
  userWithUsernameOrEmail,
  loginWithOtp,
  generateResetToken,
  verifyResetToken,
  resetPassword,
} from "../controllers/user.controllers.js";
import {
  sendLoginOtp,
  sendOTP,
  sendRegistrationSuccessEmail,
  resetPasswordEmail,
} from "../controllers/email.controllers.js";
import {
  findEmailViaUsernameOrEmail,
  isValidEmail,
  isUsernameExistInDB,
  isEmailExistInDB,
} from "../utils/helper-controllers.js";

const user = express.Router();

user.post(
  "/send-otp",
  isUsernameExistInDB,
  isValidEmail,
  isEmailExistInDB,
  generateOtp,
  sendOTP
);

user.post(
  "/register",
  verifyOtp,
  register,
  sendRegistrationSuccessEmail,
  loginWithOtp
);

user.get("/all", getAllUser);
user.get("/all/:id", getUserById);
user.post("/login", login);
user.get("/", verifyToken, getUser);
user.get("/refresh", refreshToken, verifyToken, getUser);
user.delete("/delete/:id", deleteUser);
user.post(
  "/send-login-otp",
  userWithUsernameOrEmail,
  generateOtp,
  sendLoginOtp
);
user.post("/login-otp", userWithUsernameOrEmail, verifyOtp, loginWithOtp);

user.get("/success-email", async (req, res) => {
  res.render("../views/otp.ejs", {
    userName: "John Doe",
    userEmail: "ajitkushwahacse@gmail.com",
    verificationCode: "1234",
  });
});

user.post(
  "/forget-password",
  findEmailViaUsernameOrEmail,
  generateResetToken,
  resetPasswordEmail
);

user.post("/reset-password", verifyResetToken, resetPassword);

export default user;
