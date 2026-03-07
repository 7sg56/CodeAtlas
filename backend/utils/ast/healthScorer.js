/**
 * Repository Health Scoring System
 * Calculates a score based on complexity, separation, and density.
 */

function calculateHealthScore(fileSummaries, modules, graph, stats) {
  const totalFiles = fileSummaries.length;
  if (totalFiles === 0) return { health_score: 100, metrics: {} };

  // 1. Complexity Score (0-100)
  // Higher complexity reduces the score
  const complexities = fileSummaries.map(s => s.avg_complexity || 0);
  const avgComplexity = complexities.reduce((a, b) => a + b, 0) / totalFiles;
  const complexityScore = Math.max(0, 100 - (avgComplexity * 10));

  // 2. Module Separation (0-100)
  // More modules compared to files can indicate good separation (to a point)
  const moduleToFilesRatio = modules.length / totalFiles;
  const separationScore = Math.min(100, moduleToFilesRatio * 500);

  // 3. Dependency Density (0-100)
  // Too many edges per node might indicate tight coupling
  const nodeCount = graph.nodes.length;
  const edgeCount = graph.edges.length;
  const density = edgeCount / (nodeCount || 1);
  const densityScore = Math.max(0, 100 - (density * 15));

  // 4. Architecture Clarity (0-100)
  // Based on identified roles vs unknown roles
  const knownRoles = fileSummaries.filter(s => s.role !== 'unknown').length;
  const clarityScore = (knownRoles / totalFiles) * 100;

  const health_score = Math.round(
    (complexityScore * 0.3) + 
    (separationScore * 0.2) + 
    (densityScore * 0.2) + 
    (clarityScore * 0.3)
  );

  return {
    health_score,
    metrics: {
      avg_complexity: Number(avgComplexity.toFixed(1)),
      dependency_density: density < 2 ? "low" : density < 5 ? "medium" : "high",
      module_structure: modules.length > 2 ? "good" : "basic",
      clarity: clarityScore > 70 ? "high" : clarityScore > 40 ? "medium" : "low"
    }
  };
}

module.exports = { calculateHealthScore };
