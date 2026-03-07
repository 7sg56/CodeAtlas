const path = require('path');

/**
 * Identify the recommended reading order for new developers.
 * @param {Object} fingerprint - Fingerprint result.
 * @param {Object[]} fileSummaries - List of file semantic summaries.
 * @param {Object[]} moduleDependencies - List of module dependencies.
 * @returns {Object} { recommended_reading_order: string[] }
 */
function buildOnboardingPath(fingerprint, fileSummaries, moduleDependencies) {
  const { entrypoints, api_routes } = fingerprint;
  const readingOrder = new Set();
  
  // 1. Entrypoints are always first
  entrypoints.slice(0, 2).forEach(ep => readingOrder.add(ep));
  
  // 2. High dependency centrality (hub) files
  // (In-degree can be inferred from module dependencies)
  const topHubs = moduleDependencies && moduleDependencies.length > 0
    ? moduleDependencies.map(d => d.to).slice(0, 2)
    : [];
  
  topHubs.forEach(hubName => {
    // Find the primary file in that module
    const hubFile = fileSummaries.find(s => s.role === 'engine' || s.role === 'router');
    if (hubFile) readingOrder.add(hubFile.file);
  });

  // 3. Router files are second
  const topRouter = fileSummaries.find(s => s.role === 'router');
  if (topRouter) readingOrder.add(topRouter.file);

  // 4. Core engine files are third
  const coreEngine = fileSummaries.find(s => s.role === 'engine');
  if (coreEngine) readingOrder.add(coreEngine.file);

  return {
    recommended_reading_order: Array.from(readingOrder).slice(0, 6)
  };
}

module.exports = { buildOnboardingPath };
