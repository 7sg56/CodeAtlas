const path = require('path');

/**
 * Detects structural signals that reveal the repository purpose.
 * @param {Object[]} fileSummaries - List of semantic summaries.
 * @param {Object} metadata - { frameworks, languages, entrypoints, routes, configFiles }
 * @returns {Object} Fingerprint.
 */
function buildRepoFingerprint({ frameworks, languages, entrypoints, routes, configFiles }) {
  const api_service = routes && routes.length > 0;
  const frontend_present = frameworks && frameworks.some(fw => ["React", "Vue", "Angular", "Next.js", "Tailwind"].includes(fw));
  const backend_present = frameworks && frameworks.some(fw => ["Express", "FastAPI", "Flask", "Django", "NestJS"].includes(fw));
  const cli_tool = entrypoints && entrypoints.some(ep => ep.includes('bin') || ep.includes('cli') || ep.includes('main'));
  const library = !api_service && !frontend_present && entrypoints && entrypoints.some(ep => ep.includes('index') || ep.includes('exports'));

  return {
    frameworks: frameworks || [],
    entrypoints: entrypoints || [],
    api_routes: routes || [],
    config_files: configFiles || [],
    signals: {
      api_service,
      frontend_present,
      backend_present,
      cli_tool,
      library
    }
  };
}

module.exports = { buildRepoFingerprint };
