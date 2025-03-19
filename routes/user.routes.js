const express = require("express");
const router = express.Router();
const {
  updateProfile,
  resetPassword,
} = require("../controllers/user.controller");
const { protect } = require("../middleware/auth.middleware");

// Protected routes
router.put("/profile", protect, updateProfile);
router.put("/reset-password", protect, resetPassword);

module.exports = router;
