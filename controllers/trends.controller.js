const { getTrendingTopics } = require('../services/trends.service');
const Business = require('../models/business.model');

exports.getTrends = async (req, res) => {
  try {
    // Get user's business context
    const business = await Business.findOne({ userId: req.user.userId });
    
    if (!business) {
      return res.status(404).json({ 
        message: 'Business profile not found. Please complete onboarding first.',
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

    console.log('Fetching trends with business context:', businessContext);

    // Get trending topics based on business context
    const trends = await getTrendingTopics(businessContext);

    if (!trends || trends.length === 0) {
      return res.status(200).json({ 
        message: 'No trends found for your business context.',
        success: true,
        data: [],
        businessContext
      });
    }

    // Respond with trends and additional metadata
    res.status(200).json({ 
      message: 'Trending topics fetched successfully.',
      success: true,
      data: trends,
      totalTrends: trends.length,
      businessContext,
      fetchedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get trends error:', error);
    res.status(500).json({ 
      message: 'Error fetching trending topics',
      success: false,
      error: error.message
    });
  }
};

