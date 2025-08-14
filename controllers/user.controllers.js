import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import dotenv from "dotenv";
import {
  checkEmailFormat,
  checkPassword,
  checkUsername,
  validateMongoIdFormat,
} from "../utils/helper.js";
import otpGenerator from "otp-generator";
import { Otp } from "../models/Otp.js";
import crypto from "crypto";

dotenv.config();

export const register = async (req, res, next) => {
  const { email, password, username } = req.body;

  console.log(email, password, username);

  try {
    const validEmail = checkEmailFormat(email);

    if (validEmail.success === false) {
      return res.status(400).json({ success: false, msg: validEmail.msg });
    }

    const validPassword = checkPassword(password);
    if (validPassword.success === false) {
      return res.status(400).json({ success: false, msg: validPassword.msg });
    }

    const validUsername = checkUsername(username);
    if (validUsername.success === false) {
      return res.status(400).json({ success: false, msg: validUsername.msg });
    }

    const emailExist = await User.findOne({
      email: { $regex: `^${email}$`, $options: "i" },
    });
    if (emailExist) {
      return res
        .status(400)
        .json({ success: false, msg: "Email already exists... !" });
    }

    const usernameExist = await User.findOne({
      username: { $regex: `^${username}$`, $options: "i" },
    });
    if (usernameExist) {
      return res
        .status(400)
        .json({ success: false, msg: "Username already exists... !" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      password: hashedPassword,
    });

    await user.save();

    req.body.usernameOrEmail = email;
    req.body.password = password;

    const sanitizedUser = {
      username: user.username,
      email: user.email,
      id: user._id,
    };

    // res.status(201).json({
    //   success: true,
    //   user: sanitizedUser,
    //   msg: "User registered successfully... !",
    // });

    req.subject = "Welcome to Kravy! 🎉 Your Account is Ready";
    next();
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        msg: "Duplicate key error: Email or username already exists.",
      });
    }
    return res.status(500).json({ success: false, error: err });
  }
};

export const getAllUser = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (page < 1 || limit < 1) {
      return res.status(400).json({
        success: false,
        msg: "Page and limit must be greater than 0... !",
      });
    }

    const users = await User.find()
      .skip((page - 1) * limit)
      .limit(limit);

    if (!users.length) {
      return res.status(404).json({
        success: false,
        msg: "No users found... !",
      });
    }

    return res.status(200).json({
      success: true,
      users,
      msg: "Users Data fetched successfully... !",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, error: err, msg: "Internal Server Error... !" });
  }
};

export const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const validId = validateMongoIdFormat(userId);
    console.log(validId);
    if (validId.success === false) {
      return res.status(400).json({ success: false, msg: validId.msg });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, msg: "User not found... !" });
    }

    return res
      .status(200)
      .json({ success: true, user, msg: "User fetched successfully... !" });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, error: err, msg: "Internal Server Error... !" });
  }
};

export const login = async (req, res) => {
  console.log("login");
  const { usernameOrEmail, password } = req.body;

  console.log(usernameOrEmail, password);
  let user;

  if (!usernameOrEmail) {
    return res
      .status(400)
      .json({ success: false, msg: "Username or Email is required... !" });
  }

  if (!password) {
    return res
      .status(400)
      .json({ success: false, msg: "Password is required... !" });
  }

  const validEmail = checkEmailFormat(usernameOrEmail);
  if (validEmail.success === true) {
    user = await User.findOne({
      email: { $regex: `^${usernameOrEmail}$`, $options: "i" },
    });
  } else {
    user = await User.findOne({
      username: { $regex: `^${usernameOrEmail}$`, $options: "i" },
    });
  }

  if (!user) {
    return res.status(404).json({ success: false, msg: "User not found... !" });
  }

  if (!user.isActive) {
    return res
      .status(403)
      .json({ success: false, msg: "User account is deactivated... !" });
  }

  const isPasswordMatched = bcrypt.compareSync(password, user.password);
  if (!isPasswordMatched) {
    return res
      .status(400)
      .json({ success: false, msg: "Invalid Password... !" });
  }

  console.log("user", user);

  try {
    const token = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );


    console.log("token", token);
    res.cookie("authToken", token, {
      path: "/",
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });


    return res.status(200).json({
      success: true,
      user,
      token,
      msg: "User logged in successfully... !",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, error: err, msg: "Internal Server  Error... !" });
  }
};

