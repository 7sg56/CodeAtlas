/**
 * AST Parser Engine
 *
 * Core module that parses source files into ASTs using Tree-sitter,
 * dispatching to the correct language grammar based on file extension.
 */

const Parser = require("tree-sitter");
const fs = require("fs-extra");
const path = require("path");

// Language grammar registry -- lazy-loaded to avoid upfront cost
const GRAMMAR_MAP = {
  ".js": () => require("tree-sitter-javascript"),
  ".mjs": () => require("tree-sitter-javascript"),
  ".cjs": () => require("tree-sitter-javascript"),
  ".jsx": () => require("tree-sitter-javascript"),
  ".ts": () => require("tree-sitter-typescript").typescript,
  ".tsx": () => require("tree-sitter-typescript").tsx,
  ".py": () => require("tree-sitter-python"),
  ".go": () => require("tree-sitter-go"),
  ".rs": () => require("tree-sitter-rust"),
  ".java": () => require("tree-sitter-java"),
  ".rb": () => require("tree-sitter-ruby"),
};

// Cache loaded grammars so we only require() once per extension
const _grammarCache = {};

/**
 * Get or create a Parser instance for the given file extension.
 * Returns null if the extension is not supported.
 */
function getParser(ext) {
  if (!GRAMMAR_MAP[ext]) return null;

  if (!_grammarCache[ext]) {
    const parser = new Parser();
    parser.setLanguage(GRAMMAR_MAP[ext]());
    _grammarCache[ext] = parser;
  }

  return _grammarCache[ext];
}

/**
 * Parse a single file and return its AST tree.
 *
 * @param {string} filePath - Absolute path to the source file
 * @returns {{ tree: object, source: string, language: string, ext: string } | null}
 */
async function parseFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const parser = getParser(ext);
  if (!parser) return null;

  try {
    const source = await fs.readFile(filePath, "utf-8");

    // Skip very large files (> 500KB) to avoid perf issues
    if (source.length > 500 * 1024) return null;

    const tree = parser.parse(source);
    return {
      tree,
      source,
      language: extToLanguage(ext),
      ext,
    };
  } catch (e) {
    // File unreadable or parse error -- tree-sitter is error-tolerant,
    // so this is likely an I/O issue
    return null;
  }
}

/**
 * Walk the file tree and parse all supported source files.
 * Yields { filePath, tree, source, language } objects.
 *
 * @param {string} dir - Root directory to walk
 * @param {string} rootDir - The repo root (for computing relative paths)
 * @returns {AsyncGenerator<{ filePath: string, relativePath: string, tree: object, source: string, language: string }>}
 */
async function* walkAndParse(dir, rootDir = dir) {
  const SKIP_DIRS = new Set([
    "node_modules", ".git", "dist", "build", ".next",
    "__pycache__", ".venv", "venv", "vendor", "target",
    ".idea", ".vscode", "coverage", "docs", "tests",
    "migrations", "scripts", "public", "assets", "styles"
  ]);

  const SKIP_EXTENSIONS = new Set([
    ".md", ".css", ".scss", ".png", ".jpg", ".jpeg", ".svg", ".gif", ".ico"
  ]);

  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (e) {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(rootDir, fullPath);

    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        yield* walkAndParse(fullPath, rootDir);
      }
    } else if (entry.isFile()) {
      const name = entry.name.toLowerCase();
      const ext = path.extname(name);

      // Skip test files, spec files, config files, and low-priority extensions
      if (
        name.includes(".test.") ||
        name.includes(".spec.") ||
        name.includes(".config.") ||
        SKIP_EXTENSIONS.has(ext)
      ) {
        continue;
      }

      const result = await parseFile(fullPath);
      if (result) {
        yield {
          filePath: fullPath,
          relativePath: relPath.replace(/\\/g, "/"),
          ...result,
        };
      }
    }
  }
}

function extToLanguage(ext) {
  const map = {
    ".js": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".py": "python",
    ".go": "go",
    ".rs": "rust",
    ".java": "java",
    ".rb": "ruby",
  };
  return map[ext] || "unknown";
}

/**
 * Check if a file extension is supported for AST parsing.
 */
function isSupported(ext) {
  return ext in GRAMMAR_MAP;
}

module.exports = { parseFile, walkAndParse, isSupported, getParser };
