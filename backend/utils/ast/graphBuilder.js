const path = require('path');

/**
 * Builds a multi-layer repository graph: File, Function, and Module layers.
 * 
 * @param {Object[]} rawFiles - Full analysis result for files.
 * @param {Object[]} modules - Module clusters.
 * @returns {Object} { nodes, edges, modules }
 */
function buildGraphOfCode(rawFiles, modules) {
  const nodes = [];
  const edges = [];
  
  const fileToModuleMap = {};
  modules.forEach(mod => {
    mod.filesInModule?.forEach(f => {
      fileToModuleMap[f] = mod.module;
    });
  });

  // Layer 1: File Dependency Graph
  rawFiles.forEach(f => {
    nodes.push({ id: f.file, type: 'file', role: f.type });
    
    f.analysis.imports?.forEach(imp => {
      // Resolve import to a real file path if possible
      const targetFile = rawFiles.find(rf => rf.file === imp || rf.file.replace(/\.\w+$/, "") === imp)?.file;
      if (targetFile) {
        edges.push({ from: f.file, to: targetFile, type: 'imports' });
      }
    });
  });

  // Layer 2: Function Call Graph (Heuristic)
  rawFiles.forEach(f => {
    const functions = f.analysis.symbols?.functions || [];
    functions.forEach(fn => {
      const fnNodeId = `${f.file}:${fn.name}`;
      nodes.push({ id: fnNodeId, type: 'function', file: f.file });
      
      // Track calls within function scope
      fn.calls?.forEach(call => {
        // Find if this call target exists in our exports
        const target = rawFiles.find(rf => rf.analysis.exports?.includes(call) || rf.analysis.symbols?.functions?.some(s => s.name === call));
        if (target) {
            edges.push({ from: fnNodeId, to: `${target.file}:${call}`, type: 'calls' });
        }
      });
    });
  });

  // Layer 3: Module Graph (Aggregated Edges)
  const moduleEdges = [];
  const seenModuleEdges = new Set();

  edges.forEach(edge => {
    if (edge.type === 'imports') {
      const fromMod = fileToModuleMap[edge.from];
      const toMod = fileToModuleMap[edge.to];
      
      if (fromMod && toMod && fromMod !== toMod) {
        const edgeKey = `module:${fromMod}->${toMod}`;
        if (!seenModuleEdges.has(edgeKey)) {
          seenModuleEdges.add(edgeKey);
          moduleEdges.push({ from: fromMod, to: toMod, type: 'module_dependency' });
        }
      }
    }
  });

  return {
    nodes,
    edges,
    moduleEdges,
    modules: modules.map(m => ({
      name: m.module,
      files: m.filesInModule
    }))
  };
}

module.exports = { buildGraphOfCode };
