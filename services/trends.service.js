const googleTrends = require('google-trends-api');
const cheerio = require('cheerio'); // Add cheerio for HTML parsing
const Parser = require('rss-parser');
const parser = new Parser();

// Helper function for exponential backoff
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const exponentialBackoff = async (fn, retries = 3, delayMs = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await delay(delayMs);
    return exponentialBackoff(fn, retries - 1, delayMs * 2);
  }
};

// List of tech news RSS feeds
const TECH_RSS_FEEDS = [
  'https://techcrunch.com/feed/',
  'https://feeds.arstechnica.com/arstechnica/index',
  'https://www.theverge.com/rss/index.xml',
  'https://www.wired.com/feed/rss',
  'https://www.zdnet.com/news/rss.xml',
  'https://www.techrepublic.com/rssfeeds/articles/',
  'https://www.cnet.com/rss/news/',
  'https://www.engadget.com/rss.xml',
  'https://www.digitaltrends.com/feed/',
  'https://www.gizmodo.com/rss'
];

/**
 * Generate customer-focused keywords based on industry and audience
 */
function getCustomerKeywords(industry, targetAudience = 'business owners') {
  // Handle case where industry is an object
  if (typeof industry === 'object' && industry.industry) {
    targetAudience = industry.targetAudience || targetAudience;
    industry = industry.industry;
  }

  const baseKeywords = [];
  
  // Software company specific keywords
  if (industry.toLowerCase().includes('tech') || industry.toLowerCase().includes('software')) {
    baseKeywords.push(
      'software development',
      'tech solutions',
      'digital transformation',
      'cloud computing',
      'artificial intelligence',
      'machine learning',
      'cybersecurity',
      'data analytics',
      'DevOps',
      'SaaS'
    );
  } else {
    // Generic keywords for other industries
    baseKeywords.push(
      `${industry} trends`,
      `${industry} solutions`,
      `${industry} technology`,
      `${industry} innovation`,
      `${industry} best practices`
    );
  }

  return baseKeywords;
}

/**
 * Parse HTML response from Google Trends
 * @param {string} html - HTML response from Google Trends
 * @returns {Array} Array of trending topics
 */
function parseHtmlResponse(html) {
  const $ = cheerio.load(html);
  const trends = [];

  // Try to find trends in different possible structures
  const trendSelectors = [
    '.feed-item', // Primary selector
    '.trending-story', // Alternative selector
    '.trending-list-item', // Another alternative
    '.trending-item' // Fallback selector
  ];

  // Try each selector until we find trends
  for (const selector of trendSelectors) {
    $(selector).each((i, el) => {
      const title = $(el).find('.title, .story-title, .item-title').text().trim();
      const traffic = $(el).find('.traffic-value, .search-count, .trend-count').text().trim();
      const description = $(el).find('.summary-text, .story-description, .item-description').text().trim();
      const url = $(el).find('a').attr('href');

      if (title) {
        trends.push({
          title,
          source: 'Google Trends',
          traffic: traffic || 'Unknown traffic',
          description: description || `Trending topic: ${title}`,
          blogRelevance: 'High - Current trend',
          url: url ? `https://trends.google.com${url}` : undefined
        });
      }
    });

    // If we found trends, break the loop
    if (trends.length > 0) break;
  }

  // If still no trends found, try parsing the JSON embedded in the HTML
  if (trends.length === 0) {
    try {
      const jsonData = $('script[type="application/ld+json"]').html();
      if (jsonData) {
        const parsedData = JSON.parse(jsonData);
        if (parsedData.itemListElement) {
          parsedData.itemListElement.forEach(item => {
            if (item.item && item.item.name) {
              trends.push({
                title: item.item.name,
                source: 'Google Trends',
                traffic: 'Unknown traffic',
                description: `Trending topic: ${item.item.name}`,
                blogRelevance: 'High - Current trend',
                url: item.item.url
              });
            }
          });
        }
      }
    } catch (jsonError) {
      console.warn('Failed to parse embedded JSON:', jsonError);
    }
  }

  // If still no trends, try extracting from the main content
  if (trends.length === 0) {
    $('h3, h4').each((i, el) => {
      const title = $(el).text().trim();
      if (title) {
        trends.push({
          title,
          source: 'Google Trends',
          traffic: 'Unknown traffic',
          description: `Trending topic: ${title}`,
          blogRelevance: 'High - Current trend',
          url: undefined
        });
      }
    });
  }

  return trends.slice(0, 10); // Return top 10 trends
}

/**
 * Get trending topics from Google Trends
 * @param {Object} businessContext - The business context object containing industry and audience info
 * @returns {Promise<Array>} Array of trending topics
 */
async function getTrendingTopics(businessContext) {
  try {
    const { industry } = businessContext;
    const isTechIndustry = industry.toLowerCase().includes('tech') || 
                          industry.toLowerCase().includes('software');

    // Only return tech trends for tech industry
    if (!isTechIndustry) {
      return [];
    }

    const allTrends = [];
    
    // Fetch from all RSS feeds in parallel
    await Promise.all(TECH_RSS_FEEDS.map(async (feedUrl) => {
      try {
        const feed = await parser.parseURL(feedUrl);
        const trends = feed.items.map(item => ({
          title: item.title,
          source: feed.title,
          traffic: 'Trending',
          description: item.contentSnippet || item.title,
          blogRelevance: 'High - Tech news',
          url: item.link,
          published: item.isoDate || item.pubDate
        }));
        allTrends.push(...trends);
      } catch (error) {
        console.warn(`Error fetching RSS feed ${feedUrl}:`, error.message);
      }
    }));

    // Sort by publication date and return top 10
    return allTrends
      .sort((a, b) => new Date(b.published) - new Date(a.published))
      .slice(0, 10);

  } catch (error) {
    console.error('Error in getTrendingTopics:', error.message);
    return [];
  }
}

/**
 * Get trends for specific keywords using relatedQueries
 * @param {Array} keywords - Array of keywords to search for
 * @param {string} region - Region code
 * @returns {Promise<Array>} Array of trending topics
 */
async function getKeywordTrends(keywords, region = 'US') {
  try {
    let allTrends = [];

    for (const keyword of keywords) {
      try {
        await delay(1000); // Respect rate limits

        const result = await googleTrends.relatedQueries({
          keyword,
          geo: region,
          hl: 'en-US',
          time: 'today 1-m'
        });

        const data = JSON.parse(result);
        
        if (data?.default?.rankedList) {
          const queries = [
            ...(data.default.rankedList[0]?.rankedKeyword || []), // Top queries
            ...(data.default.rankedList[1]?.rankedKeyword || [])  // Rising queries
          ];

          const trends = queries.map(query => ({
            title: query.query,
            source: 'Google Trends',
            traffic: `${query.value || 'Rising'} interest`,
            description: `Related to ${keyword}`,
            blogRelevance: 'High - Related search trend',
            url: `https://trends.google.com/trends/explore?geo=${region}&q=${encodeURIComponent(query.query)}`
          }));

          allTrends = [...allTrends, ...trends];
        }
      } catch (err) {
        console.warn(`Error fetching trends for keyword ${keyword}:`, err.message);
        continue;
      }
    }

    // Remove duplicates and sort by traffic
    const uniqueTrends = Array.from(
      new Map(allTrends.map(trend => [trend.title.toLowerCase(), trend])).values()
    );

    return uniqueTrends.slice(0, 10); // Return top 10 trends
  } catch (error) {
    console.error('Error in getKeywordTrends:', error.message);
    return [];
  }
}

module.exports = {
  getTrendingTopics
};
  