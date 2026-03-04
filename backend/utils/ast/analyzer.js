const { walkAndParse } = require("./engine");
const { extractEntrypoints } = require("./extractors/entrypoints");
const { extractRoutes } = require("./extractors/routes");
const { extractFrameworks } = require("./extractors/frameworks");
const { extractImports } = require("./extractors/imports");
const { extractSymbols } = require("./extractors/symbols");
const { extractComplexity } = require("./extractors/complexity");
const { classifyFile } = require("./fileClassifier");
const { extractFileMetadata } = require("./extractors/fileMetadata");
const { buildTree, countNodes, detectLanguages } = require("../scanner");
const path = require("path");

/**
 * Run optimized file-centric AST analysis for LLM consumption.
 */
async function analyzeRepo(repoPath, originalName = null) {
  const repoName = originalName || path.basename(repoPath);
  const rawFiles = [];
  const globalFrameworks = new Set();

  // Get tree and stats for UI
  const structure = await buildTree(repoPath);
  const stats = countNodes(structure);
  const languages = detectLanguages(structure);

  // 1. Collect and Classify Files
  for await (const parsed of walkAndParse(repoPath)) {
    const type = classifyFile(parsed.relativePath);
    const fileData = {
      tree: parsed.tree,
      source: parsed.source,
      language: parsed.language,
      relativePath: parsed.relativePath,
    };

    const isDeep = ['router', 'controller', 'service', 'entrypoint'].includes(type);
    let analysis = {};

    if (isDeep) {
      analysis = {
        routes: extractRoutes(fileData),
        symbols: extractSymbols(fileData),
        complexity: extractComplexity(fileData),
        imports: extractImports(fileData).map(i => i.to)
      };
      extractFrameworks(fileData).forEach(fw => globalFrameworks.add(fw));
    } else {
      const meta = extractFileMetadata(fileData);
      analysis = {
        imports: meta.imports,
        exports: meta.exports
      };
    }

    rawFiles.push({
      file: parsed.relativePath,
      type,
      isDeep,
      analysis,
      source: parsed.source,
      language: parsed.language,
      entrypoints: isDeep ? extractEntrypoints(fileData) : []
    });

    if (rawFiles.length >= 500) break;
  }

  // 2. Prioritize and Limit to 70 files
  const priority = { entrypoint: 0, router: 1, controller: 2, service: 3, component: 4, utility: 5, unknown: 6 };
  const sortedFiles = rawFiles.sort((a, b) => priority[a.type] - priority[b.type]);
  const finalFiles = sortedFiles.slice(0, 70);

  // 3. Create File Index Maps
  const files = {};
  const tipo = {};
  const pathToId = {};
  const extensionlessPathToId = {};

  finalFiles.forEach((f, i) => {
    const id = i + 1;
    files[id] = f.file;
    tipo[id] = f.type;
    pathToId[f.file] = id;
    extensionlessPathToId[f.file.replace(/\.\w+$/, "")] = id;
  });

  // 4. Dependency Hub Detection (Top 8) & API Extraction
  const deps = [];
  const inDegree = {};
  const outDegree = {};
  const api = [];
  const det = {};

  finalFiles.forEach(f => {
    const fId = pathToId[f.file];

    // Dependencies
    f.analysis.imports?.forEach(imp => {
      const tId = pathToId[imp] || extensionlessPathToId[imp];
      if (tId && tId !== fId) {
        deps.push([fId, tId]);
        inDegree[tId] = (inDegree[tId] || 0) + 1;
        outDegree[fId] = (outDegree[fId] || 0) + 1;
      }
    });

    // Routes
    f.analysis.routes?.forEach(r => {
      api.push([r.method, r.path, r.handler || fId]);
    });

    // File details for report
    if (f.isDeep) {
      const compList = f.analysis.complexity?.functions || [];
      const avgCx = compList.reduce((acc, c) => acc + (c.complexity || 0), 0) / (compList.length || 1);

      det[fId] = {
        fn: f.analysis.symbols?.functions?.map(fn => fn.name)?.slice(0, 15) || [],
        cx: isNaN(avgCx) ? 0 : Number(avgCx.toFixed(1)),
        rt: f.analysis.routes?.map(r => [r.method, r.path]) || []
      };
    }
  });
  console.log(`[analyzer] Found ${deps.length} deps in ${finalFiles.length} files.`);

  const hubs = Object.entries(inDegree)
    .map(([id, deg]) => ({ id: Number(id), score: deg + (outDegree[id] || 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(h => h.id);

  // 5. Architecture Summary
  const routers = finalFiles.filter(f => f.type === 'router').length;
  const controllers = finalFiles.filter(f => f.type === 'controller').length;
  const services = finalFiles.filter(f => f.type === 'service').length;

  // 6. Final Payload
  const payload = {
    repo: repoName,
    fw: Array.from(globalFrameworks).sort(),
    lang: languages.map(l => {
      const low = l.language.toLowerCase();
      if (low.includes('javascript')) return 'js';
      if (low.includes('typescript')) return 'ts';
      return low.substring(0, 4);
    }),
    entry: finalFiles.filter(f => f.type === 'entrypoint').map(f => pathToId[f.file]),
    files,
    type: tipo,
    api,
    deps,
    hubs,
    arch: {
      pattern: globalFrameworks.has("Next.js") ? "Next.js Fullstack" : (routers > 0 && controllers > 0 ? "MVC-REST" : "Service-Oriented"),
      routers,
      controllers,
      services,
      modules: Math.min(10, finalFiles.filter(f => f.file.includes('/')).length / 3 | 0)
    },
    det,
    st: structure,
    ss: stats,
    ext: { languages }
  };

  console.log("FINAL GROQ PAYLOAD");
  console.log(JSON.stringify(payload, null, 2));

  return payload;
}

module.exports = { analyzeRepo };
