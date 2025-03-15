const Business = require('../models/business.model');
const User = require('../models/user.model');

exports.saveOnboarding = async (req, res) => {
  try {
    const { businessName, industry, targetAudience, primaryKeywords, preferredSources } = req.body;
    const userId = req.user.userId;

    // First update user's onboarding status
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { needsOnboarding: false },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if business profile already exists for this user
    let business = await Business.findOne({ userId });

    if (business) {
      // Update existing business profile
      business = await Business.findOneAndUpdate(
        { userId },
        {
          businessName,
          industry,
          targetAudience,
          primaryKeywords,
          preferredSources
        },
        { new: true }
      );
    } else {
      // Create new business profile
      business = new Business({
        userId,
        businessName,
        industry,
        targetAudience,
        primaryKeywords,
        preferredSources
      });
      await business.save();
    }

    res.status(200).json({
      message: 'Business profile saved successfully',
      business,
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        needsOnboarding: updatedUser.needsOnboarding
      }
    });
  } catch (error) {
    console.error('Save onboarding error:', error);
    res.status(500).json({ message: 'Error saving business profile' });
  }
}; 