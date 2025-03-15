const User = require("../models/user.model");

exports.generateApiKey = async (req, res) => {
  try {
    const apiKey = Array.from(Array(32), () =>
      Math.floor(Math.random() * 36).toString(36)
    ).join("");
    const user = await User.findByIdAndUpdate(req.user.userId, { apiKey });
    if (!user) {
      return res.status(404).json({ message: "User not authorized" });
    }
    res.json({ apiKey });
  } catch (error) {
    console.error("Error generating apiKey:", error);
    res.status(500).json({ message: "Error generating apiKey" });
  }
};
