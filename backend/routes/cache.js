const express = require("express");
const { clearCache, getCacheSize } = require("../utils/repoCache");

const router = express.Router();

/**
 * DELETE /api/cache — flush the in-memory analysis cache and remove cloned repos.
 */
router.delete("/", async (_req, res) => {
  try {
    const cleared = await clearCache();
    res.json({ cleared, message: `Cleared ${cleared} cached entries` });
  } catch (err) {
    res.status(500).json({ error: "Failed to clear cache", details: err.message });
  }
});

/**
 * GET /api/cache — return the current cache size.
 */
router.get("/", (_req, res) => {
  res.json({ size: getCacheSize() });
});

module.exports = router;
