import jwt from "jsonwebtoken";
import cookie from "cookie";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

const auth = async (req, res, next) => {
  try {
    const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
    console.log("Cookies:", cookies);

    if (!cookies.authToken) {
      return res.status(401).json({
        success: false,
        msg: "Authentication token is missing. Please log in.",
      });
    }

    const token = cookies.authToken;

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        msg: "Server configuration error: JWT_SECRET is missing.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded Token:", decoded);

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        msg: "Invalid Token. Please log in again.",
      });
    }

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User not found. Token is invalid.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        msg: "User account is deactivated. Contact support.",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Auth Error:", err);

    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        msg: "Session expired. Please log in again.",
      });
    }

    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        msg: "Invalid token format. Please log in again.",
      });
    }

    return res.status(500).json({
      success: false,
      error: err.message,
      msg: "Internal Server Error. Please try again later.",
    });
  }
};

export default auth;
