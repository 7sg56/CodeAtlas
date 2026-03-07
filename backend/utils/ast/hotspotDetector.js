const path = require('path');
/**
 * Risk and Hotspot Detection
 * Identifying high-risk and high-attention areas in the repository.
 */

function detectHotspots(fileSummaries, entrypoints, hubs, graph) {
  const hotspots = [];

  // Hubs already identified by graphAnalysis.js
  hubs.slice(0, 3).forEach(hubId => {
    // Hub ID is often a numeric ID from UI extraction but can be path in graph
    // Find file from graph nodes
    const hubNode = graph.nodes.find(n => n.id === hubId || n.file === hubId);
    const hubPath = hubNode ? (hubNode.id || hubNode.file) : hubId;
    hotspots.push({
      file: hubPath,
      reason: "dependency hub (highly coupled)"
    });
  });

  // Top Complexity hotspots
  const complexFiles = [...fileSummaries]
    .filter(s => (s.avg_complexity || 0) > 4)
    .sort((a, b) => (b.avg_complexity || 0) - (a.avg_complexity || 0))
    .slice(0, 2);

  complexFiles.forEach(cf => {
    if (!hotspots.some(h => h.file === cf.file)) {
      hotspots.push({
        file: cf.file,
        reason: "high algorithmic complexity"
      });
    }
  });

  // Entrypoint proximity hotspots
  // Files that are directly called by entrypoints are critical but often dense
  entrypoints.slice(0, 3).forEach(ep => {
    const epPath = typeof ep === 'string' ? ep : ep.file;
    const dependencies = graph.edges
      .filter(e => e.from === epPath && e.type === 'imports')
      .map(e => e.to);
    
    dependencies.slice(0, 2).forEach(dep => {
      if (!hotspots.some(h => h.file === dep)) {
        hotspots.push({
          file: dep,
          reason: "critical entry-layer component"
        });
      }
    });
  });

  return hotspots.slice(0, 6);
}

module.exports = { detectHotspots };
