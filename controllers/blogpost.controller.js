const BlogPost = require('../models/blogpost.model');

// Create a new blog post
exports.createPost = async (req, res) => {
  try {
    const { title, content, tags, featuredImage, status } = req.body;
    const userId = req.user.userId;

    const blogPost = new BlogPost({
      userId,
      title,
      content,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      featuredImage,
      status: status || 'draft'
    });

    await blogPost.save();

    res.status(201).json({
      message: 'Blog post created successfully',
      blogPost
    });
  } catch (error) {
    console.error('Create blog post error:', error);
    res.status(500).json({ message: 'Error creating blog post' });
  }
};

// Get all blog posts for a user
exports.getUserPosts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const posts = await BlogPost.find({ userId })
      .sort({ createdAt: -1 });

    res.status(200).json({ posts });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ message: 'Error fetching blog posts' });
  }
};

// Get a single blog post
exports.getPost = async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    res.status(200).json({ post });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ message: 'Error fetching blog post' });
  }
};

// Update a blog post
exports.updatePost = async (req, res) => {
  try {
    const { title, content, tags, featuredImage, status } = req.body;
    const userId = req.user.userId;

    const post = await BlogPost.findOne({ _id: req.params.id, userId });
    if (!post) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    const updatedPost = await BlogPost.findByIdAndUpdate(
      req.params.id,
      {
        title,
        content,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : post.tags,
        featuredImage: featuredImage || post.featuredImage,
        status: status || post.status
      },
      { new: true }
    );

    res.status(200).json({
      message: 'Blog post updated successfully',
      blogPost: updatedPost
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ message: 'Error updating blog post' });
  }
};

// Delete a blog post
exports.deletePost = async (req, res) => {
  try {
    const userId = req.user.userId;
    const post = await BlogPost.findOneAndDelete({ _id: req.params.id, userId });

    if (!post) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    res.status(200).json({ message: 'Blog post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ message: 'Error deleting blog post' });
  }
}; 