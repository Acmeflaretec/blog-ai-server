const express = require("express");
const {
  getBusinessSettings,
  updateBusinessSettings,
  generateApiKey,
} = require("../controllers/settings.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

// Business settings routes
router.get("/personalize", protect, getBusinessSettings);
router.post("/personalize", protect, updateBusinessSettings);
router.post("/generate-api-key", protect, generateApiKey);

module.exports = router;
