const { getTrendingTopics } = require('../services/trends.service');
const Business = require('../models/business.model');

exports.getTrends = async (req, res) => {
  try {
    // Get complete business profile with all fields
    const business = await Business.findOne({ userId: req.user.userId })
      .select('-__v')
      .lean();
    
    if (!business) {
      return res.status(404).json({ 
        message: 'Business profile not found. Please complete onboarding first.',
        success: false
      });
    }

    // Construct comprehensive business context
    const businessContext = {
      industry: business.industry,
      targetAudience: business.targetAudience,
      businessName: business.businessName,
      region: business.region || 'US',
      keywords: business.primaryKeywords
    };

    // Validate essential business context
    const requiredFields = ['industry', 'targetAudience', 'businessName'];
    const missingFields = requiredFields.filter(field => !businessContext[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: 'Business profile is incomplete. Please fill in all required fields.',
        success: false,
        requiredFields: missingFields
      });
    }

    console.log('Fetching trends with business context:', {
      ...businessContext,
      // Exclude potentially sensitive data from logs
      keywords: '[FILTERED]'
    });

    // Get trending topics based on comprehensive business context
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

