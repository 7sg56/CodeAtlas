const path = require('path');

/**
 * Detects the architectural pattern of a repository based on structural signals.
 * @param {Object[]} fileSummaries - List of file semantic summaries.
 * @param {Object} fingerprint - Fingerprint result.
 * @returns {Object} { architecture: string }
 */
function detectArchitecturePattern(fileSummaries, fingerprint) {
  const { signals, frameworks } = fingerprint;
  
  const roles = fileSummaries.map(s => s.role);
  const totalFiles = fileSummaries.length;
  
  const routers = roles.filter(r => r === 'router').length;
  const controllers = roles.filter(r => r === 'controller').length;
  const services = roles.filter(r => r === 'service').length;
  const models = roles.filter(r => r === 'model').length;
  const components = roles.filter(r => r === 'component').length;

  let architecture = 'unknown';

  if (frameworks.includes('Next.js')) {
    architecture = 'nextjs_fullstack_architecture';
  } else if (routers > 0 && controllers > 0 && services > 0) {
    architecture = 'layered_service_architecture';
  } else if (routers > 0 && controllers > 0 && models > 0) {
    architecture = 'mvc_rest_architecture';
  } else if (signals.cli_tool && !signals.api_service) {
    architecture = 'cli_utility_architecture';
  } else if (signals.frontend_present && components / totalFiles > 0.4) {
    architecture = 'modern_frontend_spa_architecture';
  } else if (signals.backend_present && routers > 0) {
    architecture = 'backend_api_architecture';
  } else if (signals.library) {
    architecture = 'npm_library_architecture';
  }

  return { architecture };
}

module.exports = { detectArchitecturePattern };
