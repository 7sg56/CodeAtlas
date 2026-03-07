const path = require('path');

/**
 * Computes degree centrality for nodes in the graph.
 * @param {Object} graph - { nodes, edges }
 * @returns {Object} { id: score }
 */
function degreeCentrality(graph) {
  const inDegree = {};
  const outDegree = {};

  graph.edges.forEach(edge => {
    inDegree[edge.to] = (inDegree[edge.to] || 0) + 1;
    outDegree[edge.from] = (outDegree[edge.from] || 0) + 1;
  });

  const scores = {};
  graph.nodes.forEach(node => {
    scores[node.id] = (inDegree[node.id] || 0) + (outDegree[node.id] || 0);
  });

  return scores;
}

/**
 * Finds top dependency hubs based on in-degree scores.
 * @param {Object} graph 
 * @returns {string[]} Top hub IDs.
 */
function findDependencyHubs(graph) {
  const inDegree = {};
  graph.edges.forEach(edge => {
    inDegree[edge.to] = (inDegree[edge.to] || 0) + 1;
  });

  return Object.entries(inDegree)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(h => h[0]);
}

/**
 * Detects project entrypoints (zero in-degree files or explicit main targets).
 * @param {Object} graph 
 * @returns {string[]} Entrypoint node IDs.
 */
function detectEntrypoints(graph) {
  const fileNodes = graph.nodes.filter(n => n.type === 'file');
  const inDegree = {};
  graph.edges.forEach(edge => {
    inDegree[edge.to] = (inDegree[edge.to] || 0) + 1;
  });

  // Explicit main files get priority
  const explicitMain = fileNodes.filter(n => 
    path.basename(n.id).toLowerCase().includes('main') || 
    path.basename(n.id).toLowerCase() === 'index.js' || 
    path.basename(n.id).toLowerCase() === 'app.js'
  ).map(n => n.id);

  if (explicitMain.length > 0) return explicitMain.slice(0, 3);

  // Zero in-degree files
  return fileNodes
    .filter(n => (inDegree[n.id] || 0) === 0)
    .map(n => n.id)
    .slice(0, 3);
}

/**
 * Generates a developer onboarding reading order based on graph topology.
 * @param {Object} graph 
 * @returns {string[]} Recommended reading order.
 */
function onboardingPathFromGraph(graph) {
  const entrypoints = detectEntrypoints(graph);
  const hubs = findDependencyHubs(graph);
  
  const readingOrder = new Set();
  
  // 1. Start at entrypoints
  entrypoints.forEach(ep => readingOrder.add(ep));
  
  // 2. Look at first-layer dependencies of entrypoints
  entrypoints.forEach(ep => {
    graph.edges.filter(e => e.from === ep && e.type === 'imports')
      .slice(0, 2)
      .forEach(e => readingOrder.add(e.to));
  });
  
  // 3. Include top hubs (shared libraries/utilities)
  hubs.slice(0, 2).forEach(h => readingOrder.add(h));

  return Array.from(readingOrder).slice(0, 10);
}

module.exports = {
  degreeCentrality,
  findDependencyHubs,
  detectEntrypoints,
  onboardingPathFromGraph
};
