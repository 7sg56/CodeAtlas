const { detectFileRole } = require('./fileRoleDetector');
const { extractKeywords } = require('./keywordExtractor');

/**
 * Generates a compressed semantic summary for a file.
 * @param {Object} fileData - { relativePath, analysis, isDeep, language }
 * @returns {Object} Semantic summary.
 */
function generateFileSemanticSummary(fileData) {
  const { relativePath, analysis } = fileData;
  const roleInfo = detectFileRole(fileData);
  const keywordInfo = extractKeywords(fileData);

  const keyFunctions = (analysis.symbols?.functions?.map(f => f.name) || analysis.exports || []).slice(0, 10);
  
  // Complexity heuristic for health scoring
  const compList = analysis.complexity?.functions || [];
  const avgComplexity = compList.length > 0 
    ? compList.reduce((acc, c) => acc + (c.complexity || 0), 0) / compList.length 
    : 0;

  const summary = {
    file: relativePath,
    role: roleInfo.role,
    keywords: keywordInfo.keywords,
    key_functions: keyFunctions,
    imports: (analysis.imports || []).slice(0, 5),
    exports: (analysis.exports || []).slice(0, 5),
    avg_complexity: Number(avgComplexity.toFixed(1))
  };

  // Skip raw code symbols, only signals
  return summary;
}

module.exports = { generateFileSemanticSummary };
