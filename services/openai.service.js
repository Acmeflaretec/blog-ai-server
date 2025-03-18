const OpenAI = require('openai');
const cheerio = require('cheerio');

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper functions
const countWords = (text) => {
  return text.replace(/[^\w\s-]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 0).length;
};

const extractTextFromHTML = (html) => {
  const $ = cheerio.load(html);
  return $('body').text();
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate keyword density for a given text and keyword
 * @param {string} text - The content to analyze
 * @param {string} keyword - The keyword to check density for
 * @returns {number} Keyword density percentage
 */
const calculateKeywordDensity = (text, keyword) => {
  if (!text || !keyword) return 0;
  
  const words = text.toLowerCase().replace(/[^\w\s-]/g, '').split(/\s+/).filter(Boolean);
  const keywordLower = keyword.toLowerCase();
  const keywordCount = words.filter(word => word === keywordLower).length;
  
  return words.length > 0 ? (keywordCount / words.length) * 100 : 0;
};

/**
 * Calculate readability score using Flesch-Kincaid formula
 * @param {string} text - The content to analyze
 * @returns {number} Readability score (0-100)
 */
const calculateReadability = (text) => {
  if (!text) return 0;
  
  // Remove HTML tags
  const plainText = text.replace(/<[^>]*>/g, '');
  
  // Count sentences, words, and syllables
  const sentences = plainText.split(/[.!?]+/).filter(Boolean);
  const words = plainText.split(/\s+/).filter(Boolean);
  
  if (sentences.length === 0 || words.length === 0) return 0;
  
  // Estimate syllables (simplified method)
  const syllables = words.reduce((count, word) => {
    const wordLower = word.toLowerCase();
    const syllableCount = wordLower.replace(/[^aeiouy]/g, '')
      .replace(/[aeiouy]+/g, 'a')
      .replace(/a+/g, 'a').length;
    return count + Math.max(1, syllableCount);
  }, 0);
  
  // Calculate Flesch-Kincaid Reading Ease
  const score = 206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syllables / words.length);
  
  // Ensure score is in 0-100 range
  return Math.min(100, Math.max(0, score));
};

/**
 * Analyze heading structure in HTML content
 * @param {string} html - The HTML content to analyze
 * @returns {Object} Analysis of headings
 */
const analyzeHeadings = (html) => {
  const $ = cheerio.load(html);
  const headings = {
    h1: $('h1').length,
    h2: $('h2').length,
    h3: $('h3').length,
    h4: $('h4').length,
    h5: $('h5').length,
    h6: $('h6').length,
    total: 0,
    structure: 'No headings found',
    issues: []
  };
  
  headings.total = headings.h1 + headings.h2 + headings.h3 + headings.h4 + headings.h5 + headings.h6;
  
  // Check for heading structure issues
  if (headings.h1 === 0) {
    headings.issues.push('Missing H1 heading');
  } else if (headings.h1 > 1) {
    headings.issues.push('Multiple H1 headings (recommended: only one H1)');
  }
  
  if (headings.total === 0) {
    headings.issues.push('No headings found');
  } else if (headings.h2 === 0 && (headings.h3 > 0 || headings.h4 > 0)) {
    headings.issues.push('Skipped H2 heading level');
  }
  
  // Analyze heading structure
  if (headings.total > 0) {
    headings.structure = 'Found:';
    if (headings.h1 > 0) headings.structure += ` ${headings.h1} H1,`;
    if (headings.h2 > 0) headings.structure += ` ${headings.h2} H2,`;
    if (headings.h3 > 0) headings.structure += ` ${headings.h3} H3,`;
    if (headings.h4 > 0) headings.structure += ` ${headings.h4} H4,`;
    if (headings.h5 > 0) headings.structure += ` ${headings.h5} H5,`;
    if (headings.h6 > 0) headings.structure += ` ${headings.h6} H6,`;
    
    // Remove trailing comma
    headings.structure = headings.structure.substring(0, headings.structure.length - 1);
  }
  
  return headings;
};

/**
 * Analyze links in HTML content
 * @param {string} html - The HTML content to analyze
 * @returns {Object} Analysis of links
 */
