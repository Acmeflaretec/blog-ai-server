const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const { authenticate } = require('../middleware/admin.middleware');

// Public routes
router.get('/plans', subscriptionController.getActivePlans);

// Admin routes - protected by authentication
router.use(authenticate);

// CRUD operations
router.post('/', subscriptionController.createSubscription);
router.get('/', subscriptionController.getAllSubscriptions);
router.get('/:id', subscriptionController.getSubscription);
router.put('/:id', subscriptionController.updateSubscription);
router.delete('/:id', subscriptionController.deleteSubscription);

module.exports = router; 