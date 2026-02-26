const fs = require("fs-extra");
const path = require("path");

const EXTENSION_LANGUAGE_MAP = {
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".py": "Python",
  ".java": "Java",
  ".go": "Go",
  ".rs": "Rust",
  ".rb": "Ruby",
  ".php": "PHP",
  ".cs": "C#",
  ".cpp": "C++",
  ".cc": "C++",
  ".c": "C",
  ".h": "C",
  ".hpp": "C++",
  ".swift": "Swift",
  ".kt": "Kotlin",
  ".scala": "Scala",
  ".dart": "Dart",
  ".lua": "Lua",
  ".r": "R",
  ".R": "R",
  ".sh": "Shell",
  ".bash": "Shell",
  ".zsh": "Shell",
  ".html": "HTML",
  ".htm": "HTML",
  ".css": "CSS",
  ".scss": "SCSS",
  ".sass": "SASS",
  ".less": "LESS",
  ".json": "JSON",
  ".yaml": "YAML",
  ".yml": "YAML",
  ".xml": "XML",
  ".md": "Markdown",
  ".sql": "SQL",
  ".graphql": "GraphQL",
  ".gql": "GraphQL",
  ".proto": "Protocol Buffers",
  ".dockerfile": "Dockerfile",
  ".toml": "TOML",
  ".ini": "INI",
  ".env": "Environment",
  ".vue": "Vue",
  ".svelte": "Svelte",
};

async function buildTree(dir) {
  const items = await fs.readdir(dir);

  return Promise.all(
    items
      .filter(
        (item) =>
          item !== "node_modules" &&
          item !== ".git" &&
          item !== ".DS_Store"
      )
      .map(async (item) => {
        const fullPath = path.join(dir, item);
        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
          return {
            name: item,
            type: "folder",
            children: await buildTree(fullPath),
          };
        } else {
          const ext = path.extname(item).toLowerCase();
          const language = EXTENSION_LANGUAGE_MAP[ext] || null;
          return {
            name: item,
            type: "file",
            size: stats.size,
            language,
          };
        }
      })
  );
}

// Languages excluded from primary stats (like GitHub Linguist).
// Data languages and prose languages are excluded.
const EXCLUDED_LANGUAGES = new Set([
  "JSON", "YAML", "XML", "SQL", "Markdown",
  "TOML", "INI", "Environment", "Protocol Buffers",
]);

