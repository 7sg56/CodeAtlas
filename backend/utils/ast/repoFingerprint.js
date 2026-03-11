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

  // System-level signals for non-web projects
  const configs = (configFiles || []).map(f => f.toLowerCase());
  const makefile_present = configs.some(f => f.includes('makefile') || f.endsWith('.mk'));
  const cmake_present = configs.some(f => f.includes('cmakelists') || f.includes('cmake'));
  const kernel_module = configs.some(f => f.includes('kconfig') || f.includes('kbuild'));
  const autotools_present = configs.some(f => f.includes('configure.ac') || f.includes('autogen') || f.includes('config.h.in'));

  // Language-based signals
  const langSet = new Set((languages || []).map(l => l.toLowerCase()));
  const systems_language_dominant = langSet.has('c') || langSet.has('c++') || langSet.has('rust');

  return {
    frameworks: frameworks || [],
    languages: languages || [],
    entrypoints: entrypoints || [],
    api_routes: routes || [],
    config_files: configFiles || [],
    signals: {
      api_service,
      frontend_present,
      backend_present,
      cli_tool,
      library,
      makefile_present,
      cmake_present,
      kernel_module,
      autotools_present,
      systems_language_dominant
    }
  };
}

module.exports = { buildRepoFingerprint };
