const simpleGit = require("simple-git");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { analyzeRepo } = require("../utils/ast/analyzer");
const { getCached, setCached, cleanupRepo, REPO_DIR } = require("../utils/repoCache");
const { storeAnalysisToS3, storeMetadataToDynamo } = require("../utils/storage/aws");
const { generateArchitecturalExplanation } = require("../utils/ai/groq");

/**
 * Main Analysis Orchestrator
 * Pipeline: Clone -> Unified AST -> Semantic Graph -> Module Summary -> Groq Context -> Store
 */
async function analyzeRepository(req, res) {
    const { githubUrl, repoUrl } = req.body;
    const url = githubUrl || repoUrl;

    if (!url) {
        return res.status(400).json({ error: "GitHub URL required" });
    }

    const cached = getCached(url);
    if (cached) {
        return res.json({ success: true, ...cached, cached: true });
    }

    const repoId = uuidv4();
    const repoPath = path.join(REPO_DIR, repoId);

    try {
        // 1. Clone repository
        await simpleGit().clone(url, repoPath, ["--depth", "1"]);
        const originalName = url.split("/").pop().replace(".git", "");

        // 2. Repository Intelligence Engine Pipeline
        const payload = await analyzeRepo(repoPath, originalName);
        payload.id = repoId;

        // 3. AI Architectural Reasoning (Phase 14 & 16)
        if (payload.groqPrompt) {
            console.log("[Groq AI] Requesting architectural reasoning...");
            const aiExplanation = await generateArchitecturalExplanation(payload.groqPrompt);
            payload.aiExplanation = aiExplanation;
            console.log("[Groq AI] Reasoning completed.");
        }

        // 4. Optional AWS Storage Integration (Phase 12)
        const s3Url = await storeAnalysisToS3(repoId, payload);
        await storeMetadataToDynamo(repoId, originalName, "COMPLETED", s3Url);

        // 5. Cache & Return Response
        setCached(url, payload);
        res.json({ success: true, ...payload, cached: false });

    } catch (err) {
        console.error("Repository Intelligent Engine failed:", err);
        res.status(500).json({ error: "Analysis failed", details: err.message });
    } finally {
        await cleanupRepo(repoPath);
    }
}

module.exports = { analyzeRepository };