const analyzeLinks = (html) => {
  const $ = cheerio.load(html);
  const links = {
    total: $('a').length,
    internal: 0,
    external: 0,
    issuesFound: []
  };
  
  // Count internal vs external links
  $('a').each((i, link) => {
    const href = $(link).attr('href');
    if (!href) {
      links.issuesFound.push('Link without href attribute found');
      return;
    }
    
    if (href.startsWith('http') || href.startsWith('https')) {
      links.external++;
    } else {
      links.internal++;
    }
    
    if (!$(link).text().trim()) {
      links.issuesFound.push('Empty link text found');
    }
  });
  
  return links;
};

/**
 * Analyze images in HTML content
 * @param {string} html - The HTML content to analyze
 * @returns {Object} Analysis of images
 */
const analyzeImages = (html) => {
  const $ = cheerio.load(html);
  const images = {
    total: $('img').length,
    missingAlt: 0,
    emptyAlt: 0
  };
  
  // Check for missing alt text
  $('img').each((i, img) => {
    const alt = $(img).attr('alt');
    if (alt === undefined) {
      images.missingAlt++;
    } else if (alt.trim() === '') {
      images.emptyAlt++;
    }
  });
  
  return images;
};

/**
 * Perform SEO analysis on content
 * @param {string} content - HTML content to analyze
 * @param {Array} keywords - Array of target keywords
 * @param {string} meta - Meta description
 * @returns {Object} SEO analysis results
 */
const analyzeSEO = (content, keywords, meta) => {
  const plainText = content.replace(/<[^>]*>/g, '');
  const wordCount = countWords(plainText);
  
  // SEO analysis object
  const seoAnalysis = {
    wordCount: {
      count: wordCount,
      status: wordCount >= 300 ? 'good' : 'poor',
      recommendation: wordCount < 300 
        ? 'Add more content (recommended: 1000+ words for in-depth articles)'
        : 'Good content length'
    },
    keywordDensity: {
      average: 0,
      status: 'not analyzed',
      recommendation: 'Target 1-3% keyword density for primary keywords'
    },
    readability: {
      score: calculateReadability(plainText),
      status: 'not analyzed',
      recommendation: 'Aim for score of 60+ for general audience'
    },
    headings: analyzeHeadings(content),
    links: analyzeLinks(content),
    images: analyzeImages(content),
    metaDescription: {
      length: meta ? meta.length : 0,
      status: 'not analyzed',
      recommendation: 'Meta description should be 50-160 characters'
    }
  };
  
  // Analyze keyword density
  if (keywords && keywords.length > 0) {
    const densities = keywords.map(keyword => calculateKeywordDensity(plainText, keyword));
    seoAnalysis.keywordDensity.byKeyword = keywords.reduce((acc, keyword, index) => {
      acc[keyword] = densities[index].toFixed(2) + '%';
      return acc;
    }, {});
    
    seoAnalysis.keywordDensity.average = (densities.reduce((sum, density) => sum + density, 0) / densities.length).toFixed(2) + '%';
    
    const avgDensity = parseFloat(seoAnalysis.keywordDensity.average);
    if (avgDensity < 0.5) {
      seoAnalysis.keywordDensity.status = 'poor';
      seoAnalysis.keywordDensity.recommendation = 'Increase keyword usage (target: 1-3%)';
    } else if (avgDensity > 5) {
      seoAnalysis.keywordDensity.status = 'warning';
      seoAnalysis.keywordDensity.recommendation = 'Keyword stuffing detected. Reduce keyword density.';
    } else {
      seoAnalysis.keywordDensity.status = 'good';
      seoAnalysis.keywordDensity.recommendation = 'Good keyword density';
    }
  }
  
  // Analyze readability status
  const readabilityScore = seoAnalysis.readability.score;
  if (readabilityScore < 30) {
    seoAnalysis.readability.status = 'difficult';
    seoAnalysis.readability.recommendation = 'Text is very difficult to read. Use shorter sentences and simpler words.';
  } else if (readabilityScore < 60) {
    seoAnalysis.readability.status = 'moderate';
    seoAnalysis.readability.recommendation = 'Text is somewhat difficult to read. Try simplifying your language.';
  } else {
    seoAnalysis.readability.status = 'good';
    seoAnalysis.readability.recommendation = 'Text is easy to read. Good job!';
  }
  
  // Analyze meta description
  const metaLength = seoAnalysis.metaDescription.length;
  if (metaLength === 0) {
    seoAnalysis.metaDescription.status = 'missing';
    seoAnalysis.metaDescription.recommendation = 'Add a meta description (50-160 characters)';
  } else if (metaLength < 50) {
    seoAnalysis.metaDescription.status = 'too short';
    seoAnalysis.metaDescription.recommendation = 'Meta description is too short. Add more content (50-160 characters)';
  } else if (metaLength > 160) {
    seoAnalysis.metaDescription.status = 'too long';
    seoAnalysis.metaDescription.recommendation = 'Meta description is too long. Shorten it to under 160 characters.';
  } else {
    seoAnalysis.metaDescription.status = 'good';
    seoAnalysis.metaDescription.recommendation = 'Meta description length is good';
  }
  
  return seoAnalysis;
};

