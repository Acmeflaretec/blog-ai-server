const cheerio = require("cheerio");
const Blogpost = require("../models/blogpost.model");
const Business = require("../models/business.model");
const puppeteer = require("puppeteer");
const Scrape = require("../models/scrape.model");
const { generateContentSuggestion } = require("../services/openai.service");

const scraperController = {
  scrapeContent: async (req, res) => {
    let browser;
    const startTime = Date.now();
    try {
      const { url, options = {} } = req.body;

      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      const scrapingOptions = {
        includeImages: true,
        includeLinks: true,
        includeTables: true,
        includeLists: true,
        includeCode: true,
        excludeSelectors: "",
        customSelectors: "",
        waitForSelector: "",
        maxDepth: 2,
        timeout: 30000,
        ...options,
      };

      browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(url);
      const html = await page.content();
      await browser.close();
      browser = null;

      const result = extractContentFromHtml(html, url, scrapingOptions);
      await Scrape.create({
        ...result,
        userId: req.user.userId,
        duration: Date.now() - startTime,
      });
      res.json({
        ...result,
        scrapedAt: new Date(),
        duration: Date.now() - startTime,
      });
    } catch (error) {
      console.error("Scraping error:", error);
      res.status(500).json({
        error: "Failed to scrape content",
        details: error.message,
      });
    } finally {
      if (browser) {
        await browser
          .close()
          .catch((err) => console.error("Error closing browser:", err));
      }
    }
  },

  // Process scraped content and generate a blog post
  processContent: async (req, res) => {
    try {
      const { content, title, prompt } = req.body;
      const userId = req.user.userId;

      if (!content || !title) {
        return res
          .status(400)
          .json({ error: "Content and title are required" });
      }
      const business = await Business.findOne({ userId });
      const customPrompt =
        "Based on the following scraped webpage data, generate a well-structured blog post. Ensure the content is engaging, informative, and optimized for readability. Include an attention-grabbing introduction, well-organized sections, and a compelling conclusion." +
        prompt;
      const result = await generateContentSuggestion(
        title,
        {
          industry: business.industry,
          targetAudience: business.targetAudience,
          primaryKeywords: business.primaryKeywords,
        },
        800,
        content,
        customPrompt
      );
      // Create a new post from scraped content

      const keywordsArray = Array.isArray(result.keywords)
        ? result.keywords
        : result.keywords
        ? result.keywords.split(",").map((keyword) => keyword.trim())
        : [];

      const post = new Blogpost({
        userId,
        ...result,
        metaTitle: result.title,
        description: result.meta,
        keywords: keywordsArray,
        tags: keywordsArray,
        slug: slugify(result.title),
        status: "draft",
      });

      await post.save();
      res.status(201).json(post);
    } catch (error) {
      console.error("Processing error:", error);
      if (
        error.message.includes("Invalid topic") ||
        error.message.includes("businessContext")
      ) {
        res.status(400).json({
          message: error.message,
          error: "VALIDATION_ERROR",
        });
      } else if (
        error.code === "insufficient_quota" ||
        error.message.includes("API key")
      ) {
        res.status(503).json({
          message: "AI service temporarily unavailable.",
          error: "AI_SERVICE_UNAVAILABLE",
        });
      } else {
        res.status(500).json({
          message:
            "Error generating content suggestion. Please try again later.",
          error: "INTERNAL_ERROR",
          details: error.message,
        });
      }
    }
  },

  // Get scraping history for a user
  getScrapingHistory: async (req, res) => {
    try {
      const userId = req.user.userId;
      const posts = await Post.find({
        userId,
        type: "scraped",
      }).sort({ createdAt: -1 });

      res.json(posts);
    } catch (error) {
      console.error("History fetch error:", error);
      res.status(500).json({
        error: "Failed to fetch scraping history",
        details: error.message,
      });
    }
  },
};

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
}
// Helper function to extract content from HTML
function extractContentFromHtml(html, sourceUrl, options) {
  const $ = cheerio.load(html);

  // Remove unwanted elements based on options
  $("script").remove();
  $("style").remove();
  $("nav").remove();
  $("header:not(:has(h1))").remove();
  $("footer").remove();
  $("iframe").remove();
  $("noscript").remove();
  $("aside").remove();
  $("form").remove();

  // Remove excluded elements if specified
  if (options.excludeSelectors) {
    options.excludeSelectors.split(",").forEach((selector) => {
      $(selector.trim()).remove();
    });
  }

  // Extract title
  const title = $("title").text() || $("h1").first().text() || "";

  // Extract description
  const description =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    $("p").first().text().substring(0, 160) ||
    "";

  // Try to find the main content area using custom selectors if specified
  let mainContent = "";
  let contentSelectors = [
    "article",
    "main",
    ".content",
    "#content",
    ".post-content",
    ".article-content",
    ".entry-content",
    ".blog-post",
    "section:not(nav section)",
  ];

  if (options.customSelectors) {
    contentSelectors = options.customSelectors.split(",").map((s) => s.trim());
  }

  for (const selector of contentSelectors) {
    const content = $(selector).first();
    if (content.length > 0) {
      mainContent = content.html();
      break;
    }
  }

  // If no main content found, use body with common wrappers removed
  if (!mainContent || mainContent.length < 200) {
    $(
      "header, footer, nav, aside, .sidebar, .menu, .navigation, .comments, .related, #sidebar"
    ).remove();
    mainContent = $("body").html();
  }

  // Clean up the content
  mainContent = mainContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Extract images with absolute URLs if enabled
  const images = [];
  if (options.includeImages) {
    $("img").each((i, elem) => {
      let src = $(elem).attr("src") || $(elem).attr("data-src");
      if (src && !src.startsWith("data:")) {
        // Convert relative URLs to absolute
        if (src.startsWith("/")) {
          const urlObj = new URL(sourceUrl);
          src = `${urlObj.protocol}//${urlObj.host}${src}`;
        } else if (!src.startsWith("http")) {
          src = new URL(src, sourceUrl).href;
        }
        images.push(src);
      }
    });
  }

  // Extract links with absolute URLs if enabled
  const links = [];
  if (options.includeLinks) {
    $("a").each((i, elem) => {
      let href = $(elem).attr("href");
      if (href && !href.startsWith("javascript:") && !href.startsWith("#")) {
        // Convert relative URLs to absolute
        if (href.startsWith("/")) {
          const urlObj = new URL(sourceUrl);
          href = `${urlObj.protocol}//${urlObj.host}${href}`;
        } else if (!href.startsWith("http")) {
          try {
            href = new URL(href, sourceUrl).href;
          } catch (e) {
            // Skip invalid URLs
            return;
          }
        }
        links.push(href);
      }
    });
  }

  // Process content based on options
  if (!options.includeImages) {
    mainContent = mainContent
      .replace(/<img[^>]*>[\s\S]*?<\/img>/gi, "")
      .replace(/<img[^>]*\/>/gi, "")
      .replace(/<img[^>]*>/gi, "");
  }
  if (!options.includeLinks) {
    mainContent = mainContent.replace(/<a[^>]*>[\s\S]*?<\/a>/gi, "");
  }
  if (!options.includeTables) {
    mainContent = mainContent.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, "");
  }
  if (!options.includeLists) {
    mainContent = mainContent
      .replace(/<ul[^>]*>[\s\S]*?<\/ul>/gi, "")
      .replace(/<ol[^>]*>[\s\S]*?<\/ol>/gi, "");
  }
  if (!options.includeCode) {
    mainContent = mainContent
      .replace(/<pre[^>]*>[\s\S]*?<\/pre>/gi, "")
      .replace(/<code[^>]*>[\s\S]*?<\/code>/gi, "");
  }

  return {
    title,
    description,
    content: mainContent,
    images,
    links,
    sourceUrl,
  };
}

module.exports = scraperController;
