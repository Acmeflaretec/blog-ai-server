const express = require('express');
const router = express.Router();
const businessController = require('../controllers/business.controller');
const { protect } = require('../middleware/auth.middleware');

// Protected route - requires authentication
router.post('/onboarding', protect, businessController.saveOnboarding);

module.exports = router; 