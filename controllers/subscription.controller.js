const Subscription = require("../models/subscription.model");

// Create a new subscription plan
exports.createSubscription = async (req, res) => {
  try {
    // If setting this plan as popular, unset other popular plans
    if (req.body.isPopular) {
      await Subscription.updateMany(
        { isPopular: true },
        { $set: { isPopular: false } }
      );
    }

    const subscription = new Subscription(req.body);
    await subscription.save();

    res.status(201).json({
      message: "Subscription plan created successfully",
      subscription,
    });
  } catch (error) {
    console.error("Error creating subscription:", error);
    res.status(400).json({
      error: "Failed to create subscription plan",
      details: error.message,
    });
  }
};

// Get all subscription plans
exports.getAllSubscriptions = async (req, res) => {
  try {
    const { active, sort } = req.query;
    let query = {};

    // Filter by active status if specified
    if (active !== undefined) {
      query.isActive = active === "true";
    }

    // Build sort object
    let sortOptions = {};
    if (sort) {
      const [field, order] = sort.split(":");
      sortOptions[field] = order === "desc" ? -1 : 1;
    } else {
      // Default sort by price ascending
      sortOptions = { price: 1 };
    }

    const subscriptions = await Subscription.find(query)
      .sort(sortOptions)
      .select("-__v");

    res.json(subscriptions);
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    res.status(500).json({
      error: "Failed to fetch subscription plans",
      details: error.message,
    });
  }
};

// Get a specific subscription plan
exports.getSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id).select(
      "-__v"
    );

    if (!subscription) {
      return res.status(404).json({
        error: "Subscription plan not found",
      });
    }

    res.json(subscription);
  } catch (error) {
    console.error("Error fetching subscription:", error);
    res.status(500).json({
      error: "Failed to fetch subscription plan",
      details: error.message,
    });
  }
};

// Update a subscription plan
exports.updateSubscription = async (req, res) => {
  try {
    // If setting this plan as popular, unset other popular plans
    if (req.body.isPopular) {
      await Subscription.updateMany(
        { _id: { $ne: req.params.id }, isPopular: true },
        { $set: { isPopular: false } }
      );
    }

    const subscription = await Subscription.findByIdAndUpdate(
      req.params.id,
      {
        $set: req.body,
        updatedAt: Date.now(),
      },
      { new: true, runValidators: true }
    );

    if (!subscription) {
      return res.status(404).json({
        error: "Subscription plan not found",
      });
    }

    res.json({
      message: "Subscription plan updated successfully",
      subscription,
    });
  } catch (error) {
    console.error("Error updating subscription:", error);
    res.status(400).json({
      error: "Failed to update subscription plan",
      details: error.message,
    });
  }
};

// Delete a subscription plan
exports.deleteSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({
        error: "Subscription plan not found",
      });
    }

    // Instead of hard deleting, mark as inactive
    subscription.isActive = false;
    subscription.updatedAt = Date.now();
    await subscription.save();

    res.json({
      message: "Subscription plan deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting subscription:", error);
    res.status(500).json({
      error: "Failed to delete subscription plan",
      details: error.message,
    });
  }
};

// Get active subscription plans with pricing details
exports.getActivePlans = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ isActive: true })
      .sort({ price: 1 })
      .select("-__v");

    res.json({
      count: subscriptions.length,
      subscriptions,
    });
  } catch (error) {
    console.error("Error fetching active plans:", error);
    res.status(500).json({
      error: "Failed to fetch active subscription plans",
      details: error.message,
    });
  }
};
