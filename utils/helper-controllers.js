import User from "../models/User.js";
import { checkEmailFormat } from "./helper.js";

export const isValidEmail = (req, res, next) => {
  const { email } = req.body;

  try {
    if (!email) {
      res.status(400).json({ success: false, msg: "Email is required... !" });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res
        .status(400)
        .json({ success: false, msg: "Invalid email format... !" });
    }

    req.body.email = email;

    next();
  } catch (err) {
    res.status(500).json({ success: false, msg: "Internal Server Erorr... !" });
  }
};

export const findEmailViaUsernameOrEmail = async (req, res, next) => {
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

export const isUsernameExistInDB = async (req, res, next) => {
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

export const isEmailExistInDB = async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return res
      .status(400)
      .json({ success: false, msg: "Email is required... !" });
  }

  try {
    const userExist = await User.findOne({
      email: { $regex: `^${email}$`, $options: "i" },
    });

    if (userExist) {
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
