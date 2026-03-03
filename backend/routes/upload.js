const express = require("express");
const multer = require("multer");
const AdmZip = require("adm-zip");
const path = require("path");
const fs = require("fs-extra");
const { v4: uuidv4 } = require("uuid");
const { buildTree, detectFramework, detectLanguages, countNodes } = require("../utils/scanner");
const { analyzeRepo } = require("../utils/ast/analyzer");
const { cleanupRepo, REPO_DIR } = require("../utils/repoCache");

const router = express.Router();

// Accept a single ZIP file, max 200MB
const upload = multer({
  dest: path.join(REPO_DIR, "_uploads"),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isZip =
      file.mimetype === "application/zip" ||
      file.mimetype === "application/x-zip-compressed" ||
      file.originalname.endsWith(".zip");
    if (!isZip) {
      return cb(new Error("Only .zip files are accepted."));
    }
    cb(null, true);
  },
});

router.post("/", upload.single("repo"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "A .zip file is required.", code: "MISSING_FILE" });
  }

  const repoId = uuidv4();
  const repoPath = path.join(REPO_DIR, repoId);

  try {
    // Extract the ZIP into a temp directory
    const zip = new AdmZip(req.file.path);
    zip.extractAllTo(repoPath, true);

    // Many ZIPs contain a single top-level folder (e.g., "repo-main/").
    // If so, treat that inner folder as the actual repo root.
    const entries = await fs.readdir(repoPath);
    const nonHidden = entries.filter((e) => !e.startsWith("."));
    let effectiveRoot = repoPath;
    if (nonHidden.length === 1) {
      const single = path.join(repoPath, nonHidden[0]);
      if ((await fs.stat(single)).isDirectory()) {
        effectiveRoot = single;
      }
    }

    const tree = await buildTree(effectiveRoot);
    const languages = detectLanguages(tree);
    const stats = countNodes(tree);

    const [configFrameworks, astResult] = await Promise.all([
      detectFramework(effectiveRoot),
      analyzeRepo(effectiveRoot),
    ]);

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

    res.json({ ...result, cached: false });
  } catch (err) {
    if (err.message && err.message.includes("Only .zip")) {
      return res.status(400).json({ error: err.message, code: "INVALID_FILE_TYPE" });
    }
    res.status(500).json({ error: "Analysis failed", details: err.message });
  } finally {
    // Clean up extracted repo and the uploaded temp file
    await cleanupRepo(repoPath);
    if (req.file) {
      await fs.remove(req.file.path).catch(() => {});
    }
  }
});

// Multer error handler (e.g., file too large)
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "File too large. Maximum size is 200MB.", code: "FILE_TOO_LARGE" });
    }
    return res.status(400).json({ error: err.message, code: "UPLOAD_ERROR" });
  }
  if (err) {
    return res.status(400).json({ error: err.message, code: "UPLOAD_ERROR" });
  }
});

module.exports = router;
