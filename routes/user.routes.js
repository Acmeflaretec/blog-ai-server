const express = require("express");
const router = express.Router();
const blogPostController = require("../controllers/blogpost.controller");
const { authenticate } = require("../middleware/user.middleware");
const { updateProfile, resetPassword } = require('../controllers/user.controller');
const { protect } = require("../middleware/auth.middleware");

// Protected routes
router.get("/", authenticate, blogPostController.getAllPosts);
router.put('/profile', protect, updateProfile);
router.put('/reset-password', protect, resetPassword);

module.exports = router;
