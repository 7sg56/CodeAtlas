/**
 * Complexity Extractor
 *
 * Computes Cyclomatic Complexity and Max Nesting Depth per function.
 */

const { findNodes } = require("../treeUtils");

const COMPLEXITY_TYPES = new Set([
  "if_statement", "for_statement", "for_in_statement", "while_statement",
  "do_statement", "switch_case", "catch_clause", "ternary_expression",
  "logical_and", "logical_or",
  // python
  "elif_clause", "except_clause", "conditional_expression", "boolean_operator"
]);

function extractName(node, source, fieldName = "name") {
  const nameNode = node.childForFieldName(fieldName);
  if (nameNode) return source.slice(nameNode.startIndex, nameNode.endIndex);
  return "anonymous";
}

function calculateFunctionMetrics(fnNode) {
  let complexity = 1;
  let maxDepth = 0;

  function walk(node, depth) {
    if (COMPLEXITY_TYPES.has(node.type)) {
      complexity++;
    }

    let nextDepth = depth;
    if (node.type === "statement_block" || node.type === "block") {
      nextDepth++;
      if (nextDepth > maxDepth) maxDepth = nextDepth;
    }

    for (let i = 0; i < node.namedChildCount; i++) {
      walk(node.namedChild(i), nextDepth);
    }
  }

  walk(fnNode, 0);
  return { complexity, maxDepth };
}

function extractJSComplexity(tree, source) {
  const root = tree.rootNode;
  const metrics = [];

  const fnNodes = findNodes(root, (n) =>
    n.type === "function_declaration" || n.type === "method_definition" || n.type === "arrow_function"
  );

  for (const fn of fnNodes) {
    let name = extractName(fn, source);
    if (name === "anonymous" && fn.parent && fn.parent.type === "variable_declarator") {
      name = extractName(fn.parent, source);
    }
    if (name === "anonymous" && fn.type !== "arrow_function") continue;

    const { complexity, maxDepth } = calculateFunctionMetrics(fn);
    metrics.push({
      name,
      line: fn.startPosition.row + 1,
      complexity,
      maxDepth,
    });
  }

  return metrics;
}

function extractPythonComplexity(tree, source) {
  const root = tree.rootNode;
  const metrics = [];

  const fnNodes = findNodes(root, (n) => n.type === "function_definition");
  for (const fn of fnNodes) {
    const name = extractName(fn, source);
    if (!name) continue;

    const { complexity, maxDepth } = calculateFunctionMetrics(fn);
    metrics.push({
      name,
      line: fn.startPosition.row + 1,
      complexity,
      maxDepth,
    });
  }

  return metrics;
}

const EXTRACTORS = {
  javascript: extractJSComplexity,
  typescript: extractJSComplexity,
  python: extractPythonComplexity,
};

/**
 * Extract cyclomatic complexity and max depth.
 */
function extractComplexity({ tree, source, language, relativePath }) {
  const extractor = EXTRACTORS[language];
  if (!extractor) {
    return { file: relativePath, functions: [], summary: { avgComplexity: 0, maxComplexity: 0, totalFunctions: 0 } };
  }

  const functions = extractor(tree, source);

  let totalComp = 0;
  let maxComplexity = 0;
  for (const f of functions) {
    totalComp += f.complexity;
    if (f.complexity > maxComplexity) maxComplexity = f.complexity;
  }

  const avgComplexity = functions.length > 0 ? Number((totalComp / functions.length).toFixed(1)) : 0;

  return {
    file: relativePath,
    functions,
    summary: { avgComplexity, maxComplexity, totalFunctions: functions.length },
  };
}

module.exports = { extractComplexity };
