const User = require("../models/user.model");

exports.authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized access" });
    }
    const apiKey = token.split(" ")[1];
    const user = await User.findOne({ apiKey });
    req.user = user;
    req.user.userId = user._id;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ message: "Unauthorized access" });
  }
};
