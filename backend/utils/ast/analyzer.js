/**
 * AST Analyzer Orchestrator
 *
 * Ties together the AST engine and all extractors. Walks a repository,
 * parses every supported file, runs all extractors, and returns a
 * consolidated analysis result.
 */

const { walkAndParse } = require("./engine");
const { extractEntrypoints } = require("./extractors/entrypoints");
const { extractRoutes } = require("./extractors/routes");
const { extractFrameworks } = require("./extractors/frameworks");

/**
 * Run full AST analysis on a repository.
 *
 * @param {string} repoPath - Absolute path to the cloned repository
 * @returns {Promise<{
 *   entrypoints: Array<{ file: string, type: string, line: number, snippet: string }>,
 *   routes: Array<{ file: string, method: string, path: string, line: number, framework: string }>,
 *   astFrameworks: string[],
 *   filesAnalyzed: number,
 *   parseErrors: number,
 * }>}
 */
async function analyzeRepo(repoPath) {
  const entrypoints = [];
  const routes = [];
  const frameworkSet = new Set();
  let filesAnalyzed = 0;

  for await (const parsed of walkAndParse(repoPath)) {
    filesAnalyzed++;

    const fileData = {
      tree: parsed.tree,
      source: parsed.source,
      language: parsed.language,
      relativePath: parsed.relativePath,
    };

    // Run all extractors on this file
    const fileEntrypoints = extractEntrypoints(fileData);
    entrypoints.push(...fileEntrypoints);

    const fileRoutes = extractRoutes(fileData);
    routes.push(...fileRoutes);

    const fileFrameworks = extractFrameworks(fileData);
    for (const fw of fileFrameworks) {
      frameworkSet.add(fw);
    }
  }

  // Deduplicate routes by method+path+file
  const uniqueRoutes = deduplicateRoutes(routes);

  return {
    entrypoints,
    routes: uniqueRoutes,
    astFrameworks: Array.from(frameworkSet).sort(),
    filesAnalyzed,
  };
}

/**
 * Remove duplicate routes (same method + path + file).
 */
function deduplicateRoutes(routes) {
  const seen = new Set();
  return routes.filter((r) => {
    const key = `${r.method}:${r.path}:${r.file}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

module.exports = { analyzeRepo };