export const verifyToken = async (req, res, next) => {
  try {
    const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
    console.log("cookies", cookies);

    if (!cookies.authToken) {
      return res.status(400).json({
        success: false,
        msg: "Authentication token is missing. Please log in.",
      });
    }

    const token = cookies.authToken;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("decoded", decoded);

    if (!decoded || !decoded.id) {
      return res
        .status(401)
        .json({ success: false, msg: "Invalid Token... !" });
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User not found. Token is invalid... !",
      });
    }

    if (!user.isActive) {
      return res
        .status(403)
        .json({ success: false, msg: "User account is deactivated... !" });
    }

    req.id = user.id;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        msg: "Token Expired. Please login again... !",
      });
    }

    if (err.name === "JsonWebTokenError") {
      return res
        .status(401)
        .json({ success: false, msg: "Invalid Token Format... !" });
    }

    return res
      .status(500)
      .json({ success: false, error: err, msg: "Internal Server Error... !" });
  }
};

export const getUser = async (req, res) => {
  const userId = req.id;

  const validId = validateMongoIdFormat(userId);
  if (validId.success === false) {
    return res.status(400).json({ success: false, msg: validId.msg });
  }

  try {
    const user = await User.findById(userId, "-password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, msg: "User not found... !" });
    }

    return res
      .status(200)
      .json({ success: true, user, msg: "User fetched successfully... !" });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, error: err, msg: "Internal Server Error... !" });
  }
};

export const refreshToken = async (req, res, next) => {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  console.log("cookies", cookies);

  if (!cookies.authToken) {
    return res.status(400).json({
      success: false,
      msg: "Authentication token is missing. Please log in.",
    });
  }

  const token = cookies.authToken;

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log("decoded", decoded);

  if (!decoded || !decoded.id) {
    return res.status(401).json({ success: false, msg: "Invalid Token... !" });
  }

  res.clearCookie("authToken");
  req.cookies.authToken = null;

  const newToken = jwt.sign(
    {
      id: decoded.id,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.cookie("authToken", newToken, {
    path: "/",
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  req.id = decoded.id;
  next();
};

export const generateOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    const code = otpGenerator.generate(4, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
    });

    console.log(`Generated OTP: ${code}`);

    const existingOtp = await Otp.findOne({ email });

    if (existingOtp) {
      await Otp.findByIdAndUpdate(existingOtp._id, {
        otp: code,
        expiry: Date.now() + 600000,
      });
    } else {
      const newOtp = new Otp({
        email,
        otp: code,
        expiry: Date.now() + 600000,
      });
      const savedOtp = await newOtp.save();

      console.log("Pto", savedOtp);
    }

    req.otp = code;

    next();
  } catch (err) {
    console.error("Error generating OTP:", err);
    res.status(500).json({
      success: false,
      error: err.message,
      msg: "Internal Server Error... !",
    });
  }
};

export const verifyOtp = async (req, res, next) => {
  const { otp, email } = req.body;
  const validEmail = checkEmailFormat(email);
  if (validEmail.success === false) {
    return res.status(400).json({ success: false, msg: validEmail.msg });
  }

  if (!otp) {
    return res
      .status(400)
      .json({ success: false, msg: "OTP is required... !" });
  }

  try {
    console.log("otppp", otp);
    const existingOtp = await Otp.findOne({ email });
    console.log("existingOtp", existingOtp);
    if (!existingOtp) {
      return res
        .status(404)
        .json({ success: false, msg: "OTP not found... !" });
    }

    console.log(existingOtp);

    if (existingOtp.otp !== otp) {
      return res.status(400).json({ success: false, msg: "Invalid OTP... !" });
    }

    if (existingOtp.expiry < Date.now()) {
      return res.status(400).json({ success: false, msg: "OTP expired... !" });
    }

    console.log(existingOtp);
    next();
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, error: err, msg: "Internal Server Error... !" });
  }
};

