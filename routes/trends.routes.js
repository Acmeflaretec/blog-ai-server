const express = require('express');
const router = express.Router();
const trendsController = require('../controllers/trends.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/', protect, trendsController.getTrends);

module.exports = router; 