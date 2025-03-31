const express = require('express');
const router = express.Router();
const scraperController = require('../controllers/scraper.controller');
const { protect } = require('../middleware/auth.middleware');

// Apply authentication middleware to all routes
router.use(protect);

// Scrape content from a URL
router.post('/scrape', scraperController.scrapeContent);

// Process scraped content and create a blog post
router.post('/process', scraperController.processContent);

// Get user's scraping history
router.get('/history', scraperController.getScrapingHistory);

module.exports = router; 