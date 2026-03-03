/**
 * AST-Based Framework Extractor
 *
 * Detects frameworks by analyzing actual import/require statements in source
 * code, rather than relying solely on config file string matching. This is more
 * reliable because it proves the framework is actually *used*, not just listed
 * as a dependency.
 *
 * This supplements (does not replace) the existing config-file-based detection
 * in scanner.js. The two approaches are merged to produce a combined result.
 */

const { findNodes } = require("../treeUtils");
// ---------------------------------------------------------------------------
// Import pattern -> framework mapping
// ---------------------------------------------------------------------------

const JS_IMPORT_PATTERNS = [
  // Format: [pattern to check for in import source, framework label]
  ["@nestjs/", "NestJS"],
  ["@angular/", "Angular"],
  ["next/", "Next.js"],
  ["next", "Next.js"],           // import next from 'next'
  ["nuxt", "Nuxt.js"],
  ["vue", "Vue.js"],
  ["svelte", "Svelte"],
  ["react-dom", "React"],
  ["react", "React"],
  ["express", "Express"],
  ["fastify", "Fastify"],
  ["koa", "Koa"],
  ["@hapi/", "Hapi"],
  ["socket.io", "Socket.io"],
  ["mongoose", "Mongoose"],
  ["prisma", "Prisma"],
  ["typeorm", "TypeORM"],
  ["sequelize", "Sequelize"],
  ["graphql", "GraphQL"],
  ["@apollo/", "Apollo GraphQL"],
  ["tailwindcss", "Tailwind CSS"],
  ["@tauri-apps/", "Tauri"],
  ["electron", "Electron"],
];

const PYTHON_IMPORT_PATTERNS = [
  ["django", "Django"],
  ["flask", "Flask"],
  ["fastapi", "FastAPI"],
  ["streamlit", "Streamlit"],
  ["tornado", "Tornado"],
  ["celery", "Celery"],
  ["sqlalchemy", "SQLAlchemy"],
  ["pandas", "Pandas"],
  ["numpy", "NumPy"],
  ["tensorflow", "TensorFlow"],
  ["torch", "PyTorch"],
  ["pytest", "pytest"],
];

const GO_IMPORT_PATTERNS = [
  ["github.com/gin-gonic/gin", "Gin"],
  ["github.com/labstack/echo", "Echo"],
  ["github.com/gofiber/fiber", "Fiber"],
  ["github.com/gorilla/mux", "Gorilla Mux"],
  ["gorm.io/gorm", "GORM"],
  ["github.com/jmoiron/sqlx", "sqlx"],
];

const RUST_IMPORT_PATTERNS = [
  ["actix_web", "Actix"],
  ["axum", "Axum"],
  ["rocket", "Rocket"],
  ["warp", "Warp"],
  ["tauri", "Tauri"],
  ["diesel", "Diesel"],
  ["sqlx", "sqlx"],
  ["tokio", "Tokio"],
];

const JAVA_IMPORT_PATTERNS = [
  ["org.springframework.boot", "Spring Boot"],
  ["org.springframework", "Spring"],
  ["io.quarkus", "Quarkus"],
  ["io.micronaut", "Micronaut"],
  ["javax.servlet", "Java Servlet"],
  ["jakarta.servlet", "Jakarta Servlet"],
];

const RUBY_IMPORT_PATTERNS = [
  ["rails", "Ruby on Rails"],
  ["sinatra", "Sinatra"],
  ["grape", "Grape"],
];

// ---------------------------------------------------------------------------
// Language-specific import extraction
// ---------------------------------------------------------------------------

