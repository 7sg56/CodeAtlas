const express = require("express");
const cors = require("cors");
const analyzeRoute = require("./routes/analyze");
const cacheRoute = require("./routes/cache");
const { cleanupAllRepos, startPeriodicCleanup } = require("./utils/repoCache");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/analyze", analyzeRoute);
app.use("/api/cache", cacheRoute);

const PORT = process.env.BACKEND_PORT || process.env.PORT || 5001;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  // Wipe any repos left over from a previous crash/restart
  await cleanupAllRepos();

  // Start background sweep for stale repos (failed/abandoned requests)
  startPeriodicCleanup();
});