function detectLanguages(tree) {
  const bytesByLang = {};

  function walk(nodes) {
    for (const node of nodes) {
      if (node.type === "file" && node.language && !EXCLUDED_LANGUAGES.has(node.language)) {
        const size = node.size || 0;
        bytesByLang[node.language] = (bytesByLang[node.language] || 0) + size;
      }
      if (node.children) {
        walk(node.children);
      }
    }
  }

  walk(tree);

  const total = Object.values(bytesByLang).reduce((a, b) => a + b, 0);

  return Object.entries(bytesByLang)
    .map(([language, bytes]) => ({
      language,
      bytes,
      percentage: total > 0 ? Math.round((bytes / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.bytes - a.bytes);
}

function countNodes(tree) {
  let files = 0;
  let folders = 0;

  function walk(nodes) {
    for (const node of nodes) {
      if (node.type === "file") files++;
      else if (node.type === "folder") {
        folders++;
        if (node.children) walk(node.children);
      }
    }
  }

  walk(tree);
  return { files, folders };
}

// Helper: find files at root or one level deep
function findFiles(repoPath, filename) {
  const files = [];
  const rootFile = path.join(repoPath, filename);
  if (fs.existsSync(rootFile)) files.push(rootFile);

  // Check one level deep (common in monorepos)
  try {
    const entries = fs.readdirSync(repoPath);
    for (const entry of entries) {
      const subPath = path.join(repoPath, entry);
      try {
        if (fs.statSync(subPath).isDirectory()) {
          const nested = path.join(subPath, filename);
          if (fs.existsSync(nested)) files.push(nested);
        }
      } catch (e) { /* skip */ }
    }
  } catch (e) { /* skip */ }

  return files;
}

// Helper: read file contents, case-insensitive search
async function readAndMatch(filePath, patterns) {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const lower = content.toLowerCase();
    for (const [pattern, label] of patterns) {
      if (lower.includes(pattern.toLowerCase())) return label;
    }
  } catch (e) { /* skip */ }
  return null;
}

async function detectFramework(repoPath) {
  const frameworks = new Set(); // Use Set to avoid duplicates (e.g., matching React in two package.json)

  // 1. Node.js (package.json)
  const pkgFiles = findFiles(repoPath, "package.json");
  for (const pkgFile of pkgFiles) {
    try {
      const pkg = await fs.readJson(pkgFile);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps["@nestjs/core"]) frameworks.add("NestJS");
      else if (deps["next"]) frameworks.add("Next.js");
      else if (deps["nuxt"]) frameworks.add("Nuxt.js");
      else if (deps["@angular/core"]) frameworks.add("Angular");
      else if (deps["vue"]) frameworks.add("Vue.js");
      else if (deps["svelte"]) frameworks.add("Svelte");
      else if (deps["express"]) frameworks.add("Express");
      else if (deps["fastify"]) frameworks.add("Fastify");
      else if (deps["react"]) frameworks.add("React");
      else frameworks.add("Node.js");
    } catch (e) { /* skip */ }
  }

  // 2. Python (requirements.txt, pyproject.toml, setup.py, Pipfile)
  const pyFiles = ["requirements.txt", "pyproject.toml", "setup.py", "Pipfile"];
  for (const pyFile of pyFiles) {
    const foundFiles = findFiles(repoPath, pyFile);
    for (const found of foundFiles) {
      const result = await readAndMatch(found, [
        ["django", "Django (Python)"],
        ["flask", "Flask (Python)"],
        ["fastapi", "FastAPI (Python)"],
        ["streamlit", "Streamlit (Python)"],
        ["tornado", "Tornado (Python)"],
      ]);
      if (result) frameworks.add(result);
    }
  }

  // 3. Java/Kotlin (pom.xml, build.gradle, build.gradle.kts)
  const javaFiles = ["pom.xml", "build.gradle", "build.gradle.kts"];
  for (const javaFile of javaFiles) {
    const foundFiles = findFiles(repoPath, javaFile);
    for (const found of foundFiles) {
      const result = await readAndMatch(found, [
        ["spring-boot", "Spring Boot (Java)"],
        ["org.springframework.boot", "Spring Boot (Java)"],
        ["springframework", "Spring (Java)"],
        ["quarkus", "Quarkus (Java)"],
        ["micronaut", "Micronaut (Java)"],
      ]);
      frameworks.add(result || "Java Project");
    }
  }

  // 4. Rust (Cargo.toml)
  const cargoFiles = findFiles(repoPath, "Cargo.toml");
  for (const cargoFile of cargoFiles) {
    const result = await readAndMatch(cargoFile, [
      ["actix-web", "Actix (Rust)"],
      ["axum", "Axum (Rust)"],
      ["rocket", "Rocket (Rust)"],
      ["tauri", "Tauri (Rust)"],
      ["warp", "Warp (Rust)"],
    ]);
    frameworks.add(result || "Rust Project");
  }

  // 5. Go (go.mod)
  const goFiles = findFiles(repoPath, "go.mod");
  for (const goFile of goFiles) {
    const result = await readAndMatch(goFile, [
      ["github.com/gin-gonic/gin", "Gin (Go)"],
      ["github.com/labstack/echo", "Echo (Go)"],
      ["github.com/gofiber/fiber", "Fiber (Go)"],
      ["github.com/gorilla/mux", "Gorilla (Go)"],
    ]);
    frameworks.add(result || "Go Project");
  }

  // 6. PHP (composer.json)
  const composerFiles = findFiles(repoPath, "composer.json");
  for (const composerFile of composerFiles) {
    const result = await readAndMatch(composerFile, [
      ["laravel/framework", "Laravel (PHP)"],
      ["symfony/symfony", "Symfony (PHP)"],
      ["slim/slim", "Slim (PHP)"],
    ]);
    frameworks.add(result || "PHP Project");
  }

  // 7. Ruby (Gemfile)
  const gemFiles = findFiles(repoPath, "Gemfile");
  for (const gemFile of gemFiles) {
    const result = await readAndMatch(gemFile, [
      ["rails", "Ruby on Rails"],
      ["sinatra", "Sinatra (Ruby)"],
    ]);
    frameworks.add(result || "Ruby Project");
  }

  const resultArr = Array.from(frameworks);
  return resultArr.length > 0 ? resultArr : ["Unknown"];
}

module.exports = { buildTree, detectFramework, detectLanguages, countNodes };