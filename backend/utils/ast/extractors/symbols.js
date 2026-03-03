/**
 * Symbols Extractor
 *
 * Extracts structural "vocabulary" from a file: Functions, Classes, and Exports.
 */

const { findNodes } = require("../treeUtils");

function extractName(node, source, fieldName = "name") {
  const nameNode = node.childForFieldName(fieldName);
  if (nameNode) {
    return source.slice(nameNode.startIndex, nameNode.endIndex);
  }
  return null;
}

// ---------------------------------------------------------------------------
// JavaScript / TypeScript
// ---------------------------------------------------------------------------
function extractJSSymbols(tree, source, relativePath) {
  const functions = [];
  const classes = [];
  const exports = [];
  const root = tree.rootNode;

  // Functions
  const fnNodes = findNodes(root, (n) =>
    n.type === "function_declaration" || n.type === "method_definition" || n.type === "arrow_function"
  );

  for (const fn of fnNodes) {
    let name = extractName(fn, source);
    // Arrow functions assigned to variables
    if (!name && fn.parent && fn.parent.type === "variable_declarator") {
      name = extractName(fn.parent, source);
    }
    if (!name && fn.type !== "arrow_function") continue; // anonymous functions usually skipped

    const params = fn.childForFieldName("parameters");
    const paramCount = params ? params.namedChildCount : 0;
    const isAsync = fn.children.some((c) => c.type === "async");
    const isExported = fn.parent && fn.parent.type === "export_statement";

    functions.push({
      name: name || "anonymous",
      line: fn.startPosition.row + 1,
      paramCount,
      isAsync,
      isExported,
    });
  }

  // Classes
  const classNodes = findNodes(root, (n) => n.type === "class_declaration");
  for (const cls of classNodes) {
    const name = extractName(cls, source);
    if (!name) continue;

    const body = cls.childForFieldName("body");
    const methodCount = body
      ? body.namedChildren.filter((c) => c.type === "method_definition").length
      : 0;
    const isExported = cls.parent && cls.parent.type === "export_statement";

    classes.push({
      name,
      line: cls.startPosition.row + 1,
      methodCount,
      isExported,
    });
  }

  // Exports
  const exportNodes = findNodes(root, (n) => n.type === "export_statement");
  for (const exp of exportNodes) {
    const isDefault = exp.children.some((c) => c.type === "default");
    exports.push({
      type: isDefault ? "default" : "named",
      line: exp.startPosition.row + 1,
    });
  }

  return { functions, classes, exports };
}

// ---------------------------------------------------------------------------
// Python
// ---------------------------------------------------------------------------
function extractPythonSymbols(tree, source, relativePath) {
  const functions = [];
  const classes = [];
  const exports = [];
  const root = tree.rootNode;

  const fnNodes = findNodes(root, (n) => n.type === "function_definition");
  for (const fn of fnNodes) {
    const name = extractName(fn, source);
    if (!name) continue;

    const params = fn.childForFieldName("parameters");
    const paramCount = params ? params.namedChildCount : 0;
    const isAsync = fn.children.some((c) => c.type === "async");

    functions.push({
      name,
      line: fn.startPosition.row + 1,
      paramCount,
      isAsync,
      isExported: !name.startsWith("_"),
    });
  }

  const classNodes = findNodes(root, (n) => n.type === "class_definition");
  for (const cls of classNodes) {
    const name = extractName(cls, source);
    if (!name) continue;

    const body = cls.childForFieldName("body");
    const methodCount = body
      ? body.namedChildren.filter((c) => c.type === "function_definition").length
      : 0;

    classes.push({
      name,
      line: cls.startPosition.row + 1,
      methodCount,
      isExported: !name.startsWith("_"),
    });
  }

  return { functions, classes, exports };
}

// ---------------------------------------------------------------------------
// Generic Fallback
// ---------------------------------------------------------------------------
function extractGenericSymbols(tree, source, relativePath) {
  const functions = [];
  const classes = [];
  const exports = [];
  const root = tree.rootNode;

  // Simple generic heuristic
  const fnNodes = findNodes(
    root,
    (n) => n.type.includes("function") || n.type.includes("method")
  );
  for (const fn of fnNodes) {
    const name = extractName(fn, source);
    if (name && name.length > 0) {
      functions.push({
        name,
        line: fn.startPosition.row + 1,
        paramCount: 0,
        isAsync: false,
        isExported: true,
      });
    }
  }

  return { functions, classes, exports };
}

const EXTRACTORS = {
  javascript: extractJSSymbols,
  typescript: extractJSSymbols,
  python: extractPythonSymbols,
  go: extractGenericSymbols,
  rust: extractGenericSymbols,
  java: extractGenericSymbols,
  ruby: extractGenericSymbols,
};

/**
 * Extract functions, classes, and exports from a parsed file.
 *
 * @param {{ tree: object, source: string, language: string, relativePath: string }} parsed
 * @returns {{ functions: Array, classes: Array, exports: Array }}
 */
function extractSymbols({ tree, source, language, relativePath }) {
  const extractor = EXTRACTORS[language] || extractGenericSymbols;
  return extractor(tree, source, relativePath);
}

module.exports = { extractSymbols };
