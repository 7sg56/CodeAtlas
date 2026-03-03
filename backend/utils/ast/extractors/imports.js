/**
 * Import/Dependency Extractor
 *
 * Walks ASTs to find local file-to-file import/require relationships.
 * Only captures relative/local imports -- external packages are skipped.
 *
 *   JS/TS:   import ... from "./path"  /  require("./path")
 *   Python:  from .module import ...   /  from module import ... (relative)
 *   Go:      local package imports (non-standard-lib, same module)
 *   Rust:    mod name;  /  use crate::...
 *   Ruby:    require_relative "path"
 */

const path = require("path");

const { findNodes } = require("../treeUtils");
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check if an import path is local/relative (not an external package).
 */
function isLocalImport(importPath) {
  return (
    importPath.startsWith("./") ||
    importPath.startsWith("../") ||
    importPath.startsWith("/")
  );
}

/**
 * Resolve a relative import path against the importing file's directory
 * and return the result relative to repo root.
 *
 * @param {string} importPath - The raw import string, e.g. "../utils/scanner"
 * @param {string} importerRelPath - Relative path of the importing file, e.g. "routes/analyze.js"
 * @returns {string} Resolved relative path, e.g. "utils/scanner"
 */
function resolveImportPath(importPath, importerRelPath) {
  const importerDir = path.dirname(importerRelPath);
  const resolved = path.normalize(path.join(importerDir, importPath));
  // Strip any leading extension-less artifacts and normalize
  return resolved.replace(/\\/g, "/");
}

/**
 * Strip file extension from a path.
 */
function stripExt(filePath) {
  return filePath.replace(/\.\w+$/, "");
}

// ---------------------------------------------------------------------------
// JavaScript / TypeScript
// ---------------------------------------------------------------------------

