const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const { authenticate } = require("../middleware/admin.middleware");

router.post("/login", adminController.login);
router.use(authenticate);

// Dashboard analytics
router.get("/analytics", adminController.getDashboardAnalytics);
// User details
router.get("/users", adminController.getUserDetails);
// User statistics
router.get("/users-stats", adminController.getUserStats);
// Content performance metrics
router.get("/content", adminController.getContentMetrics);

module.exports = router;
