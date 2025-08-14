export const tryCatch = (handler) => {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      console.error("Error:", error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, msg: "Internal Server Error" });
      }
    }
  };
};
