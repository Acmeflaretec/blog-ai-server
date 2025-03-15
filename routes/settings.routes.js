const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settings.controller");
const { protect } = require("../middleware/auth.middleware");

// Protected routes
router.post("/generate-api-key", protect, settingsController.generateApiKey);

module.exports = router;
