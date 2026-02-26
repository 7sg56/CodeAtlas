const fs = require("fs-extra");
const path = require("path");

async function buildTree(dir) {
  const items = await fs.readdir(dir);

  return Promise.all(
    items
      .filter(
        (item) =>
          item !== "node_modules" &&
          item !== ".git"
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
          return {
            name: item,
            type: "file",
          };
        }
      })
  );
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
  if (deps["express"]) return "Express";
  if (deps["next"]) return "Next.js";
  if (deps["react"]) return "React";

  return "Node.js";
}

module.exports = { buildTree, detectFramework };