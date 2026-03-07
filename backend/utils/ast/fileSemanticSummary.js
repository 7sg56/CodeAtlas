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

  const summary = {
    file: relativePath,
    role: roleInfo.role,
    keywords: keywordInfo.keywords,
    key_functions: keyFunctions,
    imports: (analysis.imports || []).slice(0, 5),
    exports: (analysis.exports || []).slice(0, 5)
  };

  // Skip raw code symbols, only signals
  return summary;
}

module.exports = { generateFileSemanticSummary };
