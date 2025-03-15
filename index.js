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
const morgan = require("morgan");

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
morgan.token("custom-date", (req, res) => {
  return new Date().toUTCString();
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
app.use("/api/blogs", userRoutes);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/bogai")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
