const express = require('express');
const router = express.Router();
const contentController = require('../controllers/content.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/research', protect, contentController.researchContent);

module.exports = router; 