const OpenAI = require('openai');

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate trending topics using AI based on business context
 * @param {Object} businessContext - The business context object containing industry and audience info
 * @returns {Promise<Array>} Array of trending topics
 */
async function generateTrendingTopicsWithAI(businessContext) {
  try {
    const { industry, targetAudience } = businessContext;

    const prompt = `Generate 5 trending and engaging blog post topics for a ${industry} business targeting ${targetAudience}.
    
Requirements:
1. Topics should be current and relevant for ${new Date().getFullYear()}
2. Each topic should be SEO-friendly and engaging
3. Topics should be specific to the ${industry} industry
4. Consider the target audience: ${targetAudience}
5. Each topic should be 5-10 words long
6. Format as a simple array of strings

Example format:
[
  "How AI is Transforming Healthcare in 2024",
  "Top 5 Digital Marketing Trends for SMBs"
]`;

    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { 
          role: "system", 
          content: "You are a content strategy expert who understands current industry trends and SEO best practices. Generate trending topics that are specific, actionable, and relevant to the target audience." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const response = completion.choices[0].message.content;
    
    // Parse the response and clean up
    let topics = [];
    try {
      topics = JSON.parse(response);
    } catch (e) {
      // If JSON parsing fails, try to extract topics using regex
      topics = response
        .split(/\n/)
        .map(line => line.replace(/^[-*\d.]+\s*/, '').trim())
        .filter(line => line.length > 0 && line.length < 100);
    }

    // Ensure we have exactly 5 topics
    topics = topics.slice(0, 5);

    return topics;
  } catch (error) {
    console.error('Error generating trending topics with AI:', error);
    // Return default topics as fallback
    return [
      `Latest ${industry} Trends for ${new Date().getFullYear()}`,
      `How to Optimize Your ${industry} Strategy`,
      `Top 5 ${industry} Innovations to Watch`,
      `Building a Successful ${industry} Business`,
      `Essential ${industry} Tips for ${targetAudience}`,
    ];
  }
}

module.exports = {
  generateTrendingTopicsWithAI
}; 