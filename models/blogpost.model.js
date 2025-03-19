const mongoose = require('mongoose');

const blogPostSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  metaTitle: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  keywords: [{
    type: String,
    trim: true
  }],
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  featuredImage: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  readTime: {
    type: Number,
    default: 0
  },
  wordCount: {
    type: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Generate slug from title before saving
blogPostSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  
  // Calculate read time
  const wordsPerMinute = 200;
  const wordCount = this.content.split(/\s+/).length;
  this.readTime = Math.ceil(wordCount / wordsPerMinute);
  
  next();
});

module.exports = mongoose.model('BlogPost', blogPostSchema); 