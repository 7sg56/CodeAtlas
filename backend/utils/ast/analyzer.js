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
const { extractImports } = require("./extractors/imports");
const { extractSymbols } = require("./extractors/symbols");
const { extractComplexity } = require("./extractors/complexity");

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
  const dependencies = [];
  const symbols = [];
  const complexity = [];
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

    const fileImports = extractImports(fileData);
    dependencies.push(...fileImports);

    const fileFrameworks = extractFrameworks(fileData);
    for (const fw of fileFrameworks) {
      frameworkSet.add(fw);
    }

    const fileSymbols = extractSymbols(fileData);
    if (fileSymbols) {
      symbols.push({ file: parsed.relativePath, ...fileSymbols });
    }

    const fileComplexity = extractComplexity(fileData);
    if (fileComplexity && fileComplexity.functions.length > 0) {
      complexity.push(fileComplexity);
    }
  }

  // Deduplicate routes by method+path+file
  const uniqueRoutes = deduplicateRoutes(routes);

  // Deduplicate dependency edges (same from + to)
  const uniqueDeps = deduplicateDeps(dependencies);

  let totalFunctions = 0;
  let totalClasses = 0;
  let totalExports = 0;
  let sumComplexity = 0;
  let compFuncCount = 0;

  for (const s of symbols) {
    totalFunctions += s.functions.length;
    totalClasses += s.classes.length;
    totalExports += s.exports.length;
  }

  for (const c of complexity) {
    for (const f of c.functions) {
      sumComplexity += f.complexity;
      compFuncCount++;
    }
  }

  const avgComplexity = compFuncCount > 0 ? Number((sumComplexity / compFuncCount).toFixed(1)) : 0;

  return {
    entrypoints,
    routes: uniqueRoutes,
    dependencies: uniqueDeps,
    astFrameworks: Array.from(frameworkSet).sort(),
    filesAnalyzed,
    symbols,
    complexity,
    summary: {
      totalFunctions,
      totalClasses,
      totalExports,
      avgComplexity
    }
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

/**
 * Remove duplicate dependency edges (same from + to).
 */
function deduplicateDeps(deps) {
  const seen = new Set();
  return deps.filter((d) => {
    const key = `${d.from}:${d.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

module.exports = { analyzeRepo };
