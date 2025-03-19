const express = require('express');
const router = express.Router();
const blogPostController = require('../controllers/blogpost.controller');
const { protect } = require('../middleware/auth.middleware');

// All routes are protected and require authentication
router.use(protect);

// Create a new blog post
router.post('/', blogPostController.createPost);

// Get all posts for the authenticated user
router.get('/', blogPostController.getAllPosts);

// Get a single post
router.get('/:id', blogPostController.getPost);

// Update a post
router.put('/:id', blogPostController.updatePost);

// Delete a post
router.delete('/:id', blogPostController.deletePost);

module.exports = router; 