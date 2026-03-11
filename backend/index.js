const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const analyzeRoute = require("./routes/analyze");
const uploadRoute = require("./routes/upload");
const exportRoute = require("./routes/export");
const cacheRoute = require("./routes/cache");
const { cleanupAllRepos, startPeriodicCleanup } = require("./utils/repoCache");

const app = express();
app.use(cors());
app.use(express.json({ limit: "250mb" }));
 
app.get("/", (req, res) => {
  res.json({ message: "CodeAtlas API is running", status: "healthy", version: "v0.1" });
});

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "CodeAtlas Backend is live!" });
});


// Rate limit analysis endpoints: 10 requests per 15 minutes per IP
const analysisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many analysis requests. Please try again later.", code: "RATE_LIMIT_EXCEEDED" },
  // Allow bypassing rate limit during development/testing via header
  skip: (req) => req.headers['x-bypass-rate-limit'] === 'true' || req.headers['x-bypass-rate-limit'] === '1'
});

app.use("/api/analyze", analysisLimiter, analyzeRoute);
app.use("/api/analyze/upload", analysisLimiter, uploadRoute);
app.use("/api/export", exportRoute);
app.use("/api/cache", cacheRoute);

const PORT = process.env.BACKEND_PORT || process.env.PORT || 5001;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  // Wipe any repos left over from a previous crash/restart
  await cleanupAllRepos();

  // Start background sweep for stale repos (failed/abandoned requests)
  startPeriodicCleanup();
});