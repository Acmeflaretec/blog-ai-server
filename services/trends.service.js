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

// RSS feeds organized by industry categories matching the business model
const RSS_FEEDS = {
  "Information Technology (IT) & Software": [
    'https://techcrunch.com/feed/',
    'https://feeds.arstechnica.com/arstechnica/index',
    'https://www.theverge.com/rss/index.xml',
    'https://www.wired.com/feed/rss',
    'https://www.zdnet.com/news/rss.xml',
    'https://www.cnet.com/rss/news/'
  ],
  "Banking & Finance": [
    'https://www.forbes.com/money/feed/',
    'https://www.ft.com/rss/home',
    'https://feeds.marketwatch.com/marketwatch/topstories/',
    'https://www.bloomberg.com/feeds/sitemap_news.xml',
    'https://www.cnbc.com/id/10000664/device/rss/rss.html'
  ],
  "Healthcare & Pharmaceuticals": [
    'https://www.healthline.com/rss/news',
    'https://www.medicalnewstoday.com/newsfeeds/rss/medical_news_today.xml',
    'https://www.who.int/rss-feeds/news-english.xml',
    'https://www.mayoclinic.org/rss/all-news'
  ],
  "Education & E-learning": [
    'https://www.edweek.org/feed',
    'https://www.chronicle.com/rss',
    'https://www.insidehighered.com/feed/articles/all',
    'https://www.edsurge.com/feeds/articles'
  ],
  "Hospitality & Tourism": [
    'https://www.travelandleisure.com/feeds/all.rss',
    'https://www.lonelyplanet.com/news/feed',
    'https://www.cntraveler.com/feed/rss'
  ],
  "Food & Beverage": [
    'https://www.foodnetwork.com/fn-dish/news/feed',
    'https://www.eater.com/rss/index.xml',
    'https://www.foodbusinessnews.net/rss/'
  ],
  "E-commerce": [
    'https://www.digitalcommerce360.com/feed/',
    'https://www.retaildive.com/feeds/news/',
    'https://www.practicalecommerce.com/feed'
  ],
  "Professional Services": [
    'https://hbr.org/feed',
    'https://www.fastcompany.com/latest/rss',
    'https://www.inc.com/rss/'
  ],
  "Marketing & Advertising": [
    'https://www.marketingdive.com/feeds/news/',
    'https://www.adweek.com/feed/',
    'https://www.marketingweek.com/feed/'
  ],
  "Manufacturing & Industrial": [
    'https://www.industryweek.com/rss.xml',
    'https://www.manufacturing.net/rss',
    'https://www.assemblymag.com/rss'
  ],
  "Energy & Utilities": [
    'https://www.utilitydive.com/feeds/news/',
    'https://www.renewableenergyworld.com/feed/',
    'https://www.power-technology.com/feed/'
  ],
  "Construction & Real Estate": [
    'https://www.constructiondive.com/feeds/news/',
    'https://www.constructionmanager.co.uk/feed/',
    'https://www.bdcnetwork.com/rss.xml'
  ]
};

// Industry mapping for similar categories
const INDUSTRY_MAPPING = {
  "Information Technology (IT) & Software": ["tech", "software", "it", "technology"],
  "Banking & Finance": ["banking", "finance", "financial"],
  "Healthcare & Pharmaceuticals": ["health", "medical", "pharma"],
  "Education & E-learning": ["education", "learning", "academic"],
  "Hospitality & Tourism": ["travel", "tourism", "hospitality"],
  "Food & Beverage": ["food", "restaurant", "beverage"],
  "E-commerce": ["ecommerce", "retail", "online shopping"],
  "Professional Services": ["consulting", "business services"],
  "Marketing & Advertising": ["marketing", "advertising", "digital marketing"],
  "Manufacturing & Industrial": ["manufacturing", "industrial", "production"],
  "Energy & Utilities": ["energy", "utilities", "power"],
  "Construction & Real Estate": ["construction", "real estate", "property"]
};

/**
 * Generate customer-focused keywords based on business context
 * @param {Object} businessContext - Complete business context with industry, audience, and preferences
 * @returns {Array} Array of relevant keywords
 */
