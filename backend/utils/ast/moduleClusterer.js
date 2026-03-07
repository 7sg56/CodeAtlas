const path = require('path');

/**
 * Groups files into logical modules using directory, role, and keyword similarity.
 * @param {Object[]} fileSummaries - Semantic summaries of the files.
 * @returns {Object[]} List of module summaries.
 */
function buildModuleClusters(fileSummaries) {
  const moduleMap = {};

  fileSummaries.forEach(summary => {
    const dir = path.dirname(summary.file);
    const moduleName = inferModuleName(dir);

    if (!moduleMap[moduleName]) {
      moduleMap[moduleName] = {
        module: moduleName,
        path: dir,
        files: 0,
        roles: new Set(),
        responsibility_keywords: new Set(),
        key_functions: new Set(),
        filesInModule: []
      };
    }

    const mod = moduleMap[moduleName];
    mod.files += 1;
    mod.roles.add(summary.role);
    summary.keywords?.forEach(k => mod.responsibility_keywords.add(k));
    summary.key_functions?.forEach(f => mod.key_functions.add(f));
    mod.filesInModule.push(summary.file);
  });

  return Object.values(moduleMap).map(mod => ({
    module: mod.module,
    path: mod.path,
    files: mod.files,
    roles: Array.from(mod.roles),
    responsibility_keywords: Array.from(mod.responsibility_keywords).slice(0, 15),
    key_functions: Array.from(mod.key_functions).slice(0, 10),
    filesInModule: mod.filesInModule
  }));
}

/**
 * Infer a stylized module name based on directory path.
 * @param {string} dirName 
 * @returns {string} Inferred module name.
 */
function inferModuleName(dirName) {
  if (dirName === '.') return 'root';
  if (dirName.startsWith('backend/routes') || dirName.startsWith('backend/api')) return 'api-layer';
  if (dirName.startsWith('backend/controllers')) return 'controllers';
  if (dirName.startsWith('backend/services')) return 'services';
  if (dirName.startsWith('backend/utils/ast')) return 'analysis-engine';
  if (dirName.startsWith('backend/utils/ai')) return 'ai-engine';
  if (dirName.startsWith('backend/utils')) return 'utilities';
  if (dirName.startsWith('frontend/app/components')) return 'ui-components';
  if (dirName.startsWith('frontend/app/pages')) return 'frontend-pages';
  if (dirName.startsWith('frontend/app')) return 'frontend-app';

  // Fallback to stylized directory name
  return dirName.replace(/\//g, '-').replace(/^\./, '').replace(/^-/, '') || 'root';
}

module.exports = { buildModuleClusters };
