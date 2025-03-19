const express = require('express');
const router = express.Router();
const { getPersonalizedTrends } = require('../controllers/trending.controller');
const { protect } = require('../middleware/auth.middleware');

// Get personalized trending topics
router.get('/', protect, getPersonalizedTrends);

module.exports = router; 