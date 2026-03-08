const fs = require("fs-extra");
const path = require("path");
const { getMetadataFromDynamo, getAnalysisFromS3 } = require("./storage/aws");

// ---------------------------------------------------------------------------
// Configuration (override via environment variables)
// ---------------------------------------------------------------------------
const CACHE_TTL_MS = parseInt(process.env.CACHE_TTL_MS, 10) || 3_600_000; // 1 hour
const CACHE_MAX_ENTRIES = parseInt(process.env.CACHE_MAX_ENTRIES, 10) || 100;
const STALE_REPO_AGE_MS = parseInt(process.env.STALE_REPO_AGE_MS, 10) || 600_000; // 10 min
const CLEANUP_INTERVAL_MS = parseInt(process.env.CLEANUP_INTERVAL_MS, 10) || 300_000; // 5 min

// Absolute path to the repos directory (matches analyze.js: __dirname/../../repos)
const REPO_DIR = path.resolve(__dirname, "../../repos");

// ---------------------------------------------------------------------------
// In-memory LRU result cache
// ---------------------------------------------------------------------------
// Map preserves insertion order, which we use for LRU eviction.
const cache = new Map();

/**
 * Normalize a GitHub URL into a stable cache key.
 * Strips trailing slashes, ".git" suffix, and lowercases.
 */
function normalizeUrl(url) {
  return url
    .trim()
    .toLowerCase()
    .replace(/\/+$/, "")
    .replace(/\.git$/, "");
}

/**
 * Return a cached analysis result, or null if not cached / expired.
 * Accessing a key moves it to the "most recently used" position.
 * This function also acts as a read-through cache for DynamoDB/S3.
 */
async function getCached(url) {
  const key = normalizeUrl(url);
  const entry = cache.get(key);
  
  // 1. Check in-memory fast cache
  if (entry) {
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      cache.delete(key);
    } else {
      // Move to end (most recently used)
      cache.delete(key);
      cache.set(key, entry);
      return entry.result;
    }
  }

  // 2. Fallback to AWS DynamoDB + S3 Distributed Cache
  try {
    const metadata = await getMetadataFromDynamo(key);
    if (metadata && metadata.analysisStatus === 'COMPLETED' && metadata.s3Url) {
      console.log(`[AWS Cache Hit] DynamoDB metadata found for ${key}`);
      const s3Data = await getAnalysisFromS3(metadata.s3Url);
      
      if (s3Data) {
        console.log(`[AWS Cache Hit] S3 data retrieved successfully for ${key}`);
        // Populate the rapid in-memory cache for subsequent requests
        setCached(url, s3Data);
        return s3Data;
      }
    }
  } catch (err) {
    console.error(`[AWS Cache Error] Failed to retrieve from distributed cache for ${key}: ${err.message}`);
  }

  return null;
}

/**
 * Store an analysis result in the cache.
 * Evicts the least-recently-used entry if the cache is full.
 */
function setCached(url, result) {
  const key = normalizeUrl(url);

  // If key already exists, delete so re-insert moves it to the end
  if (cache.has(key)) {
    cache.delete(key);
  }

  // Evict oldest entry if at capacity
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }

  cache.set(key, { result, timestamp: Date.now() });
}

/**
 * Clear the entire in-memory cache and remove all cloned repos.
 * Returns the number of cache entries that were cleared.
 */
async function clearCache() {
  const count = cache.size;
  cache.clear();
  await cleanupAllRepos();
  return count;
}

/**
 * Return the current number of entries in the in-memory cache.
 */
function getCacheSize() {
  return cache.size;
}

// ---------------------------------------------------------------------------
// Repo cleanup utilities
// ---------------------------------------------------------------------------

/**
 * Remove a single cloned repo directory. Errors are swallowed to avoid
 * crashing the request if cleanup fails (e.g., permission issues).
 */
async function cleanupRepo(repoPath) {
  try {
    await fs.remove(repoPath);
  } catch (err) {
    console.error(`[repoCache] Failed to clean up ${repoPath}:`, err.message);
  }
}

/**
 * Remove ALL directories inside the repos folder.
 * Called on server startup to wipe crash leftovers.
 */
async function cleanupAllRepos() {
  try {
    await fs.ensureDir(REPO_DIR);
    const entries = await fs.readdir(REPO_DIR);
    await Promise.all(
      entries.map((entry) => fs.remove(path.join(REPO_DIR, entry)))
    );
    if (entries.length > 0) {
      console.log(`[repoCache] Startup cleanup: removed ${entries.length} leftover repo(s)`);
    }
  } catch (err) {
    console.error("[repoCache] Startup cleanup failed:", err.message);
  }
}

/**
 * Delete any repo directory whose mtime is older than STALE_REPO_AGE_MS.
 * Intended to catch repos from failed/abandoned requests that slipped
 * through the finally block in the analyze route.
 */
async function sweepStaleRepos() {
  try {
    await fs.ensureDir(REPO_DIR);
    const entries = await fs.readdir(REPO_DIR);
    const now = Date.now();
    let swept = 0;

    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(REPO_DIR, entry);
        try {
          const stat = await fs.stat(fullPath);
          if (stat.isDirectory() && now - stat.mtimeMs > STALE_REPO_AGE_MS) {
            await fs.remove(fullPath);
            swept++;
          }
        } catch (e) {
          // entry may have been removed by another cleanup; ignore
        }
      })
    );

    if (swept > 0) {
      console.log(`[repoCache] Periodic sweep: removed ${swept} stale repo(s)`);
    }
  } catch (err) {
    console.error("[repoCache] Periodic sweep failed:", err.message);
  }
}

let cleanupTimer = null;

/**
 * Start the periodic background sweep.
 * Safe to call multiple times; subsequent calls are no-ops.
 */
function startPeriodicCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(sweepStaleRepos, CLEANUP_INTERVAL_MS);
  // Allow the process to exit even if the timer is still running
  cleanupTimer.unref();
  console.log(
    `[repoCache] Periodic cleanup started (every ${CLEANUP_INTERVAL_MS / 1000}s, stale after ${STALE_REPO_AGE_MS / 1000}s)`
  );
}

module.exports = {
  getCached,
  setCached,
  normalizeUrl,
  cleanupRepo,
  cleanupAllRepos,
  clearCache,
  getCacheSize,
  startPeriodicCleanup,
  REPO_DIR,
};
