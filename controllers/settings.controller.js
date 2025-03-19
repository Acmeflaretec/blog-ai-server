const User = require("../models/user.model");
const Business = require("../models/business.model");

exports.generateApiKey = async (req, res) => {
  try {
    const apiKey = Array.from(Array(32), () =>
      Math.floor(Math.random() * 36).toString(36)
    ).join("");
    const user = await User.findByIdAndUpdate(req.user.userId, { apiKey });
    if (!user) {
      return res.status(404).json({ message: "User not authorized" });
    }
    res.json({ apiKey });
  } catch (error) {
    console.error("Error generating apiKey:", error);
    res.status(500).json({ message: "Error generating apiKey" });
  }
};

exports.getBusinessSettings = async (req, res) => {
  const userId = req.user.userId;

  // Find or create business settings for the user
  let business = await Business.findOne({ userId });
  
  if (!business) {
    business = await Business.create({
      userId,
      businessName: "",
      industry: "other",
      targetAudience: "",
      primaryKeywords: "",
      contentPreferences: {
        includeFeaturedImage: true,
        includeMetaDescription: true,
        includeTableOfContents: true,
        autoGenerateTags: true,
      },
      defaultTone: "professional",
      defaultWordCount: "1000",
    });
  }

  res.status(200).json({
    status: 'success',
    data: business
  });
};

exports.updateBusinessSettings = async (req, res) => {
  const userId = req.user.userId;
  const {
    businessName,
    industry,
    targetAudience,
    primaryKeywords,
    contentPreferences,
    defaultTone,
    defaultWordCount
  } = req.body;

  // Update or create business settings
  const business = await Business.findOneAndUpdate(
    { userId },
    {
      businessName,
      industry,
      targetAudience,
      primaryKeywords,
      contentPreferences,
      defaultTone,
      defaultWordCount,
      updatedAt: new Date()
    },
    { 
      new: true, // Return the updated document
      upsert: true, // Create if it doesn't exist
      runValidators: true // Run model validators
    }
  );

  res.status(200).json({
    status: 'success',
    data: business
  });
};