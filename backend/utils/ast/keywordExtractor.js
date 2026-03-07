/**
 * Normalizes tokens by splitting camelCase, snake_case, etc.
 * @param {string} str 
 * @returns {string[]}
 */
function tokenize(str) {
  if (!str) return [];
  // Split camelCase and non-alphanumeric then filter short tokens/stopwords
  const result = str
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/\s+/)
    .filter(t => t.length > 2 && !['get', 'set', 'post', 'put', 'the', 'and', 'for', 'api', 'app', 'req', 'res'].includes(t));
  return [...new Set(result)];
}

/**
 * Extracts normalized keywords from file data symbols and names.
 * @param {Object} fileData 
 * @returns {Object} { keywords: string[] }
 */
function extractKeywords(fileData = {}) {
  const { relativePath = 'unknown', analysis = {} } = fileData;
  const safePath = relativePath || 'unknown';
  const pathParts = safePath.split('/');
  const fileName = pathParts.pop().replace(/\.\w+$/, "");
  
  const tokens = new Set();
  
  // 1. From file path and name
  pathParts.forEach(p => tokenize(p).forEach(t => tokens.add(t)));
  tokenize(fileName).forEach(t => tokens.add(t));
  
  // 2. From symbols (functions, classes)
  if (analysis.symbols) {
    analysis.symbols.functions?.forEach(f => tokenize(f.name).forEach(t => tokens.add(t)));
    analysis.symbols.classes?.forEach(c => tokenize(c.name).forEach(t => tokens.add(t)));
  }
  
  // 3. From exports
  if (analysis.exports) {
    analysis.exports.forEach(e => tokenize(typeof e === 'string' ? e : e.name).forEach(t => tokens.add(t)));
  }
  
  return {
    keywords: Array.from(tokens).slice(0, 15)
  };
}

module.exports = { extractKeywords, tokenize };
