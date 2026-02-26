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

function detectLanguages(tree) {
  const counts = {};

  function walk(nodes) {
    for (const node of nodes) {
      if (node.type === "file" && node.language) {
        counts[node.language] = (counts[node.language] || 0) + 1;
      }
      if (node.children) {
        walk(node.children);
      }
    }
  }

  walk(tree);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return Object.entries(counts)
    .map(([language, count]) => ({
      language,
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);
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

async function detectFramework(repoPath) {
  const pkgPath = path.join(repoPath, "package.json");

  if (!fs.existsSync(pkgPath)) return "Unknown";

  const pkg = await fs.readJson(pkgPath);

  const deps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  if (deps["@nestjs/core"]) return "NestJS";
  if (deps["next"]) return "Next.js";
  if (deps["nuxt"]) return "Nuxt.js";
  if (deps["@angular/core"]) return "Angular";
  if (deps["vue"]) return "Vue.js";
  if (deps["svelte"]) return "Svelte";
  if (deps["express"]) return "Express";
  if (deps["fastify"]) return "Fastify";
  if (deps["react"]) return "React";

  return "Node.js";
}

module.exports = { buildTree, detectFramework, detectLanguages, countNodes };