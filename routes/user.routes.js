const express = require("express");
const router = express.Router();
const blogPostController = require("../controllers/blogpost.controller");
const { authenticate } = require("../middleware/user.middleware");

// Protected routes
router.get("/", authenticate, blogPostController.getUserPosts);

module.exports = router;
