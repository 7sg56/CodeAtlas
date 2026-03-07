const simpleGit = require("simple-git");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { buildTree, detectLanguages, countNodes } = require("../utils/scanner");
const { analyzeRepo } = require("../utils/ast/analyzer");
const { getCached, setCached, cleanupRepo, REPO_DIR } = require("../utils/repoCache");

/**
 * Main Analysis Orchestrator
 */
async function analyzeRepository(req, res) {
    const { githubUrl, repoUrl } = req.body;
    const url = githubUrl || repoUrl;

    if (!url) {
        return res.status(400).json({ error: "GitHub URL required" });
    }

    // Check cache
    const cached = getCached(url);
    if (cached) {
        console.log("===== CACHED OPTIMIZED PAYLOAD =====");
        console.log(JSON.stringify(cached, null, 2));
        console.log("=====================================");
        return res.json({ success: true, ...cached, cached: true });
    }

    const repoId = uuidv4();
    const repoPath = path.join(REPO_DIR, repoId);

    try {
        // 1. Clone repo
        await simpleGit().clone(url, repoPath, ["--depth", "1"]);

        // 2. Run Optimized AST Analysis Pipeline
        const originalName = url.split("/").pop().replace(".git", "");
        const payload = await analyzeRepo(repoPath, originalName);

        // Add instance metadata
        payload.id = repoId;

        // Logging
        console.log("===== FINAL GROQ-READY OPTIMIZED PAYLOAD =====");
        console.log(JSON.stringify(payload, null, 2));
        console.log("===============================================");

        // Cache the result
        setCached(url, payload);

        // 3. Return response
        res.json({ success: true, ...payload, cached: false });

    } catch (err) {
        console.error("Analysis failed:", err);
        res.status(500).json({ error: "Analysis failed", details: err.message });
    } finally {
        await cleanupRepo(repoPath);
    }
}

module.exports = { analyzeRepository };