/**
 * Validates if the response has all required sections
 * @param {string} response - The raw response from OpenAI
 * @returns {boolean} Whether the response is valid
 */
const validateResponse = (response) => {
  const hasTitle = !!response.match(/TITLE:\s*(.+?)\n/i);
  const hasMeta = !!response.match(/META:\s*(.+?)\n/i);
  const hasKeywords = !!response.match(/KEYWORDS:\s*(.+?)\n/i);
  const hasContent = !!response.split(/CONTENT:\s*/i)[1]?.trim();
  
  return hasTitle && hasMeta && hasKeywords && hasContent;
};

/**
 * Parses the response from OpenAI into structured content
 * @param {string} rawResponse - Raw response from OpenAI
 * @returns {Object} Parsed content with title, meta, keywords, content
 */
const parseResponse = (rawResponse) => {
  const title = rawResponse.match(/TITLE:\s*(.+?)(?:\n|$)/i)?.[1]?.trim() || '';
  const meta = rawResponse.match(/META:\s*(.+?)(?:\n|$)/i)?.[1]?.trim() || '';
  const keywordsMatch = rawResponse.match(/KEYWORDS:\s*(.+?)(?:\n|$)/i)?.[1]?.trim() || '';
  const keywords = keywordsMatch.split(',').map(k => k.trim()).filter(Boolean);
  const content = rawResponse.split(/CONTENT:\s*/i)[1]?.trim() || '';
  const wordCount = countWords(content);

  return {
    title,
    meta,
    keywords,
    content,
    wordCount
  };
};

/**
 * Expands content to meet target word count
 * @param {Object} parsedContent - Parsed content object
 * @param {number} targetWordCount - Desired word count
 * @returns {Promise<Object>} Expanded content
 */
