const express = require("express");
const simpleGit = require("simple-git");
const path = require("path");
const { buildTree, detectFramework, detectLanguages, countNodes } = require("../utils/scanner");
const { analyzeRepo } = require("../utils/ast/analyzer");
const { v4: uuidv4 } = require("uuid");
const { getCached, setCached, cleanupRepo, REPO_DIR } = require("../utils/repoCache");

const router = express.Router();

// Matches GitHub, GitLab, Bitbucket URLs (with optional .git suffix)
const VALID_GIT_URL = /^https?:\/\/(github\.com|gitlab\.com|bitbucket\.org)\/[\w.\-]+\/[\w.\-]+(\.git)?\/?$/i;

router.post("/", async (req, res) => {
  const { githubUrl } = req.body;

  if (!githubUrl) {
    return res.status(400).json({ error: "Repository URL is required.", code: "MISSING_URL" });
  }

  if (!VALID_GIT_URL.test(githubUrl.trim())) {
    return res.status(400).json({
      error: "Invalid repository URL. Provide a valid GitHub, GitLab, or Bitbucket URL (e.g., https://github.com/owner/repo).",
      code: "INVALID_URL",
    });
  }

  // Return cached result immediately if available
  const cached = getCached(githubUrl);
  if (cached) {
    return res.json({ ...cached, cached: true });
  }

  const repoId = uuidv4();
  const repoPath = path.join(REPO_DIR, repoId);

  try {
    await simpleGit().clone(githubUrl, repoPath, ["--depth", "1"]);

    const tree = await buildTree(repoPath);
    const languages = detectLanguages(tree);
    const stats = countNodes(tree);

    // Run both detection strategies in parallel
    const [configFrameworks, astResult] = await Promise.all([
      detectFramework(repoPath),
      analyzeRepo(repoPath),
    ]);

    // Merge config-based and AST-based framework detection (deduplicated)
    const allFrameworks = Array.from(
      new Set([...configFrameworks, ...astResult.astFrameworks])
    ).filter((f) => f !== "Unknown");

    const result = {
      repoId,
      frameworks: allFrameworks.length > 0 ? allFrameworks : ["Unknown"],
      languages,
      stats,
      structure: tree,
      entrypoints: astResult.entrypoints,
      routes: astResult.routes,
      dependencies: astResult.dependencies,
      symbols: astResult.symbols,
      complexity: astResult.complexity,
      analysis: {
        filesAnalyzed: astResult.filesAnalyzed,
        summary: astResult.summary,
      },
    };

    // Cache the result so the same URL returns instantly next time
    setCached(githubUrl, result);

    res.json({ ...result, cached: false });
  } catch (err) {
    res.status(500).json({ error: "Clone failed", details: err.message });
  } finally {
    // Always clean up the cloned repo, even if analysis fails
    await cleanupRepo(repoPath);
  }
});

module.exports = router;