function extractJSFrameworks(tree, source) {
  const frameworks = new Set();
  const root = tree.rootNode;

  // ES import: import ... from "source"
  const imports = findNodes(root, (n) => n.type === "import_statement");
  for (const imp of imports) {
    const sourceNode = imp.childForFieldName("source");
    if (sourceNode) {
      const importSource = source.slice(sourceNode.startIndex, sourceNode.endIndex).replace(/['"`]/g, "");
      matchImport(importSource, JS_IMPORT_PATTERNS, frameworks);
    }
  }

  // CommonJS require: require("source")
  const calls = findNodes(root, (n) => n.type === "call_expression");
  for (const call of calls) {
    const fnNode = call.childForFieldName("function");
    if (!fnNode) continue;
    const fnText = source.slice(fnNode.startIndex, fnNode.endIndex);
    if (fnText === "require") {
      const args = call.childForFieldName("arguments");
      if (args && args.namedChildCount > 0) {
        const firstArg = args.namedChild(0);
        if (firstArg.type === "string" || firstArg.type === "template_string") {
          const importSource = source.slice(firstArg.startIndex, firstArg.endIndex).replace(/['"`]/g, "");
          matchImport(importSource, JS_IMPORT_PATTERNS, frameworks);
        }
      }
    }
  }

  return frameworks;
}

function extractPythonFrameworks(tree, source) {
  const frameworks = new Set();
  const root = tree.rootNode;

  // import X / from X import Y
  const imports = findNodes(root, (n) =>
    n.type === "import_statement" || n.type === "import_from_statement"
  );
  for (const imp of imports) {
    const impText = source.slice(imp.startIndex, imp.endIndex);
    matchImport(impText, PYTHON_IMPORT_PATTERNS, frameworks);
  }

  return frameworks;
}

function extractGoFrameworks(tree, source) {
  const frameworks = new Set();
  const root = tree.rootNode;

  // import "path" or import ( "path" )
  const importDecls = findNodes(root, (n) =>
    n.type === "import_declaration" || n.type === "import_spec"
  );
  for (const imp of importDecls) {
    const impText = source.slice(imp.startIndex, imp.endIndex);
    matchImport(impText, GO_IMPORT_PATTERNS, frameworks);
  }

  return frameworks;
}

function extractRustFrameworks(tree, source) {
  const frameworks = new Set();
  const root = tree.rootNode;

  // use crate_name::...;
  const useDecls = findNodes(root, (n) => n.type === "use_declaration");
  for (const u of useDecls) {
    const uText = source.slice(u.startIndex, u.endIndex);
    matchImport(uText, RUST_IMPORT_PATTERNS, frameworks);
  }

  return frameworks;
}

function extractJavaFrameworks(tree, source) {
  const frameworks = new Set();
  const root = tree.rootNode;

  const importDecls = findNodes(root, (n) => n.type === "import_declaration");
  for (const imp of importDecls) {
    const impText = source.slice(imp.startIndex, imp.endIndex);
    matchImport(impText, JAVA_IMPORT_PATTERNS, frameworks);
  }

  return frameworks;
}

function extractRubyFrameworks(tree, source) {
  const frameworks = new Set();
  const root = tree.rootNode;

  // require "gem_name"
  const calls = findNodes(root, (n) => n.type === "call" || n.type === "command");
  for (const call of calls) {
    const callText = source.slice(call.startIndex, call.endIndex);
    if (callText.startsWith("require")) {
      matchImport(callText, RUBY_IMPORT_PATTERNS, frameworks);
    }
  }

  return frameworks;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchImport(importText, patterns, frameworkSet) {
  const lower = importText.toLowerCase();
  for (const [pattern, label] of patterns) {
    if (lower.includes(pattern.toLowerCase())) {
      frameworkSet.add(label);
    }
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

const EXTRACTORS = {
  javascript: extractJSFrameworks,
  typescript: extractJSFrameworks,
  python: extractPythonFrameworks,
  go: extractGoFrameworks,
  rust: extractRustFrameworks,
  java: extractJavaFrameworks,
  ruby: extractRubyFrameworks,
};

/**
 * Extract frameworks detected via import/require analysis from a parsed file.
 *
 * @param {{ tree: object, source: string, language: string }} parsed
 * @returns {Set<string>} set of detected framework names
 */
function extractFrameworks({ tree, source, language }) {
  const extractor = EXTRACTORS[language];
  if (!extractor) return new Set();
  return extractor(tree, source);
}

module.exports = { extractFrameworks };
