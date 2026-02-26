const express = require("express");
const simpleGit = require("simple-git");
const fs = require("fs-extra");
const path = require("path");
const { buildTree, detectFramework, detectLanguages, countNodes } = require("../utils/scanner");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

router.post("/", async (req, res) => {
  const { githubUrl } = req.body;

  if (!githubUrl) {
    return res.status(400).json({ error: "GitHub URL required" });
  }

  const repoId = uuidv4();
  const repoPath = path.join(__dirname, `../../repos/${repoId}`);

  try {
    await simpleGit().clone(githubUrl, repoPath, ["--depth", "1"]);

    const tree = await buildTree(repoPath);
    const frameworks = await detectFramework(repoPath);
    const languages = detectLanguages(tree);
    const stats = countNodes(tree);

    res.json({
      repoId,
      frameworks,
      languages,
      stats,
      structure: tree,
    });
  } catch (err) {
    res.status(500).json({ error: "Clone failed", details: err.message });
  }
});

module.exports = router;