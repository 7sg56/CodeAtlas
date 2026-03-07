const path = require('path');

/**
 * Reconstruction of execution flow starting from entrypoints and API routes.
 * @param {Object} fingerprint - Fingerprint of the repository.
 * @param {Object[]} fileSummaries - List of file semantic summaries.
 * @returns {Object} { execution_flow: string[] }
 */
function buildExecutionFlow(fingerprint, fileSummaries) {
  const { entrypoints, api_routes } = fingerprint;
  const execution_flow = [];

  // Start with entrypoints
  entrypoints.forEach(ep => {
    execution_flow.push(ep);
    
    // Heuristic: Find common next signals in dependencies
    const summary = fileSummaries.find(s => s.file === ep);
    if (summary && summary.imports) {
      // Find router or logic importers
      const nextStep = fileSummaries.filter(s => summary.imports.some(imp => s.file.includes(imp) && ['router', 'engine'].includes(s.role)));
      nextStep.forEach(ns => execution_flow.push(ns.file));
    }
  });

  // Track common router -> controller -> service flows
  const sampleRouter = fileSummaries.find(s => s.role === 'router');
  if (sampleRouter) {
    execution_flow.push(sampleRouter.file);
    const sampleCtrl = fileSummaries.find(s => s.role === 'controller' && sampleRouter.imports?.some(imp => s.file.includes(imp)));
    if (sampleCtrl) {
      execution_flow.push(sampleCtrl.file);
      const sampleSvc = fileSummaries.find(s => s.role === 'service' && sampleCtrl.imports?.some(imp => s.file.includes(imp)));
      if (sampleSvc) {
        execution_flow.push(sampleSvc.file);
      }
    }
  }

  return {
    execution_flow: [...new Set(execution_flow)].slice(0, 10)
  };
}

module.exports = { buildExecutionFlow };
