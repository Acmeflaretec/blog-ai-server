const { generateTrendingTopicsWithAI } = require('../services/trending.service');
const Business = require('../models/business.model');

exports.getPersonalizedTrends = async (req, res) => {
  try {
    // Get user's business context
    const business = await Business.findOne({ userId: req.user.userId });
    
    if (!business) {
      return res.status(404).json({ 
        message: 'Business profile not found. Please complete your business profile first.',
        success: false
      });
    }

    // Construct business context
    const businessContext = {
      industry: business.industry,
      targetAudience: business.targetAudience,
      region: business.region || 'US'
    };

    // Validate business context
    if (!businessContext.industry || !businessContext.targetAudience) {
      return res.status(400).json({ 
        message: 'Business profile is incomplete. Please fill in the industry and target audience.',
        success: false,
        requiredFields: ['industry', 'targetAudience']
      });
    }

    console.log('Generating trending topics with AI for business context:', businessContext);

    // Get AI-generated trending topics based on business context
    const topics = await generateTrendingTopicsWithAI(businessContext);

    res.status(200).json({
      success: true,
      data: topics,
      message: 'AI-generated trending topics fetched successfully.'
    });

  } catch (error) {
    console.error('Error generating trending topics:', error);
    res.status(500).json({
      success: false,
      data: [
        "The Future of AI in Content Marketing",
        "How to Optimize Your Website for Voice Search",
        "10 Effective Social Media Strategies for 2025",
        "Sustainable Business Practices That Boost Profits",
        "Remote Work Culture: Building Team Cohesion"
      ],
      message: 'Error generating topics. Using default topics.'
    });
  }
}; 