function extractJSImports(tree, source, relativePath) {
  const imports = [];
  const root = tree.rootNode;

  // ES imports: import ... from "./path"
  const importStatements = findNodes(root, (n) => n.type === "import_statement");
  for (const imp of importStatements) {
    const sourceNode = imp.childForFieldName("source");
    if (sourceNode) {
      const importSource = source
        .slice(sourceNode.startIndex, sourceNode.endIndex)
        .replace(/['"` ]/g, "");

      if (isLocalImport(importSource)) {
        const resolved = resolveImportPath(importSource, relativePath);
        imports.push({
          from: stripExt(relativePath),
          to: stripExt(resolved),
        });
      }
    }
  }

  // CommonJS require: require("./path")
  const calls = findNodes(root, (n) => n.type === "call_expression");
  for (const call of calls) {
    const fnNode = call.childForFieldName("function");
    if (!fnNode) continue;
    const fnText = source.slice(fnNode.startIndex, fnNode.endIndex);
    if (fnText !== "require") continue;

    const args = call.childForFieldName("arguments");
    if (!args || args.namedChildCount === 0) continue;

    const firstArg = args.namedChild(0);
    if (
      firstArg.type === "string" ||
      firstArg.type === "template_string" ||
      firstArg.type === "string_literal"
    ) {
      const importSource = source
        .slice(firstArg.startIndex, firstArg.endIndex)
        .replace(/['"` ]/g, "");

      if (isLocalImport(importSource)) {
        const resolved = resolveImportPath(importSource, relativePath);
        imports.push({
          from: stripExt(relativePath),
          to: stripExt(resolved),
        });
      }
    }
  }

  // Dynamic import: import("./path")
  for (const call of calls) {
    const fnNode = call.childForFieldName("function");
    if (!fnNode) continue;
    const fnText = source.slice(fnNode.startIndex, fnNode.endIndex);
    if (fnText !== "import") continue;

    const args = call.childForFieldName("arguments");
    if (!args || args.namedChildCount === 0) continue;

    const firstArg = args.namedChild(0);
    if (firstArg.type === "string" || firstArg.type === "template_string") {
      const importSource = source
        .slice(firstArg.startIndex, firstArg.endIndex)
        .replace(/['"` ]/g, "");

      if (isLocalImport(importSource)) {
        const resolved = resolveImportPath(importSource, relativePath);
        imports.push({
          from: stripExt(relativePath),
          to: stripExt(resolved),
        });
      }
    }
  }

  return imports;
}

// ---------------------------------------------------------------------------
// Python
// ---------------------------------------------------------------------------

function extractPythonImports(tree, source, relativePath) {
  const imports = [];
  const root = tree.rootNode;

  // from .module import ... (relative imports)
  const importStatements = findNodes(
    root,
    (n) => n.type === "import_from_statement"
  );

  for (const imp of importStatements) {
    const impText = source.slice(imp.startIndex, imp.endIndex);

    // Match: from .something import ... or from ..something import ...
    const relMatch = impText.match(/from\s+(\.+[\w.]*)\s+import/);
    if (relMatch) {
      const dots = relMatch[1].match(/^\.+/)[0];
      const modulePart = relMatch[1].slice(dots.length);

      // Resolve relative path based on dot count
      const importerDir = path.dirname(relativePath);
      let baseDir = importerDir;
      for (let i = 1; i < dots.length; i++) {
        baseDir = path.dirname(baseDir);
      }

      const modulePath = modulePart
        ? path.join(baseDir, modulePart.replace(/\./g, "/"))
        : baseDir;

      imports.push({
        from: stripExt(relativePath),
        to: modulePath.replace(/\\/g, "/"),
      });
    }
  }

  return imports;
}

// ---------------------------------------------------------------------------
// Go
// ---------------------------------------------------------------------------

function extractGoImports(tree, source, relativePath) {
  const imports = [];
  const root = tree.rootNode;

  // Go doesn't have relative imports in the filesystem sense,
  // but we can detect local package usage within the same module.
  // For now, we look at import specs and filter out standard library.
  const importSpecs = findNodes(root, (n) => n.type === "import_spec");
  for (const spec of importSpecs) {
    const pathNode = spec.childForFieldName("path");
    if (!pathNode) continue;

    const importPath = source
      .slice(pathNode.startIndex, pathNode.endIndex)
      .replace(/"/g, "");

    // Skip standard library (no dots in path = stdlib)
    // Local imports contain dots (github.com/...) or are relative
    if (importPath.includes("/") && importPath.includes(".")) {
      // Extract the last segment as the package name
      const segments = importPath.split("/");
      const pkgName = segments[segments.length - 1];
      imports.push({
        from: stripExt(relativePath),
        to: pkgName,
      });
    }
  }

  return imports;
}

// ---------------------------------------------------------------------------
// Rust
// ---------------------------------------------------------------------------

function extractRustImports(tree, source, relativePath) {
  const imports = [];
  const root = tree.rootNode;

  // mod declarations: mod name;
  const modDecls = findNodes(root, (n) => n.type === "mod_item");
  for (const mod of modDecls) {
    const nameNode = mod.childForFieldName("name");
    if (nameNode) {
      const modName = source.slice(nameNode.startIndex, nameNode.endIndex);
      // Skip if it has a body (inline mod, not a file reference)
      const body = mod.childForFieldName("body");
      if (!body) {
        const importerDir = path.dirname(relativePath);
        imports.push({
          from: stripExt(relativePath),
          to: path.join(importerDir, modName).replace(/\\/g, "/"),
        });
      }
    }
  }

  // use crate::module::...
  const useDecls = findNodes(root, (n) => n.type === "use_declaration");
  for (const u of useDecls) {
    const uText = source.slice(u.startIndex, u.endIndex);
    const crateMatch = uText.match(/use\s+crate::(\w+)/);
    if (crateMatch) {
      imports.push({
        from: stripExt(relativePath),
        to: `src/${crateMatch[1]}`,
      });
    }
  }

  return imports;
}

// ---------------------------------------------------------------------------
// Ruby
// ---------------------------------------------------------------------------

function extractRubyImports(tree, source, relativePath) {
  const imports = [];
  const root = tree.rootNode;

  // require_relative "path"
  const calls = findNodes(
    root,
    (n) => n.type === "call" || n.type === "command"
  );
  for (const call of calls) {
    const callText = source.slice(call.startIndex, call.endIndex);
    const match = callText.match(/require_relative\s+['"]([^'"]+)['"]/);
    if (match) {
      const resolved = resolveImportPath(match[1], relativePath);
      imports.push({
        from: stripExt(relativePath),
        to: stripExt(resolved),
      });
    }
  }

  return imports;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

const EXTRACTORS = {
  javascript: extractJSImports,
  typescript: extractJSImports,
  python: extractPythonImports,
  go: extractGoImports,
  rust: extractRustImports,
  ruby: extractRubyImports,
  // Java: skip -- package imports are always fully qualified external paths
};

/**
 * Extract local file-to-file import edges from a parsed file.
 *
 * @param {{ tree: object, source: string, language: string, relativePath: string }} parsed
 * @returns {Array<{ from: string, to: string }>}
 */
function extractImports({ tree, source, language, relativePath }) {
  const extractor = EXTRACTORS[language];
  if (!extractor) return [];
  return extractor(tree, source, relativePath);
}

module.exports = { extractImports };
