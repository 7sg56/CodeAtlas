/**
 * Entrypoint Extractor
 *
 * Detects application entry points / bootstrap files by walking ASTs
 * and looking for language-specific patterns:
 *
 *   JS/TS:  app.listen(), createServer(), ReactDOM.render/createRoot(),
 *           export default (in Next.js pages), module bootstrapping
 *   Python: if __name__ == "__main__":, uvicorn.run(), app.run()
 *   Go:    func main()
 *   Rust:  fn main()
 *   Java:  public static void main(String[])
 *   Ruby:  if __FILE__ == $0 / $PROGRAM_NAME
 */

const { findNodes } = require("../treeUtils");
/**
 * Check if a call expression matches any of the given dot-patterns.
 * e.g., "app.listen", "http.createServer"
 */
function matchesCallPattern(node, source, patterns) {
  if (node.type !== "call_expression") return false;
  const fnNode = node.childForFieldName("function");
  if (!fnNode) return false;

  const fnText = source.slice(fnNode.startIndex, fnNode.endIndex);
  return patterns.some((p) => fnText.endsWith(p));
}

// ---------------------------------------------------------------------------
// Language-specific entrypoint detection
// ---------------------------------------------------------------------------

function extractJS(tree, source, relativePath) {
  const entrypoints = [];
  const root = tree.rootNode;

  // Server bootstrap patterns
  const serverPatterns = [
    ".listen",
    "createServer",
    "createApp",
    ".bootstrap",   // NestJS NestFactory.create().bootstrap or .listen
  ];

  // React bootstrap patterns
  const reactPatterns = [
    "ReactDOM.render",
    "ReactDOM.createRoot",
    "createRoot",
    "hydrateRoot",
  ];

  const calls = findNodes(root, (n) => n.type === "call_expression");

  for (const call of calls) {
    if (matchesCallPattern(call, source, serverPatterns)) {
      entrypoints.push({
        file: relativePath,
        type: "server_bootstrap",
        line: call.startPosition.row + 1,
        snippet: source.slice(call.startIndex, call.endIndex).substring(0, 120),
      });
    }

    if (matchesCallPattern(call, source, reactPatterns)) {
      entrypoints.push({
        file: relativePath,
        type: "client_bootstrap",
        line: call.startPosition.row + 1,
        snippet: source.slice(call.startIndex, call.endIndex).substring(0, 120),
      });
    }
  }

  // NestJS-style bootstrap: NestFactory.create(...)
  for (const call of calls) {
    if (matchesCallPattern(call, source, ["NestFactory.create"])) {
      entrypoints.push({
        file: relativePath,
        type: "server_bootstrap",
        line: call.startPosition.row + 1,
        snippet: source.slice(call.startIndex, call.endIndex).substring(0, 120),
      });
    }
  }

  return entrypoints;
}

function extractPython(tree, source, relativePath) {
  const entrypoints = [];
  const root = tree.rootNode;

  // Look for: if __name__ == "__main__":
  const ifStatements = findNodes(root, (n) => n.type === "if_statement");
  for (const ifNode of ifStatements) {
    const condition = ifNode.childForFieldName("condition");
    if (condition) {
      const condText = source.slice(condition.startIndex, condition.endIndex);
      if (condText.includes("__name__") && condText.includes("__main__")) {
        entrypoints.push({
          file: relativePath,
          type: "main_guard",
          line: ifNode.startPosition.row + 1,
          snippet: condText.substring(0, 120),
        });
      }
    }
  }

  // Look for: uvicorn.run(), app.run()
  const calls = findNodes(root, (n) => n.type === "call");
  for (const call of calls) {
    const fnNode = call.childForFieldName("function");
    if (!fnNode) continue;
    const fnText = source.slice(fnNode.startIndex, fnNode.endIndex);
    if (fnText.includes("uvicorn.run") || fnText.endsWith(".run")) {
      entrypoints.push({
        file: relativePath,
        type: "server_bootstrap",
        line: call.startPosition.row + 1,
        snippet: source.slice(call.startIndex, call.endIndex).substring(0, 120),
      });
    }
  }

  return entrypoints;
}