export const userEmailExist = async (req, res, next) => {
  try {
    const { email } = req.body;
    const correctEmail = checkEmailFormat(email);

    if (correctEmail.success === false) {
      return res.status(400).json({ success: false, msg: correctEmail.msg });
    }

    const emailExist = await User.findOne({
      email: { $regex: `^${req.body.email}$`, $options: "i" },
    });

    if (emailExist) {
      return res
        .status(400)
        .json({ success: false, msg: "Email already exists... !" });
    }

    next();
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, error: err, msg: "Internal Server Error... !" });
  }
};

export const usernameExist = async (req, res, next) => {
  const { username } = req.body;
  if (!username) {
    return res
      .status(400)
      .json({ success: false, msg: "Username is required... !" });
  }

  try {
    const userExist = await User.findOne({
      username: { $regex: `^${username}$`, $options: "i" },
    });

    if (userExist) {
      return res
        .status(400)
        .json({ success: false, msg: "Username already exists... !" });
    }

    next();
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, error: err, msg: "Internal Server Error... !" });
  }
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;
  const validId = validateMongoIdFormat(id);

  if (validId.success === false) {
    return res.status(400).json({ success: false, msg: validId.msg });
  }

  try {
    const user = await User.findByIdAndDelete(id);
    return res.status(200).json({
      success: true,
      user,
      msg: "User deleted successfully... !",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, error: err, msg: "Internal Server Error... !" });
  }
};

export const loginWithOtp = async (req, res) => {
  const { email } = req.body;

  console.log("email", email);

  const user = req.user || (await User.findOne({ email }));

  if (!user) {
    return res.status(404).json({
      success: false,
      msg: "User not found... !",
    });
  }

  console.log("user", user);

  try {
    const token = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    console.log("token", token);

    res.cookie("authToken", token, {
      path: "/",
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    console.log("Cookie options:", {
      path: "/",
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });


    return res.status(200).json({
      success: true,
      user,
      token,
      msg: "User logged in successfully... !",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
      msg: "Internal Server Error... !",
    });
  }
};

export const userWithUsernameOrEmail = async (req, res, next) => {
  const { usernameOrEmail } = req.body;

  let user;

  try {
    if (!usernameOrEmail) {
      return res
        .status(400)
        .json({ success: false, msg: "Username or Email is required... !" });
    }

    const validEmail = checkEmailFormat(usernameOrEmail);
    if (validEmail.success === true) {
      user = await User.findOne({
        email: { $regex: `^${usernameOrEmail}$`, $options: "i" },
      });
    } else {
      user = await User.findOne({
        username: { $regex: `^${usernameOrEmail}$`, $options: "i" },
      });
    }

    if (!user) {
      return res
        .status(404)
        .json({ success: false, msg: "User not found... !" });
    }

    if (!user.isActive) {
      return res
        .status(403)
        .json({ success: false, msg: "User account is deactivated... !" });
    }

    req.user = user;
    console.log("user", user);
    req.body.email = user.email;
    next();
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, error: err, msg: "Internal Server Error... !" });
  }
};

export const generateResetToken = async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return res
      .status(400)
      .json({ success: false, msg: "Email is required... !" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, msg: "User not found... !" });
    }

    const resetToken = crypto.randomBytes(20).toString("hex");

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

    await user.save();

    const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;
    req.body.resetPasswordExpires = user.resetPasswordExpires;
    req.body.resetPasswordToken = user.resetPasswordToken;

    console.log("updated user", user);

    next();
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, error: err, msg: "Internal Server Error... !" });
  }
};

export const verifyResetToken = async (req, res, next) => {
  try {
    const { resetPasswordToken } = req.body;

    if (!resetPasswordToken) {
      return res.status(400).json({
        success: false,
        msg: "Reset Password Token is required.",
      });
    }

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() }, 
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        msg: "Invalid or Expired Token.",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || err,
      msg: "Internal Server Error.",
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    const user = req.user;

    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        msg: "Password and Confirm Password are required.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        msg: "Password and Confirm Password do not match.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        msg: "Password must be at least 6 characters long.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      msg: "Password reset successfully.",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || err,
      msg: "Internal Server Error.",
    });
  }
};