function getCustomerKeywords(businessContext) {
  const {
    industry,
    targetAudience,
    keywords: userKeywords,
    businessName,
    region = 'US',
    defaultTone = 'professional'
  } = businessContext;

  let baseKeywords = [];
  
  // Add user-defined keywords first (highest priority)
  if (userKeywords) {
    if (typeof userKeywords === 'string') {
      baseKeywords.push(...userKeywords.split(',').map(k => k.trim()).filter(Boolean));
    } else if (Array.isArray(userKeywords)) {
      baseKeywords.push(...userKeywords);
    }
  }

  // Add industry-specific keywords
  switch(industry) {
    case "Information Technology (IT) & Software":
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
        'SaaS',
        'enterprise software',
        'IT infrastructure'
      );
      break;

    case "Banking & Finance":
      baseKeywords.push(
        'financial services',
        'banking technology',
        'fintech',
        'digital banking',
        'financial management',
        'investment trends',
        'banking innovation'
      );
      break;

    case "Healthcare & Pharmaceuticals":
      baseKeywords.push(
        'healthcare innovation',
        'medical technology',
        'digital health',
        'patient care',
        'healthcare solutions',
        'medical research',
        'pharmaceutical development'
      );
      break;

    case "E-commerce":
      baseKeywords.push(
        'online retail',
        'e-commerce platforms',
        'digital commerce',
        'online shopping',
        'retail technology',
        'customer experience',
        'digital marketplace'
      );
      break;

    case "Marketing & Advertising":
      baseKeywords.push(
        'digital marketing',
        'advertising strategies',
        'marketing automation',
        'brand development',
        'social media marketing',
        'content strategy',
        'marketing analytics'
      );
      break;

    default:
      // Generic industry keywords
      baseKeywords.push(
        `${industry} trends`,
        `${industry} solutions`,
        `${industry} technology`,
        `${industry} innovation`,
        `${industry} best practices`,
        `${industry} market leaders`,
        `${industry} developments`
      );
  }

  // Add audience-specific keywords
  const audienceKeywords = [
    `${targetAudience} needs`,
    `${targetAudience} preferences`,
    `${targetAudience} behavior`,
    `${targetAudience} trends`
  ];
  baseKeywords.push(...audienceKeywords);

  // Add region-specific keywords if not US
  if (region && region !== 'US') {
    baseKeywords.push(
      `${industry} ${region}`,
      `${targetAudience} ${region}`,
      `${industry} trends ${region}`
    );
  }

  // Add tone-specific keywords
  const toneKeywords = {
    professional: ['business', 'professional', 'enterprise'],
    casual: ['simple', 'easy', 'friendly'],
    witty: ['creative', 'innovative', 'unique'],
    authoritative: ['expert', 'leading', 'advanced'],
    friendly: ['helpful', 'accessible', 'practical']
  };

  if (defaultTone && toneKeywords[defaultTone]) {
    baseKeywords.push(...toneKeywords[defaultTone].map(tone => 
      `${tone} ${industry.toLowerCase()}`
    ));
  }

  // Add business name related keywords if provided
  if (businessName) {
    baseKeywords.push(
      businessName,
      `${businessName} ${industry.toLowerCase()}`,
      `${businessName} solutions`
    );
  }

  // Remove duplicates and empty strings
  const uniqueKeywords = [...new Set(baseKeywords)]
    .filter(Boolean)
    .map(keyword => keyword.trim())
    .filter(keyword => keyword.length > 2);

  // Sort by length (shorter keywords first) and return top 20
  return uniqueKeywords
    .sort((a, b) => a.length - b.length)
    .slice(0, 20);
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
 * Get trending topics from RSS feeds based on business context
 * @param {Object} businessContext - The business context object containing industry and preferences
 * @returns {Promise<Array>} Array of trending topics
 */
async function getTrendingTopics(businessContext) {
  try {
    const { industry, preferredSources = 'all' } = businessContext;
    let relevantFeeds = [];

    // Find exact industry match first
    if (RSS_FEEDS[industry]) {
      relevantFeeds = RSS_FEEDS[industry];
    } else {
      // Try to find matching industry through mapping
      const industryKey = Object.keys(INDUSTRY_MAPPING).find(key => 
        INDUSTRY_MAPPING[key].some(term => 
          industry.toLowerCase().includes(term)
        )
      );
      
      if (industryKey) {
        relevantFeeds = RSS_FEEDS[industryKey];
      }
    }

    // Add related industry feeds based on context
    if (industry === "E-commerce") {
      relevantFeeds = [
        ...relevantFeeds,
        ...RSS_FEEDS["Marketing & Advertising"].slice(0, 2),
        ...RSS_FEEDS["Professional Services"].slice(0, 2)
      ];
    } else if (industry === "Information Technology (IT) & Software") {
      relevantFeeds = [
        ...relevantFeeds,
        ...RSS_FEEDS["Professional Services"].slice(0, 2),
        ...RSS_FEEDS["Marketing & Advertising"].slice(0, 2)
      ];
    }

    // If no relevant feeds found, use Professional Services as default
    if (relevantFeeds.length === 0) {
      relevantFeeds = RSS_FEEDS["Professional Services"];
    }

    const allTrends = [];
    
    // Fetch from relevant RSS feeds in parallel with exponential backoff
    await Promise.all(relevantFeeds.map(async (feedUrl) => {
      try {
        const feed = await exponentialBackoff(async () => await parser.parseURL(feedUrl));
        const trends = feed.items.map(item => ({
          title: item.title,
          source: feed.title || new URL(feedUrl).hostname,
          traffic: 'Trending',
          description: item.contentSnippet || item.title,
          blogRelevance: `High - ${industry} news`,
          url: item.link,
          published: item.isoDate || item.pubDate,
          type: 'industry' // Mark the source type
        }));
        allTrends.push(...trends);
      } catch (error) {
        console.warn(`Error fetching RSS feed ${feedUrl}:`, error.message);
      }
    }));

    // If preferredSources includes googleTrends, add Google Trends data
    if (preferredSources === 'all' || preferredSources === 'googleTrends') {
      const keywords = getCustomerKeywords(businessContext);
      const trendData = await getKeywordTrends(keywords, businessContext.region || 'US');
      allTrends.push(...trendData.map(trend => ({
        ...trend,
        type: 'googleTrends'
      })));
    }

    // Remove duplicates and sort by publication date
    const uniqueTrends = Array.from(
      new Map(allTrends.map(trend => [trend.title.toLowerCase(), trend])).values()
    );

    return uniqueTrends
      .sort((a, b) => new Date(b.published || Date.now()) - new Date(a.published || Date.now()))
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
  