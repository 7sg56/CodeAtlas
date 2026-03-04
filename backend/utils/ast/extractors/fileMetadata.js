const { extractImports } = require('./imports');
const { extractSymbols } = require('./symbols');

/**
 * Extracts lightweight metadata for a file.
 * @param {object} parsed - Parsed file data { tree, source, language, relativePath }
 * @param {string} type - File classification type
 * @returns {object} - Lightweight metadata: { file, language, imports, exports, type }
 */
function extractFileMetadata(parsed) {
    // 1. Extract Imports (simplified to unique target paths/packages)
    const rawImports = extractImports(parsed);
    const imports = [...new Set(rawImports.map(imp => imp.to))];

    // 2. Extract Exports (names only)
    const { functions, classes } = extractSymbols(parsed);
    const exportedNames = [];

    functions.forEach(f => {
        if (f.isExported) exportedNames.push(f.name);
    });

    classes.forEach(c => {
        if (c.isExported) exportedNames.push(c.name);
    });

    return {
        imports,
        exports: exportedNames
    };
}

module.exports = { extractFileMetadata };
