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
  contentPreferences: {
    includeFeaturedImage: {
      type: Boolean,
      default: true
    },
    includeMetaDescription: {
      type: Boolean,
      default: true
    },
    includeTableOfContents: {
      type: Boolean,
      default: true
    },
    autoGenerateTags: {
      type: Boolean,
      default: true
    }
  },
  defaultTone: {
    type: String,
    enum: ['professional', 'casual', 'witty', 'authoritative', 'friendly'],
    default: 'professional'
  },
  defaultWordCount: {
    type: String,
    enum: ['500', '1000', '1500', '2000'],
    default: '1000'
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