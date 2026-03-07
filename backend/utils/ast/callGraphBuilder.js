/**
 * Builds a heuristic call graph by detecting function calls in AST
 * and linking them to exported functions.
 * @param {Object[]} rawFiles - Full analysis result for files.
 * @returns {Object[]} [{ from, to }]
 */
function buildHeuristicCallGraph(rawFiles) {
  const callGraph = [];
  const exportMap = {};

  // 1. Map all exports to their files
  rawFiles.forEach(f => {
    const exports = f.analysis.exports || f.analysis.symbols?.functions?.map(fn => fn.name) || [];
    exports.forEach(exp => {
      exportMap[exp] = f.file;
    });
  });

  // 2. Track calls in each file
  rawFiles.forEach(f => {
    // Note: To truly resolve non-imported local calls, we'd need more logic
    // but the prompt asks for heuristic reconstruction.
    const functions = f.analysis.symbols?.functions || [];
    functions.forEach(fn => {
      // Look for calls in the function's scope
      // (This assumes the AST engine has extracted generic "calls")
      if (fn.calls) {
        fn.calls.forEach(call => {
          if (exportMap[call]) {
            callGraph.push({ from: fn.name, to: call, toFile: exportMap[call] });
          }
        });
      }
    });

    // Heuristic: Link top-level imports to dependencies
    const imports = f.analysis.imports || [];
    const fromFunctions = f.analysis.symbols?.functions?.map(fn => fn.name) || [];
    
    // Simplification: Assume major functions call major components
    if (fromFunctions.length > 0 && imports.length > 0) {
      // Just some architectural linking
      fromFunctions.slice(0, 3).forEach(fnName => {
        imports.slice(0, 3).forEach(imp => {
          // If the import is one of our analyzed files, link it
          const matchingFile = rawFiles.find(rf => rf.file === imp || rf.file.startsWith(imp));
          if (matchingFile) {
            callGraph.push({ from: fnName, to: matchingFile.file, architectureLink: true });
          }
        });
      });
    }
  });

  // Deduplicate and return
  const unique = new Set();
  return callGraph.filter(edge => {
    const key = `${edge.from}-${edge.to}`;
    if (unique.has(key)) return false;
    unique.add(key);
    return true;
  });
}

module.exports = { buildHeuristicCallGraph };