async function expandContent(parsedContent, targetWordCount) {
  const { title, meta, keywords, content, wordCount } = parsedContent;
  
  if (wordCount >= targetWordCount * 0.9) {
    // Already close enough to target
    return parsedContent;
  }
  
  console.log(`Expanding content from ${wordCount} to ${targetWordCount} words`);
  
  // Make multiple expansion attempts if needed
  const maxAttempts = 3;
  let expandedContent = content;
  let expandedWordCount = wordCount;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (expandedWordCount >= targetWordCount * 0.9) {
        // We've reached our target
        break;
      }
      
      const wordsToAdd = targetWordCount - expandedWordCount;
      console.log(`Expansion attempt ${attempt}/${maxAttempts}: Adding ~${wordsToAdd} words`);
      
      // Create a more direct expansion prompt
      const expansionPrompt = `
I need you to expand the following article from ${expandedWordCount} words to EXACTLY ${targetWordCount} words.

CURRENT WORD COUNT: ${expandedWordCount}
TARGET WORD COUNT: ${targetWordCount}
WORDS TO ADD: ${wordsToAdd}

EXPANSION GUIDELINES:
1. Add approximately ${wordsToAdd} more words by providing more details, examples, case studies, or statistics
2. Maintain the article's existing structure and flow
3. Use the same tone and style as the original
4. Focus on adding valuable, relevant content rather than filler
5. IMPORTANT: The final expanded content MUST be at least ${targetWordCount * 0.9} words 

ORIGINAL ARTICLE:
${expandedContent}

Return ONLY the complete expanded article with all sections fully developed. The output MUST be a single, cohesive article containing ALL the original content plus your additions.
`;

      const expansion = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { 
            role: "system", 
            content: "You are a content expansion specialist. Your task is to expand articles to meet specific word count targets while maintaining quality and relevance. You MUST add enough content to reach the target word count." 
          },
          { role: "user", content: expansionPrompt }
        ],
        temperature: 0.6,
        max_tokens: Math.min(4000, wordsToAdd * 10),
      });
      
      expandedContent = expansion.choices[0].message.content.trim();
      expandedWordCount = countWords(expandedContent);
      
      console.log(`After expansion attempt ${attempt}: Now at ${expandedWordCount}/${targetWordCount} words`);
      
      // If we've added less than 30 words, something is wrong
      if (expandedWordCount < wordCount + 30 && attempt < maxAttempts) {
        console.warn('Expansion added too few words, trying different approach');
        
        // Try a different approach - specifically request adding sections
        const alternativePrompt = `
Add ${wordsToAdd} words to this article by adding 2-3 new sections with headers. 
Original article (${expandedWordCount} words):

${expandedContent}

Return the COMPLETE article with new sections added. The final article should be about ${targetWordCount} words.
`;
        
        const altExpansion = await openai.chat.completions.create({
          model: "deepseek-chat",
          messages: [{ role: "user", content: alternativePrompt }],
          temperature: 0.7,
          max_tokens: Math.min(4000, wordsToAdd * 10),
        });
        
        const altContent = altExpansion.choices[0].message.content.trim();
        const altWordCount = countWords(altContent);
        
        // Use alternative if it's better
        if (altWordCount > expandedWordCount) {
          expandedContent = altContent;
          expandedWordCount = altWordCount;
          console.log(`Alternative expansion improved word count to ${expandedWordCount}`);
        }
      }
      
    } catch (error) {
      console.warn(`Content expansion attempt ${attempt} failed:`, error.message);
      // Continue with next attempt
      await delay(1000);
    }
  }
  
  // Final check and logging
  if (expandedWordCount < wordCount + 30) {
    console.warn(`Warning: Expansion barely increased content length (${wordCount} → ${expandedWordCount})`);
  }
  
  if (expandedWordCount < targetWordCount * 0.8) {
    console.warn(`Warning: Final expanded content (${expandedWordCount} words) is still well below target (${targetWordCount} words)`);
  } else {
    console.log(`Successfully expanded content to ${expandedWordCount} words (${Math.round(expandedWordCount/targetWordCount*100)}% of target)`);
  }
  
  return {
    title,
    meta,
    keywords,
    content: expandedContent,
    wordCount: expandedWordCount
  };
}

/**
 * Generates content suggestion with retry, validation, and expansion
 * @param {string} topic - The content topic
 * @param {Object} businessContext - Business info and keywords
 * @param {number} wordCount - Target word count
 * @returns {Promise<Object>} Generated content
 */
