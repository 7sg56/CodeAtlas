/**
 * Route / Endpoint Extractor
 *
 * Walks ASTs to find HTTP route definitions across frameworks:
 *
 *   Express/Fastify:   router.get("/path", handler), app.post(...)
 *   NestJS:            @Get("/path"), @Post("/path") decorators
 *   Flask/FastAPI:     @app.route("/path"), @router.get("/path")
 *   Django:            path("url", view) in urlpatterns
 *   Spring Boot:       @GetMapping, @RequestMapping, etc.
 *   Gin/Echo/Fiber:    r.GET("/path", handler), app.Get(...)
 *   Ruby on Rails:     get "/path", to: "controller#action"
 */

const { findNodes } = require("../treeUtils");
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete", "head", "options", "all"]);

/**
 * Extract the first string argument from a call node's arguments.
 */
function firstStringArg(node, source) {
  const args = node.childForFieldName("arguments");
  if (!args) return null;

  for (let i = 0; i < args.namedChildCount; i++) {
    const child = args.namedChild(i);
    if (child.type === "string" || child.type === "template_string" || child.type === "string_literal") {
      // Strip quotes
      const raw = source.slice(child.startIndex, child.endIndex);
      return raw.replace(/^['"`]|['"`]$/g, "");
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// JavaScript / TypeScript
// ---------------------------------------------------------------------------

function extractNextjsRoutes(tree, source, relativePath) {
  const routes = [];
  const root = tree.rootNode;

  // Next.js App Router: route.ts/js
  const fileName = relativePath.split('/').pop();
  if (fileName === 'route.ts' || fileName === 'route.js') {
    const exports = findNodes(root, (n) =>
      n.type === 'export_statement' && n.text.includes('function')
    );

    // Extract path from directory: app/api/user/route.ts -> /api/user
    let path = relativePath
      .replace(/^app\//, '/')   // remove app prefix
      .replace(/\/route\.[tj]s$/, ''); // remove /route.ts

    if (path === '') path = '/';

    for (const exp of exports) {
      const match = exp.text.match(/export (?:async )?function (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)/);
      if (match) {
        routes.push({
          file: relativePath,
          method: match[1],
          path,
          line: exp.startPosition.row + 1,
          framework: "Next.js",
        });
      }
    }
  }
  return routes;
}

function extractJSRoutes(tree, source, relativePath) {
  const routes = [];
  const root = tree.rootNode;

  // 1. Next.js Check
  if (relativePath.includes('app/')) {
    routes.push(...extractNextjsRoutes(tree, source, relativePath));
  }

  const calls = findNodes(root, (n) => n.type === "call_expression");

  for (const call of calls) {
    const fnNode = call.childForFieldName("function");
    if (!fnNode) continue;

    const fnText = source.slice(fnNode.startIndex, fnNode.endIndex);

    // Pattern: router.get("/path", handler) or app.post("/path", handler)
    const dotMatch = fnText.match(/\.(\w+)$/);
    if (dotMatch && HTTP_METHODS.has(dotMatch[1].toLowerCase())) {
      const method = dotMatch[1].toUpperCase();
      const routePath = firstStringArg(call, source);

      if (routePath) {
        routes.push({
          file: relativePath,
          method,
          path: routePath,
          line: call.startPosition.row + 1,
          framework: guessJSFramework(source),
        });
      }
    }

    // Pattern: router.use("/prefix", subRouter)
    if (fnText.endsWith(".use")) {
      const routePath = firstStringArg(call, source);
      if (routePath && routePath.startsWith("/")) {
        routes.push({
          file: relativePath,
          method: "USE",
          path: routePath,
          line: call.startPosition.row + 1,
          framework: guessJSFramework(source),
        });
      }
    }
  }

  // NestJS decorator-style routes: @Get("/path"), @Post(), etc.
  const decorators = findNodes(root, (n) => n.type === "decorator");
  for (const dec of decorators) {
    const decText = source.slice(dec.startIndex, dec.endIndex);
    const decMatch = decText.match(/@(Get|Post|Put|Patch|Delete|Head|Options|All)\(([^)]*)\)/i);
    if (decMatch) {
      const method = decMatch[1].toUpperCase();
      let routePath = decMatch[2].replace(/['"`]/g, "").trim() || "/";
      routes.push({
        file: relativePath,
        method,
        path: routePath,
        line: dec.startPosition.row + 1,
        framework: "NestJS",
      });
    }

    // @Controller("/prefix")
    const ctrlMatch = decText.match(/@Controller\(([^)]*)\)/);
    if (ctrlMatch) {
      const prefix = ctrlMatch[1].replace(/['"`]/g, "").trim() || "/";
      routes.push({
        file: relativePath,
        method: "CONTROLLER",
        path: prefix,
        line: dec.startPosition.row + 1,
        framework: "NestJS",
      });
    }
  }

  return routes;
}

function guessJSFramework(source) {
  if (source.includes("@nestjs")) return "NestJS";
  if (source.includes("fastify")) return "Fastify";
  if (source.includes("express")) return "Express";
  if (source.includes("koa")) return "Koa";
  if (source.includes("hapi")) return "Hapi";
  return "Node.js";
}

// ---------------------------------------------------------------------------
// Python
// ---------------------------------------------------------------------------

function extractPythonRoutes(tree, source, relativePath) {
  const routes = [];
  const root = tree.rootNode;

  // Flask/FastAPI: @app.route("/path"), @router.get("/path"), @app.get("/path")
  const decorators = findNodes(root, (n) => n.type === "decorator");
  for (const dec of decorators) {
    const decText = source.slice(dec.startIndex, dec.endIndex);

    // @app.route("/path") or @app.route("/path", methods=["GET"])
    const routeMatch = decText.match(/@\w+\.route\(["']([^"']+)["']/);
    if (routeMatch) {
      // Try to extract methods
      const methodsMatch = decText.match(/methods\s*=\s*\[([^\]]+)\]/);
      const methods = methodsMatch
        ? methodsMatch[1].replace(/["'\s]/g, "").split(",")
        : ["GET"];

      for (const m of methods) {
        routes.push({
          file: relativePath,
          method: m.toUpperCase(),
          path: routeMatch[1],
          line: dec.startPosition.row + 1,
          framework: guessPythonFramework(source),
        });
      }
      continue;
    }

    // @router.get("/path") or @app.post("/path") -- FastAPI style
    const methodMatch = decText.match(/@\w+\.(get|post|put|patch|delete|head|options)\(["']([^"']+)["']/i);
    if (methodMatch) {
      routes.push({
        file: relativePath,
        method: methodMatch[1].toUpperCase(),
        path: methodMatch[2],
        line: dec.startPosition.row + 1,
        framework: guessPythonFramework(source),
      });
    }
  }

  // Django urlpatterns: path("url/", view_func) -- naively check for path() calls
  const calls = findNodes(root, (n) => n.type === "call");
  for (const call of calls) {
    const fnNode = call.childForFieldName("function");
    if (!fnNode) continue;
    const fnText = source.slice(fnNode.startIndex, fnNode.endIndex);
    if (fnText === "path" || fnText === "re_path") {
      const args = call.childForFieldName("arguments");
      if (args && args.namedChildCount > 0) {
        const firstArg = args.namedChild(0);
        const argText = source.slice(firstArg.startIndex, firstArg.endIndex).replace(/['"`]/g, "");
        if (argText.length < 200) { // sanity check
          routes.push({
            file: relativePath,
            method: "ALL",
            path: "/" + argText,
            line: call.startPosition.row + 1,
            framework: "Django",
          });
        }
      }
    }
  }

  return routes;
}

function guessPythonFramework(source) {
  if (source.includes("fastapi") || source.includes("FastAPI")) return "FastAPI";
  if (source.includes("flask") || source.includes("Flask")) return "Flask";
  if (source.includes("django")) return "Django";
  return "Python";
}

// ---------------------------------------------------------------------------
// Go
// ---------------------------------------------------------------------------

function extractGoRoutes(tree, source, relativePath) {
  const routes = [];
  const root = tree.rootNode;

  // Gin: r.GET("/path", handler), Echo: e.GET("/path", handler), Fiber: app.Get("/path", handler)
  const calls = findNodes(root, (n) => n.type === "call_expression");
  for (const call of calls) {
    const fnNode = call.childForFieldName("function");
    if (!fnNode) continue;
    const fnText = source.slice(fnNode.startIndex, fnNode.endIndex);

    const dotMatch = fnText.match(/\.(\w+)$/);
    if (dotMatch) {
      const method = dotMatch[1];
      if (HTTP_METHODS.has(method.toLowerCase())) {
        // Extract first string arg
        const args = call.childForFieldName("arguments");
        if (args) {
          const firstArg = args.namedChildCount > 0 ? args.namedChild(0) : null;
          if (firstArg && (firstArg.type === "interpreted_string_literal" || firstArg.type === "raw_string_literal")) {
            const routePath = source.slice(firstArg.startIndex, firstArg.endIndex).replace(/["'`]/g, "");
            routes.push({
              file: relativePath,
              method: method.toUpperCase(),
              path: routePath,
              line: call.startPosition.row + 1,
              framework: guessGoFramework(source),
            });
          }
        }
      }
    }
  }

  return routes;
}

function guessGoFramework(source) {
  if (source.includes("gin-gonic")) return "Gin";
  if (source.includes("labstack/echo")) return "Echo";
  if (source.includes("gofiber/fiber")) return "Fiber";
  if (source.includes("gorilla/mux")) return "Gorilla";
  return "Go";
}

// ---------------------------------------------------------------------------
// Java (Spring Boot)
// ---------------------------------------------------------------------------

function extractJavaRoutes(tree, source, relativePath) {
  const routes = [];
  const root = tree.rootNode;

  const annotations = findNodes(root, (n) => n.type === "marker_annotation" || n.type === "annotation");

  let controllerPrefix = "";

  for (const ann of annotations) {
    const annText = source.slice(ann.startIndex, ann.endIndex);

    // @RequestMapping("/prefix") on class level
    const reqMapMatch = annText.match(/@RequestMapping\((?:value\s*=\s*)?["']([^"']+)["']/);
    if (reqMapMatch) {
      // Check if this is on a class (parent is modifiers of class declaration)
      const parent = ann.parent;
      if (parent && parent.parent && parent.parent.type === "class_declaration") {
        controllerPrefix = reqMapMatch[1];
      } else {
        routes.push({
          file: relativePath,
          method: "ALL",
          path: reqMapMatch[1],
          line: ann.startPosition.row + 1,
          framework: "Spring Boot",
        });
      }
    }

    // @GetMapping, @PostMapping, etc.
    const mappingMatch = annText.match(/@(Get|Post|Put|Patch|Delete)Mapping\((?:value\s*=\s*)?["']?([^"')]*)/i);
    if (mappingMatch) {
      const method = mappingMatch[1].toUpperCase();
      const routePath = mappingMatch[2].replace(/["']/g, "").trim() || "/";
      routes.push({
        file: relativePath,
        method,
        path: controllerPrefix + routePath,
        line: ann.startPosition.row + 1,
        framework: "Spring Boot",
      });
    }
  }

  return routes;
}

// ---------------------------------------------------------------------------
// Rust (Actix / Axum / Rocket)
// ---------------------------------------------------------------------------

function extractRustRoutes(tree, source, relativePath) {
  const routes = [];
  const root = tree.rootNode;

  // Actix/Rocket: #[get("/path")], #[post("/path")]
  const attrs = findNodes(root, (n) => n.type === "attribute_item");
  for (const attr of attrs) {
    const attrText = source.slice(attr.startIndex, attr.endIndex);
    const routeMatch = attrText.match(/#\[(get|post|put|patch|delete|head|options)\("([^"]+)"\)/i);
    if (routeMatch) {
      routes.push({
        file: relativePath,
        method: routeMatch[1].toUpperCase(),
        path: routeMatch[2],
        line: attr.startPosition.row + 1,
        framework: guessRustFramework(source),
      });
    }
  }

  // Axum: .route("/path", get(handler))
  const calls = findNodes(root, (n) => n.type === "call_expression");
  for (const call of calls) {
    const fnNode = call.childForFieldName("function");
    if (!fnNode) continue;
    const fnText = source.slice(fnNode.startIndex, fnNode.endIndex);
    if (fnText.endsWith(".route")) {
      const args = call.childForFieldName("arguments");
      if (args && args.namedChildCount > 0) {
        const firstArg = args.namedChild(0);
        if (firstArg.type === "string_literal") {
          const routePath = source.slice(firstArg.startIndex, firstArg.endIndex).replace(/"/g, "");
          routes.push({
            file: relativePath,
            method: "ALL",
            path: routePath,
            line: call.startPosition.row + 1,
            framework: "Axum",
          });
        }
      }
    }
  }

  return routes;
}

function guessRustFramework(source) {
  if (source.includes("actix_web") || source.includes("actix-web")) return "Actix";
  if (source.includes("rocket")) return "Rocket";
  if (source.includes("axum")) return "Axum";
  return "Rust";
}

// ---------------------------------------------------------------------------
// Ruby (Rails)
// ---------------------------------------------------------------------------

function extractRubyRoutes(tree, source, relativePath) {
  const routes = [];
  const root = tree.rootNode;

  // Rails routes: get "/path", to: "controller#action"
  const calls = findNodes(root, (n) => n.type === "call" || n.type === "command");
  for (const call of calls) {
    const callText = source.slice(call.startIndex, call.endIndex);
    const match = callText.match(/^(get|post|put|patch|delete|root)\s+["']([^"']+)["']/i);
    if (match) {
      routes.push({
        file: relativePath,
        method: match[1].toUpperCase() === "ROOT" ? "GET" : match[1].toUpperCase(),
        path: match[1].toLowerCase() === "root" ? "/" : match[2],
        line: call.startPosition.row + 1,
        framework: "Rails",
      });
    }

    // resources :users
    const resMatch = callText.match(/^resources?\s+:(\w+)/);
    if (resMatch) {
      routes.push({
        file: relativePath,
        method: "RESOURCE",
        path: `/${resMatch[1]}`,
        line: call.startPosition.row + 1,
        framework: "Rails",
      });
    }
  }

  return routes;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

const EXTRACTORS = {
  javascript: extractJSRoutes,
  typescript: extractJSRoutes,
  python: extractPythonRoutes,
  go: extractGoRoutes,
  java: extractJavaRoutes,
  rust: extractRustRoutes,
  ruby: extractRubyRoutes,
};

/**
 * Extract API routes/endpoints from a parsed file.
 *
 * @param {{ tree: object, source: string, language: string, relativePath: string }} parsed
 * @returns {Array<{ file: string, method: string, path: string, line: number, framework: string }>}
 */
function extractRoutes({ tree, source, language, relativePath }) {
  const extractor = EXTRACTORS[language];
  if (!extractor) return [];
  return extractor(tree, source, relativePath);
}

module.exports = { extractRoutes };
