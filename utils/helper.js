import mongoose from "mongoose";

export const checkEmailFormat = (email) => {
  if (!email) {
    return { success: false, msg: "Email is required... !" };
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, msg: "Invalid email format... !" };
  } else {
    return { success: true, msg: "Email is valid... !" };
  }
};

export const checkPassword = (password) => {
  if (!password) {
    return { success: false, msg: "Password is required... !" };
  } else if (password.length < 6) {
    return {
      success: false,
      msg: "Password must be at least 6 characters... !",
    };
  } else {
    return { success: true, msg: "Password is valid... !" };
  }
};

export const checkUsername = (username) => {
  if (!username) {
    return { success: false, msg: "Username is required... !" };
  } else if (username.length < 4 || username.length > 20) {
    return {
      success: false,
      msg: "Username must be between 4 and 20 characters... !",
    };
  } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return {
      success: false,
      msg: "Username can only contain letters, numbers, and underscores... !",
    };
  } else {
    return { success: true, msg: "Username is valid... !" };
  }
};

export const validateMongoIdFormat = (id) => {
  if (!id) {
    return { success: false, msg: "ID is required... !" };
  } else if (!mongoose.Types.ObjectId.isValid(id)) {
    return { success: false, msg: "Invalid ID format... !" };
  } else {
    return { success: true, msg: "ID is valid... !" };
  }
};


