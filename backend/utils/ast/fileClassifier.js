const path = require('path');

/**
 * Classifies a file based on its path and name to determine the depth of analysis.
 * @param {string} filePath - Absolute or relative file path
 * @returns {string} - Classification: 'router', 'controller', 'service', 'entrypoint', 'component', 'utility', or 'unknown'
 */
function classifyFile(filePath) {
    const fileName = path.basename(filePath).toLowerCase();
    const dirname = path.dirname(filePath).toLowerCase();
    const ext = path.extname(filePath).toLowerCase();

    // 1. Entrypoints (based on common patterns)
    const entryPatterns = ['index.js', 'index.ts', 'main.py', 'server.js', 'app.js', 'index.tsx'];
    if (entryPatterns.includes(fileName)) {
        return 'entrypoint';
    }

    // 2. Routers
    const isRouter = fileName.includes('route') || fileName.includes('router') || fileName.includes('api') || fileName.includes('endpoint') || dirname.includes('routes') || dirname.includes('api');
    if (isRouter) return 'router';

    // 3. Controllers / Services
    const isController = fileName.includes('controller') || dirname.includes('controllers');
    if (isController) return 'controller';

    const isService = fileName.includes('service') || fileName.includes('handler') || fileName.includes('manager') || fileName.includes('analyzer') || fileName.includes('engine') || fileName.includes('logic') || fileName.includes('parser') || fileName.includes('extractor') || dirname.includes('services') || dirname.includes('providers') || dirname.includes('logic');
    if (isService) {
        if (dirname.includes('engine') || dirname.includes('parser') || dirname.includes('extractor')) {
            return 'core_system_logic';
        }
        return 'service';
    }

    // 4. UI Components / Frontend
    const uiDirs = ['components', 'pages', 'ui', 'views', 'layouts'];
    const isUIDir = uiDirs.some(dir => dirname.includes(dir));
    const isUIExt = ['.tsx', '.jsx', '.html'].includes(ext);
    if (isUIDir || isUIExt) {
        return 'component';
    }

    // 5. Utilities / Config
    const utilPatterns = ['util', 'helper', 'config', 'constant', 'tool', 'lib'];
    if (utilPatterns.some(p => fileName.includes(p))) {
        return 'utility';
    }

    return 'unknown';
}

module.exports = { classifyFile };
