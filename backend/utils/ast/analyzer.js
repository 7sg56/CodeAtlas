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
const fs = require("fs-extra");

// Semantic Intelligence Modules
const { generateFileSemanticSummary } = require("./fileSemanticSummary");
const { buildRepoFingerprint } = require("./repoFingerprint");
const { buildModuleClusters } = require("./moduleClusterer");
const { detectArchitecturePattern } = require("./architectureDetector");
const { buildExecutionFlow } = require("./executionFlowBuilder");
const { onboardingPathFromGraph } = require("./graphAnalysis");
const { inferProjectPurpose } = require("./projectPurposeInferer");
const { buildGroqPrompt } = require("../ai/promptBuilder");
const { buildGraphOfCode } = require("./graphBuilder");
const { findDependencyHubs } = require("./graphAnalysis");

// New Intelligence Modules (Phase 11-13)
const { calculateHealthScore } = require("./healthScorer");
const { detectHotspots } = require("./hotspotDetector");
const { generateMermaidDiagram } = require("./mermaidGenerator");
const { buildMentalModel } = require("./mentalModelBuilder");

/**
 * Phase 1 - Unified AST Extraction
 * Source of truth for semantic analysis.
 */
async function extractAST(repoPath) {
  const files = [];
  const globalFrameworks = new Set();
  const configFiles = [];
  const allRoutes = [];
  const allEntrypoints = [];
  const allImports = [];

  for await (const parsed of walkAndParse(repoPath)) {
    const fileName = path.basename(parsed.relativePath).toLowerCase();
    
    // Config files detection (includes system-level build files)
    if (['package.json', 'dockerfile', 'ts-config', 'requirements.txt', 'go.mod', 'cargo.toml', 'makefile', 'cmakelists', 'kconfig', 'kbuild', 'configure.ac', 'meson.build'].some(f => fileName.includes(f))) {
      configFiles.push(parsed.relativePath);
    }

    const type = classifyFile(parsed.relativePath);
    const fileData = {
      tree: parsed.tree,
      source: parsed.source,
      language: parsed.language,
      relativePath: parsed.relativePath,
    };

    const isDeep = ['router', 'controller', 'service', 'entrypoint', 'engine', 'logic'].some(t => type === t || parsed.relativePath.includes(t));
    let analysis = {};

    if (isDeep) {
      const routes = extractRoutes(fileData);
      const symbols = extractSymbols(fileData);
      const complexity = extractComplexity(fileData);
      const imports = extractImports(fileData).map(i => i.to);
      const entrypoints = extractEntrypoints(fileData);

      analysis = {
        routes,
        symbols,
        complexity,
        imports,
        language: parsed.language
      };

      allRoutes.push(...routes.map(r => ({ ...r, file: parsed.relativePath })));
      allEntrypoints.push(...entrypoints.map(e => ({ ...e, file: parsed.relativePath })));
      allImports.push(...imports.map(i => ({ from: parsed.relativePath, to: i })));
      extractFrameworks(fileData).forEach(fw => globalFrameworks.add(fw));
    } else {
      const meta = extractFileMetadata(fileData);
      analysis = {
        imports: meta.imports,
        exports: meta.exports,
        language: parsed.language
      };
      allImports.push(...meta.imports.map(i => ({ from: parsed.relativePath, to: i })));
    }

    files.push({
      file: parsed.relativePath,
      type,
      isDeep,
      analysis,
      source: parsed.source,
      language: parsed.language
    });

    if (files.length >= 700) break;
  }

  return {
    files,
    frameworks: Array.from(globalFrameworks),
    configFiles,
    routes: allRoutes,
    entrypoints: allEntrypoints,
    imports: allImports
  };
}

/**
 * Repository Intelligence Engine - AST & Semantic Pipeline
 */
