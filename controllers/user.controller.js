const bcrypt = require("bcryptjs");
const User = require("../models/user.model");

exports.updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Update name if provided
    if (name) {
      user.name = name;
    }

    await user.save();

    res.json({
      status: "success",
      data: {
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to update profile",
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }
    user.password = password;
    await user.save();

    res.json({
      status: "success",
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to reset password",
    });
  }
};
