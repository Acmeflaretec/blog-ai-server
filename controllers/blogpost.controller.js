const BlogPost = require("../models/blogpost.model");

// Create a new blog post
exports.createPost = async (req, res) => {
  try {
    const {
      title,
      metaTitle,
      description,
      keywords,
      content,
      tags,
      featuredImage,
      status,
      slug,
      wordCount,
    } = req.body;
    const userId = req.user.userId;

    // Handle both array and string inputs for tags and keywords
    const tagsArray = Array.isArray(tags) 
      ? tags 
      : tags ? tags.split(",").map((tag) => tag.trim()) : [];
    
    const keywordsArray = Array.isArray(keywords)
      ? keywords
      : keywords ? keywords.split(",").map((keyword) => keyword.trim()) : [];

    const post = new BlogPost({
      userId,
      title,
      metaTitle,
      description,
      keywords: keywordsArray,
      content,
      tags: tagsArray,
      featuredImage,
      status,
      slug,
      wordCount,
    });

    await post.save();
    res.status(201).json({ post });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ error: "Failed to create blog post" });
  }
};

// Get all blog posts
exports.getAllPosts = async (req, res) => {
  try {
    const { userId } = req.user;
    const posts = await BlogPost.find({ userId }).sort({ createdAt: -1 });
    res.json({ posts });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: "Failed to fetch blog posts" });
  }
};

// Get a single blog post
exports.getPost = async (req, res) => {
  try {
    const post = await BlogPost.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!post) {
      return res.status(404).json({ error: "Blog post not found" });
    }

    res.json({ post });
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ error: "Failed to fetch blog post" });
  }
};

// Update a blog post
exports.updatePost = async (req, res) => {
  try {
    const {
      title,
      metaTitle,
      description,
      keywords,
      content,
      tags,
      featuredImage,
      status,
    } = req.body;

    // Convert tags and keywords strings to arrays if they're provided
    const tagsArray = tags ? tags.split(",").map((tag) => tag.trim()) : [];
    const keywordsArray = keywords
      ? keywords.split(",").map((keyword) => keyword.trim())
      : [];

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const post = await BlogPost.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      {
        title,
        metaTitle,
        description,
        keywords: keywordsArray,
        content,
        tags: tagsArray,
        featuredImage,
        status,
        slug,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({ error: "Blog post not found" });
    }

    res.json({ post });
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({ error: "Failed to update blog post" });
  }
};

// Delete a blog post
exports.deletePost = async (req, res) => {
  try {
    const post = await BlogPost.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!post) {
      return res.status(404).json({ error: "Blog post not found" });
    }

    res.json({ message: "Blog post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ error: "Failed to delete blog post" });
  }
};