async function analyzeRepo(repoPath, originalName = null) {
  const repoName = originalName || path.basename(repoPath);

  const structure = await buildTree(repoPath);
  const stats = countNodes(structure);
  const languages = detectLanguages(structure);

  // Read README for AI context enrichment
  let readmeExcerpt = '';
  try {
    const readmeCandidates = ['README.md', 'readme.md', 'README.rst', 'README', 'README.txt'];
    for (const candidate of readmeCandidates) {
      const readmePath = path.join(repoPath, candidate);
      if (await fs.pathExists(readmePath)) {
        const content = await fs.readFile(readmePath, 'utf-8');
        readmeExcerpt = content.substring(0, 2000);
        break;
      }
    }
  } catch (e) {
    console.warn('[Analyzer] Could not read README:', e.message);
  }

  // Phase 1: Unified AST Extraction
  const astContext = await extractAST(repoPath);

  // Phase 2-9: Semantic Intelligence Pipeline
  const fileSummaries = astContext.files.map(f => generateFileSemanticSummary({ ...f, relativePath: f.file }));
  
  const fingerprint = buildRepoFingerprint({
    frameworks: astContext.frameworks,
    languages: Array.from(new Set(languages.map(l => l.language.toLowerCase()))),
    entrypoints: astContext.entrypoints.map(e => e.file).slice(0, 5),
    routes: astContext.routes.map(r => `${r.method} ${r.path}`).slice(0, 10),
    configFiles: astContext.configFiles.slice(0, 10)
  });

  const modules = buildModuleClusters(fileSummaries);
  const graph = buildGraphOfCode(astContext.files, modules);
  
  const graphOnboarding = onboardingPathFromGraph(graph);
  const architecture = detectArchitecturePattern(fileSummaries, fingerprint);
  const executionFlow = buildExecutionFlow(fingerprint, fileSummaries);
  const purposeInfo = inferProjectPurpose(fingerprint, modules, readmeExcerpt);

  // Phase 11-13: Advanced Architecture Insights
  const health = calculateHealthScore(fileSummaries, modules, graph, stats);
  const hubs = findDependencyHubs(graph);
  const hotspots = detectHotspots(fileSummaries, astContext.entrypoints, hubs, graph);
  const mermaid = generateMermaidDiagram(modules, graph.moduleEdges);
  const mentalModel = buildMentalModel(modules, graph.moduleEdges);

  // Phase 14: Groq Prompt Builder
  const groqPrompt = buildGroqPrompt({
    project: {
      name: repoName,
      type: purposeInfo.project_type,
      architecture: architecture.architecture,
      purpose: purposeInfo.purpose,
      frameworks: fingerprint.frameworks,
      languages: fingerprint.languages,
      readme_excerpt: readmeExcerpt
    },
    modules,
    module_dependencies: graph.moduleEdges,
    entrypoints: graphOnboarding.slice(0, 2),
    api_routes: fingerprint.api_routes,
    execution_flow: executionFlow.execution_flow,
    onboarding: { recommended_reading_order: graphOnboarding },
    architecture_graph: {
      modules: graph.modules,
      edges: graph.moduleEdges
    },
    health,
    hotspots
  });

  console.log("\nFINAL_GROQ_PROMPT:");
  console.log(JSON.stringify(groqPrompt, null, 2));

  // Forward context mapping for UI Dashboard
  const filesMap = {};
  const typesMap = {};
  const pathToId = {};
  const extensionlessPathToId = {};
  
  const priority = { entrypoint: 0, router: 1, controller: 2, service: 3, engine: 4, component: 5, utility: 6, unknown: 7 };
  const sortedFilesArr = [...astContext.files].sort((a, b) => (priority[a.type] || 7) - (priority[b.type] || 7));
  const finalFiles = sortedFilesArr.slice(0, 70);

  finalFiles.forEach((f, i) => {
    const id = i + 1;
    filesMap[id] = f.file;
    typesMap[id] = f.type;
    pathToId[f.file] = id;
    extensionlessPathToId[f.file.replace(/\.\w+$/, "")] = id;
  });

  const uiDeps = [];
  const inDegree = {};
  const outDegree = {};
  const uiDet = {};

  finalFiles.forEach(f => {
    const fId = pathToId[f.file];

    f.analysis.imports?.forEach(imp => {
      const tId = pathToId[imp] || extensionlessPathToId[imp];
      if (tId && tId !== fId) {
        uiDeps.push([fId, tId]);
        inDegree[tId] = (inDegree[tId] || 0) + 1;
        outDegree[fId] = (outDegree[fId] || 0) + 1;
      }
    });

    if (f.isDeep) {
      const compList = f.analysis.complexity?.functions || [];
      const avgCx = compList.reduce((acc, c) => acc + (c.complexity || 0), 0) / (compList.length || 1);
      uiDet[fId] = {
        fn: f.analysis.symbols?.functions?.map(fn => fn.name)?.slice(0, 15) || [],
        cx: isNaN(avgCx) ? 0 : Number(avgCx.toFixed(1)),
        rt: f.analysis.routes?.map(r => [r.method, r.path]) || []
      };
    }
  });

  return {
    repo: repoName,
    fw: fingerprint.frameworks,
    lang: languages.map(l => {
        const low = l.language.toLowerCase();
        if (low.includes('js')) return 'js';
        if (low.includes('ts')) return 'ts';
        return low.substring(0, 3);
    }),
    entry: fingerprint.entrypoints.map(ep => pathToId[ep]).filter(Boolean),
    files: filesMap,
    type: typesMap,
    api: astContext.routes.map(r => [r.method, r.path, pathToId[r.file] || r.file]),
    deps: uiDeps,
    hubs: hubs.map(h => pathToId[h] || h).slice(0, 8),
    arch: {
      pattern: architecture.architecture,
      routers: finalFiles.filter(f => f.type === 'router').length,
      controllers: finalFiles.filter(f => f.type === 'controller').length,
      services: finalFiles.filter(f => f.type === 'service').length,
      modules: modules.length,
      mermaid: mermaid
    },
    det: uiDet,
    st: structure,
    ss: stats,
    ext: { languages },
    groqPrompt,
    health,
    hotspots,
    mentalModel
  };
}

module.exports = { analyzeRepo };
