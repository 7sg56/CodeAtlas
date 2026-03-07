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

// New Semantic Intelligence Modules
const { generateFileSemanticSummary } = require("./fileSemanticSummary");
const { buildRepoFingerprint } = require("./repoFingerprint");
const { buildHeuristicCallGraph } = require("./callGraphBuilder");
const { buildModuleClusters } = require("./moduleClusterer");
const { detectArchitecturePattern } = require("./architectureDetector");
const { buildExecutionFlow } = require("./executionFlowBuilder");
const { buildOnboardingPath } = require("./onboardingPath");
const { inferProjectPurpose } = require("./projectPurposeInferer");
const { buildGroqPrompt } = require("../ai/promptBuilder");

// Graph intelligence modules
const { buildGraphOfCode } = require("./graphBuilder");
const { findDependencyHubs, onboardingPathFromGraph } = require("./graphAnalysis");

/**
 * Repository Intelligence Engine - AST & Semantic Pipeline
 * Analyzes repository structure, determines purpose, and produces LLM contexts.
 */
async function analyzeRepo(repoPath, originalName = null) {
  const repoName = originalName || path.basename(repoPath);
  const rawFiles = [];
  const globalFrameworks = new Set();
  const configFiles = [];

  // Get tree and stats for UI
  const structure = await buildTree(repoPath);
  const stats = countNodes(structure);
  const languages = detectLanguages(structure);

  // 1. AST Analysis Pass
  for await (const parsed of walkAndParse(repoPath)) {
    const fileName = path.basename(parsed.relativePath).toLowerCase();
    
    // Detect framework/configuration files
    if (['package.json', 'dockerfile', 'ts-config', 'requirements.txt', 'go.mod', 'cargo.toml'].some(f => fileName.includes(f))) {
      configFiles.push(parsed.relativePath);
    }

    const type = classifyFile(parsed.relativePath);
    const fileData = {
      tree: parsed.tree,
      source: parsed.source,
      language: parsed.language,
      relativePath: parsed.relativePath,
    };

    // Deep analysis for semantic role extraction
    const isDeep = ['router', 'controller', 'service', 'entrypoint'].includes(type) || parsed.relativePath.includes('engine') || parsed.relativePath.includes('logic');
    let analysis = {};

    if (isDeep) {
      analysis = {
        routes: extractRoutes(fileData),
        symbols: extractSymbols(fileData),
        complexity: extractComplexity(fileData),
        imports: extractImports(fileData).map(i => i.to),
        language: parsed.language
      };
      extractFrameworks(fileData).forEach(fw => globalFrameworks.add(fw));
    } else {
      const meta = extractFileMetadata(fileData);
      analysis = {
        imports: meta.imports,
        exports: meta.exports,
        language: parsed.language
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

    if (rawFiles.length >= 700) break; // Increased capacity for intelligence depth
  }

  // 2. Semantic Intelligence Pipeline
  const fileSummaries = rawFiles.map(f => generateFileSemanticSummary({ ...f, relativePath: f.file }));
  
  const entrypoints = rawFiles.flatMap(f => f.entrypoints).map(ep => ep.file || ep.type).filter(Boolean);
  const routes = rawFiles.flatMap(f => f.analysis.routes || []).map(r => `${r.method} ${r.path}`);
  
  const fingerprint = buildRepoFingerprint({
    frameworks: Array.from(globalFrameworks),
    languages: Array.from(new Set(languages.map(l => l.language.toLowerCase()))),
    entrypoints: entrypoints.slice(0, 5),
    routes: routes.slice(0, 10),
    configFiles: configFiles.slice(0, 5)
  });

  const modules = buildModuleClusters(fileSummaries);
  const callGraph = buildHeuristicCallGraph(rawFiles);
  const graph = buildGraphOfCode(rawFiles, modules);
  
  // Extract hubs and onboarding path using graph intelligence
  const graphHubs = findDependencyHubs(graph);
  const graphOnboarding = onboardingPathFromGraph(graph);

  const architecture = detectArchitecturePattern(fileSummaries, fingerprint);
  const executionFlow = buildExecutionFlow(fingerprint, fileSummaries);
  const purposeInfo = inferProjectPurpose(fingerprint, modules);

  // 3. ID-based mapping for UI compatibility
  const filesMap = {};
  const typesMap = {};
  const pathToId = {};
  const extensionlessPathToId = {};
  
  // Sort files for priority in UI (entrypoints first)
  const priority = { entrypoint: 0, router: 1, controller: 2, service: 3, engine: 4, component: 5, utility: 6, unknown: 7 };
  const sortedFiles = [...rawFiles].sort((a, b) => (priority[a.type] || 7) - (priority[b.type] || 7));
  const finalFiles = sortedFiles.slice(0, 70); // UI limit

  finalFiles.forEach((f, i) => {
    const id = i + 1;
    filesMap[id] = f.file;
    typesMap[id] = f.type;
    pathToId[f.file] = id;
    extensionlessPathToId[f.file.replace(/\.\w+$/, "")] = id;
  });

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

    // Detailed Analysis for UI
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

  const hubs = Object.entries(inDegree)
    .map(([id, deg]) => ({ id: Number(id), score: deg + (outDegree[id] || 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(h => h.id);

  const routersCount = finalFiles.filter(f => f.type === 'router').length;
  const controllersCount = finalFiles.filter(f => f.type === 'controller').length;
  const servicesCount = finalFiles.filter(f => f.type === 'service').length;

  // 4. GROQ-ready Intelligence Payload
  const groqPrompt = buildGroqPrompt({
    project: {
      name: repoName,
      type: purposeInfo.project_type,
      architecture: architecture.architecture,
      purpose: purposeInfo.purpose
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
    }
  });

  console.log("\nFINAL_GROQ_PROMPT:");
  console.log(JSON.stringify(groqPrompt, null, 2));

  // 5. Final Combined Payload
  return {
    repo: repoName,
    fw: fingerprint.frameworks,
    lang: languages.map(l => {
      const low = l.language.toLowerCase();
      if (low.includes('javascript')) return 'js';
      if (low.includes('typescript')) return 'ts';
      return low.substring(0, 4);
    }),
    entry: fingerprint.entrypoints.map(ep => pathToId[ep]).filter(Boolean),
    files: filesMap,
    type: typesMap,
    api,
    deps,
    hubs,
    arch: {
      pattern: architecture.architecture,
      routers: routersCount,
      controllers: controllersCount,
      services: servicesCount,
      modules: modules.length
    },
    det,
    st: structure,
    ss: stats,
    ext: { languages },
    groqPrompt
  };
}

module.exports = { analyzeRepo };