async function generateContentSuggestion(topic, businessContext, wordCount = 800) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable not found');
    }

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      throw new Error('Invalid topic: Must be a non-empty string');
    }

    if (!businessContext || typeof businessContext !== 'object') {
      throw new Error('businessContext must be an object');
    }

    const { industry, targetAudience, primaryKeywords = [] } = businessContext;

    if (!industry?.trim()) throw new Error('businessContext.industry is required');
    if (!targetAudience?.trim()) throw new Error('businessContext.targetAudience is required');

    const normalizedKeywords = Array.isArray(primaryKeywords)
      ? primaryKeywords.filter(k => typeof k === 'string').map(k => k.trim())
      : typeof primaryKeywords === 'string'
        ? primaryKeywords.split(',').map(k => k.trim()).filter(Boolean)
        : [];

    // Construct structured prompt for better formatting
    const prompt = `Write a well-structured, SEO-optimized article on "${topic.trim()}" for a ${industry.trim()} business targeting ${targetAudience.trim()}.

The article must follow this EXACT format:
TITLE: [An engaging title under 60 characters]
META: [A compelling meta description under 155 characters]
KEYWORDS: [5-7 relevant keywords separated by commas]
CONTENT: [The main article content with proper HTML formatting using <h2>, <h3>, <p> tags]

IMPORTANT REQUIREMENTS:
1. The CONTENT section should be AT LEAST ${Math.floor(wordCount * 0.5)} words. Target ${wordCount} words if possible.
2. Include ALL four sections: TITLE, META, KEYWORDS, and CONTENT.
3. Make the content comprehensive, informative, and valuable to the target audience.
4. Use proper formatting with headers, paragraphs, and lists.
${normalizedKeywords.length > 0 ? `5. Include these keywords naturally in the content: ${normalizedKeywords.join(', ')}` : ''}

Write the article now, focusing on quality and proper structure.`;

    // Implement retry logic for content generation
    const attemptGeneration = async (retries = 3) => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          console.log(`Content generation attempt ${attempt}/${retries}`);
          
          const completion = await openai.chat.completions.create({
            model: "deepseek-chat",
            messages: [
              { 
                role: "system", 
                content: "You are a professional SEO content writer. Generate highly optimized content with structured formatting and engaging readability. Always include TITLE, META, KEYWORDS, and CONTENT sections." 
              },
              { role: "user", content: prompt }
            ],
            temperature: 0.7,
            max_tokens: Math.min(4000, wordCount * 6),
          });
          
          const responseContent = completion.choices[0].message.content;
          
          // Validate response structure
          if (!validateResponse(responseContent)) {
            console.warn(`Invalid response structure on attempt ${attempt}. Missing required sections.`);
            if (attempt === retries) {
              throw new Error('Failed to generate properly structured content after multiple attempts');
            }
            await delay(2000);
            continue;
          }
          
          // Parse the response
          const parsedContent = parseResponse(responseContent);
          
          // Check for minimum word count (at least 25% of requested)
          if (parsedContent.wordCount < wordCount * 0.25) {
            console.warn(`Word count too low on attempt ${attempt}: Requested ${wordCount}, got ${parsedContent.wordCount}.`);
            if (attempt === retries) {
              // Final attempt failed but content is valid
              return parsedContent;
            }
            await delay(2000);
            continue;
          }
          
          return parsedContent;
        } catch (error) {
          console.error(`Error on attempt ${attempt}:`, error.message);
          if (attempt === retries) {
            throw error;
          }
          await delay(2000 * attempt); // Exponential backoff
        }
      }
      throw new Error('All generation attempts failed');
    };

    // Generate initial content
    let parsedContent = await attemptGeneration(3);
    console.log(`Initial content generated: ${parsedContent.wordCount}/${wordCount} words (${Math.round(parsedContent.wordCount/wordCount*100)}% of target)`);
    
    // Expand content if needed - try expansion up to 2 times if first attempt doesn't reach target
    if (parsedContent.wordCount < wordCount * 0.9) {
      parsedContent = await expandContent(parsedContent, wordCount);
      
      // If we're still below 75% of target, try one more time with a higher target
      if (parsedContent.wordCount < wordCount * 0.75) {
        console.log(`First expansion insufficient, trying second expansion`);
        // Set a higher target to compensate for falling short
        const adjustedTarget = Math.ceil(wordCount * 1.2);
        parsedContent = await expandContent(parsedContent, adjustedTarget);
      }
    }
    
    // Run SEO analysis on the content
    const seoAnalysis = analyzeSEO(
      parsedContent.content,
      parsedContent.keywords,
      parsedContent.meta
    );
    
    // Final result preparation
    const finalContent = {
      title: parsedContent.title,
      meta: parsedContent.meta,
      keywords: parsedContent.keywords,
      content: parsedContent.content, 
      outline: parsedContent.content, // For backward compatibility 
      wordCount: parsedContent.wordCount,
      industry,
      targetAudience,
      source: 'openai',
      seoAnalysis // Add SEO analysis to the response
    };
    
    // Log quality metrics
    console.log(`Final content metrics:
- Word count: ${finalContent.wordCount}/${wordCount} (${Math.round(finalContent.wordCount/wordCount*100)}% of target)
- Title length: ${finalContent.title.length} chars
- Meta length: ${finalContent.meta.length} chars
- Keywords: ${finalContent.keywords.length} keywords
- Readability score: ${seoAnalysis.readability.score.toFixed(2)}/100`);
    
    return finalContent;
  } catch (error) {
    console.error('Content generation failed:', error.message);
    throw new Error(`Content generation failed: ${error.message}`);
  }
}

module.exports = {
  generateContentSuggestion,
  analyzeSEO // Export the SEO analysis function
};