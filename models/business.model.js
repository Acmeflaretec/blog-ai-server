const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  businessName: {
    type: String,
    required: true,
    trim: true
  },
  industry: {
    type: String,
    required: true,
    enum: ['ecommerce', 'health', 'tech', 'finance', 'education', 'travel', 'food', 'other']
  },
  targetAudience: {
    type: String,
    required: true,
    trim: true
  },
  primaryKeywords: {
    type: String,
    required: true,
    trim: true
  },
  preferredSources: {
    type: String,
    enum: ['googleTrends', 'reddit', 'twitter', 'industry', 'all'],
    default: 'all'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Business', businessSchema); 