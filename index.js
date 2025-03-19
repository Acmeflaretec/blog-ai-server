require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth.routes");
const businessRoutes = require("./routes/business.routes");
const blogPostRoutes = require("./routes/blogpost.routes");
const contentRoutes = require("./routes/content.routes");
const trendsRoutes = require("./routes/trends.routes");
const settingsRoutes = require("./routes/settings.routes");
const userRoutes = require('./routes/user.routes')
const trendingRoutes = require('./routes/trending.routes')
const morgan = require("morgan");

const app = express();

// Increase payload limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure CORS with specific options
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 600 // Cache preflight requests for 10 minutes
}));

app.use(cookieParser());
morgan.token("custom-date", (req, res) => {
  return new Date().toUTCString();
});
app.use((req, res, next) => {
  // Set timeout to 5 minutes
  req.setTimeout(300000);
  res.setTimeout(300000);
  
  // Set keep-alive headers
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=300');
  
  next();
});
app.use(
  morgan(
    ":custom-date :method :url :status :res[content-length] - :response-time ms"
  )
);
console.log(morgan);
// Routes
app.use("/api/auth", authRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/posts", blogPostRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/trends", trendsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/trending", trendingRoutes);
app.use("/api/user", userRoutes);
// Configure MongoDB connection with timeouts
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 300000,
  connectTimeoutMS: 30000
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', {
    message: err.message,
    code: err.code,
    stack: err.stack
  });

  // Handle specific error types
  if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET') {
    return res.status(504).json({
      error: 'Request timeout',
      message: 'The request took too long to process'
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    error: 'Server Error',
    message: err.message || 'An unexpected error occurred'
  });
});

// Start server
const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Configure server timeouts
server.keepAliveTimeout = 300000; // 5 minutes
server.headersTimeout = 301000; // Just above keepAliveTimeout

// Handle server shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('Server and MongoDB connection closed.');
      process.exit(0);
    });
  });
});

module.exports = app;
