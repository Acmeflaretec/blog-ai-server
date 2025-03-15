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
  }
}, {
  timestamps: true
});

// Calculate read time before saving
blogPostSchema.pre('save', function(next) {
  const wordsPerMinute = 200;
  const wordCount = this.content.split(/\s+/).length;
  this.readTime = Math.ceil(wordCount / wordsPerMinute);
  next();
});

module.exports = mongoose.model('BlogPost', blogPostSchema); 