function extractGo(tree, source, relativePath) {
  const entrypoints = [];
  const root = tree.rootNode;

  // Look for: func main()
  const funcDecls = findNodes(root, (n) => n.type === "function_declaration");
  for (const fn of funcDecls) {
    const nameNode = fn.childForFieldName("name");
    if (nameNode) {
      const name = source.slice(nameNode.startIndex, nameNode.endIndex);
      if (name === "main") {
        entrypoints.push({
          file: relativePath,
          type: "main_function",
          line: fn.startPosition.row + 1,
          snippet: `func main()`,
        });
      }
    }
  }

  return entrypoints;
}

function extractRust(tree, source, relativePath) {
  const entrypoints = [];
  const root = tree.rootNode;

  const funcItems = findNodes(root, (n) => n.type === "function_item");
  for (const fn of funcItems) {
    const nameNode = fn.childForFieldName("name");
    if (nameNode) {
      const name = source.slice(nameNode.startIndex, nameNode.endIndex);
      if (name === "main") {
        entrypoints.push({
          file: relativePath,
          type: "main_function",
          line: fn.startPosition.row + 1,
          snippet: `fn main()`,
        });
      }
    }
  }

  return entrypoints;
}

function extractJava(tree, source, relativePath) {
  const entrypoints = [];
  const root = tree.rootNode;

  // Look for: public static void main(String[] args)
  const methods = findNodes(root, (n) => n.type === "method_declaration");
  for (const method of methods) {
    const nameNode = method.childForFieldName("name");
    if (nameNode) {
      const name = source.slice(nameNode.startIndex, nameNode.endIndex);
      if (name === "main") {
        const methodText = source.slice(method.startIndex, method.endIndex);
        if (methodText.includes("static") && methodText.includes("void")) {
          entrypoints.push({
            file: relativePath,
            type: "main_function",
            line: method.startPosition.row + 1,
            snippet: `public static void main(String[] args)`,
          });
        }
      }
    }
  }

  // Look for @SpringBootApplication annotation
  const annotations = findNodes(root, (n) => n.type === "marker_annotation" || n.type === "annotation");
  for (const ann of annotations) {
    const annText = source.slice(ann.startIndex, ann.endIndex);
    if (annText.includes("SpringBootApplication")) {
      entrypoints.push({
        file: relativePath,
        type: "server_bootstrap",
        line: ann.startPosition.row + 1,
        snippet: annText.substring(0, 120),
      });
    }
  }

  return entrypoints;
}

function extractRuby(tree, source, relativePath) {
  const entrypoints = [];
  const root = tree.rootNode;

  // Look for: if __FILE__ == $0
  const ifStatements = findNodes(root, (n) => n.type === "if" || n.type === "if_modifier");
  for (const ifNode of ifStatements) {
    const text = source.slice(ifNode.startIndex, ifNode.endIndex);
    if (text.includes("__FILE__") && (text.includes("$0") || text.includes("$PROGRAM_NAME"))) {
      entrypoints.push({
        file: relativePath,
        type: "main_guard",
        line: ifNode.startPosition.row + 1,
        snippet: text.substring(0, 120),
      });
    }
  }

  return entrypoints;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

const EXTRACTORS = {
  javascript: extractJS,
  typescript: extractJS, // same patterns
  python: extractPython,
  go: extractGo,
  rust: extractRust,
  java: extractJava,
  ruby: extractRuby,
};

/**
 * Extract entrypoints from a parsed file.
 *
 * @param {{ tree: object, source: string, language: string, relativePath: string }} parsed
 * @returns {Array<{ file: string, type: string, line: number, snippet: string }>}
 */
function extractEntrypoints({ tree, source, language, relativePath }) {
  const extractor = EXTRACTORS[language];
  if (!extractor) return [];
  return extractor(tree, source, relativePath);
}

module.exports = { extractEntrypoints };
