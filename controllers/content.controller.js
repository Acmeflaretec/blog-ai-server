const { generateContentSuggestion, analyzeSEO } = require('../services/openai.service');
const Business = require('../models/business.model');

exports.researchContent = async (req, res) => {
  try {
    console.log('Received research request:', req.body);
    const { topic, wordCount = 800 } = req.body;
    const userId = req.user.userId;

    if (!topic) {
      return res.status(400).json({
        message: 'Topic is required',
        error: 'MISSING_TOPIC'
      });
    }

    // Validate word count
    const minWords = 300;
    const maxWords = 3000;
    const validatedWordCount = Math.min(Math.max(parseInt(wordCount) || 800, minWords), maxWords);

    // Get user's business context
    const business = await Business.findOne({ userId });
    if (!business) {
      return res.status(404).json({ 
        message: 'Business profile not found. Please complete your business profile first.',
        error: 'BUSINESS_NOT_FOUND'
      });
    }

    console.log('Found business context:', {
      userId,
      businessId: business._id,
      industry: business.industry,
      hasKeywords: !!business.primaryKeywords
    });

    // Ensure business has required fields
    if (!business.industry || !business.targetAudience || !business.primaryKeywords) {
      return res.status(400).json({
        message: 'Incomplete business profile. Please update your business profile with all required information.',
        error: 'INCOMPLETE_BUSINESS_PROFILE'
      });
    }

    const businessContext = {
      industry: business.industry,
      targetAudience: business.targetAudience,
      primaryKeywords: business.primaryKeywords
    };

    console.log('Generating content suggestion...');
    const result = await generateContentSuggestion(topic, businessContext, validatedWordCount);
    
    // Validate the result structure
    if (!result || typeof result !== 'object') {
      console.error('Invalid result structure:', result);
      return res.status(500).json({
        message: 'Failed to generate content structure',
        error: 'INVALID_CONTENT_STRUCTURE'
      });
    }

    // Check for required fields
    if (!result.title || !result.content) {
      console.error('Missing required fields in generated content:', {
        hasTitle: !!result.title,
        hasContent: !!result.content
      });
      return res.status(500).json({
        message: 'Generated content is missing required fields',
        error: 'INCOMPLETE_CONTENT'
      });
    }

    console.log('Content generated successfully:', {
      source: result.source,
      wordCount: result.wordCount,
      hasTitle: !!result.title,
      hasContent: !!result.content,
      contentLength: result.content.length
    });

    // If SEO analysis wasn't included in the result, generate it now
    const seoAnalysis = result.seoAnalysis || analyzeSEO(
      result.content,
      result.keywords,
      result.meta
    );

    // Prepare the response
    const response = {
      suggestion: {
        title: result.title,
        meta: result.meta || `Guide about ${topic} for ${business.industry} businesses`,
        keywords: result.keywords || [topic.toLowerCase(), business.industry.toLowerCase()],
        outline: result.content, // Use content field for outline
        wordCount: result.wordCount
      },
      source: result.source || 'openai',
      wordCount: result.wordCount,
      seoAnalysis // Include SEO analysis in the response
    };

    res.json(response);
  } catch (error) {
    console.error('Content research error:', error);
    
    // Send more specific error messages
    if (error.message.includes('Invalid topic') || error.message.includes('businessContext')) {
      res.status(400).json({
        message: error.message,
        error: 'VALIDATION_ERROR'
      });
    } else if (error.code === 'insufficient_quota' || error.message.includes('API key')) {
      res.status(503).json({
        message: 'AI service temporarily unavailable.',
        error: 'AI_SERVICE_UNAVAILABLE'
      });
    } else {
      res.status(500).json({ 
        message: 'Error generating content suggestion. Please try again later.',
        error: 'INTERNAL_ERROR',
        details: error.message
      });
    }
  }
}; 