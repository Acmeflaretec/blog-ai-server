const Post = require("../models/blogpost.model");
const User = require("../models/user.model");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const TOKEN_EXPIRY = "1d";

// Generate JWT token
const generateToken = (adminId) => {
  return jwt.sign({ adminId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
};

// Set cookie with token
const setTokenCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("auth-token", token, {
    httpOnly: false,
    sameSite: "Lax",
    secure: isProduction,
    maxAge: 24 * 60 * 60 * 1000,
    path: "/",
    domain: process.env.DOMAIN,
  });
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (
      username !== process.env.ADMIN_USERNAME ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return res
        .status(401)
        .json({ message: "Login failed. Please check your credentials." });
    }
    const token = generateToken(username);
    setTokenCookie(res, token);

    res.json({ message: "Logged in successfully" });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Error logging in" });
  }
};

// Get dashboard analytics
exports.getDashboardAnalytics = async (req, res) => {
  try {
    const [
      totalPosts,
      publishedPosts,
      totalViews,
      totalLikes,
      totalShares,
      postsWithReadTime,
      allTags,
      recentPosts,
    ] = await Promise.all([
      Post.countDocuments(),
      Post.countDocuments({ status: "published" }),
      Post.aggregate([{ $group: { _id: null, total: { $sum: "$views" } } }]),
      Post.aggregate([{ $group: { _id: null, total: { $sum: "$likes" } } }]),
      Post.aggregate([{ $group: { _id: null, total: { $sum: "$shares" } } }]),
      Post.find({ readTime: { $exists: true } }),
      Post.aggregate([
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Post.find().sort({ createdAt: -1 }).limit(30),
    ]);

    // Calculate average read time
    const averageReadTime =
      postsWithReadTime.reduce((acc, post) => acc + post.readTime, 0) /
        postsWithReadTime.length || 0;

    // Calculate posts per month for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const postsPerMonth = await Post.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);

    // Calculate engagement rate
    const totalEngagements =
      (totalLikes[0]?.total || 0) + (totalShares[0]?.total || 0);
    const totalViewCount = totalViews[0]?.total || 1; // Prevent division by zero
    const engagementRate = (totalEngagements / totalViewCount) * 100;

    // Format top performing tags
    const topPerformingTags = allTags.map((tag) => ({
      tag: tag._id,
      count: tag.count,
    }));

    // Format posts per month
    const formattedPostsPerMonth = postsPerMonth.map((item) => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, "0")}`,
      count: item.count,
    }));

    res.json({
      overview: {
        totalPosts,
        publishedPosts,
        draftPosts: totalPosts - publishedPosts,
        totalViews: totalViews[0]?.total || 0,
        totalLikes: totalLikes[0]?.total || 0,
        totalShares: totalShares[0]?.total || 0,
      },
      engagement: {
        engagementRate: parseFloat(engagementRate.toFixed(2)),
        averageReadTime: parseFloat(averageReadTime.toFixed(1)),
        topPerformingTags,
        postsPerMonth: formattedPostsPerMonth,
      },
      recentActivity: recentPosts.map((post) => ({
        _id: post._id,
        title: post.title,
        status: post.status,
        views: post.views || 0,
        likes: post.likes || 0,
        createdAt: post.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching dashboard analytics:", error);
    res.status(500).json({
      error: "Failed to fetch dashboard analytics",
    });
  }
};

// Get user details
exports.getUserDetails = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error("Error fetching user statistics:", error);
    res.status(500).json({
      error: "Failed to fetch user statistics",
    });
  }
};

// Get user statistics
exports.getUserStats = async (req, res) => {
  try {
    const [totalUsers, activeUsers, usersByMonth] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({
        lastLoginAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      }),
      User.aggregate([
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
    ]);

    res.json({
      totalUsers,
      activeUsers,
      userGrowth: usersByMonth.map((item) => ({
        month: `${item._id.year}-${String(item._id.month).padStart(2, "0")}`,
        count: item.count,
      })),
    });
  } catch (error) {
    console.error("Error fetching user statistics:", error);
    res.status(500).json({
      error: "Failed to fetch user statistics",
    });
  }
};

// Get content performance metrics
exports.getContentMetrics = async (req, res) => {
  try {
    const [topPosts, categoryPerformance, timeBasedMetrics] = await Promise.all(
      [
        Post.find({ status: "published" })
          .sort({ views: -1 })
          .limit(10)
          .select("title views likes shares readTime"),
        Post.aggregate([
          { $unwind: "$tags" },
          {
            $group: {
              _id: "$tags",
              totalViews: { $sum: "$views" },
              totalLikes: { $sum: "$likes" },
              totalShares: { $sum: "$shares" },
              postCount: { $sum: 1 },
            },
          },
          { $sort: { totalViews: -1 } },
        ]),
        Post.aggregate([
          {
            $match: {
              status: "published",
              createdAt: {
                $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              },
            },
          },
          {
            $group: {
              _id: { $dayOfWeek: "$createdAt" },
              averageViews: { $avg: "$views" },
              averageLikes: { $avg: "$likes" },
              postCount: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]
    );

    res.json({
      topPerformingPosts: topPosts,
      categoryPerformance,
      timeBasedMetrics: timeBasedMetrics.map((metric) => ({
        dayOfWeek: metric._id,
        averageViews: parseFloat(metric.averageViews.toFixed(2)),
        averageLikes: parseFloat(metric.averageLikes.toFixed(2)),
        postCount: metric.postCount,
      })),
    });
  } catch (error) {
    console.error("Error fetching content metrics:", error);
    res.status(500).json({
      error: "Failed to fetch content metrics",
    });
  }
};
