const path = require('path');

/**
 * Classifies a file into a semantic role based on path, name, and exports.
 * @param {Object} fileData - { relativePath, analysis, language }
 * @returns {Object} { role, confidence }
 */
function detectFileRole(fileData = {}) {
  const { relativePath = 'unknown', analysis = {} } = fileData;
  const safePath = relativePath || 'unknown';
  const fileName = path.basename(safePath).toLowerCase();
  const dirName = path.dirname(safePath).toLowerCase();
  
  let role = 'unknown';
  let confidence = 0.5;

  // 1. Directory heuristics
  if (dirName.includes('routes') || dirName.includes('api')) {
    role = 'router';
    confidence = 0.9;
  } else if (dirName.includes('controllers')) {
    role = 'controller';
    confidence = 0.9;
  } else if (dirName.includes('services') || dirName.includes('providers')) {
    role = 'service';
    confidence = 0.85;
  } else if (dirName.includes('models') || dirName.includes('schemas')) {
    role = 'model';
    confidence = 0.9;
  } else if (dirName.includes('middleware')) {
    role = 'middleware';
    confidence = 0.95;
  } else if (dirName.includes('utils') || dirName.includes('helpers')) {
    role = 'utility';
    confidence = 0.8;
  } else if (dirName.includes('components') || dirName.includes('views') || dirName.includes('ui')) {
    role = 'component';
    confidence = 0.9;
  } else if (dirName.includes('config') || dirName.includes('settings')) {
    role = 'configuration';
    confidence = 0.9;
  } else if (dirName.includes('test') || dirName.includes('spec') || fileName.includes('.test.') || fileName.includes('.spec.')) {
    role = 'test';
    confidence = 0.98;
  } else if (dirName.includes('engine') || dirName.includes('core')) {
    role = 'engine';
    confidence = 0.7;
  } else if (dirName.includes('parser')) {
    role = 'parser';
    confidence = 0.8;
  } else if (dirName.includes('extractor')) {
    role = 'extractor';
    confidence = 0.8;
  }

  // 2. Filename heuristics (overrides if stronger)
  if (fileName.includes('entry') || fileName === 'index.js' || fileName === 'app.js' || fileName === 'server.js' || fileName === 'main.py') {
    role = 'entrypoint';
    confidence = 0.95;
  } else if (fileName.includes('controller')) {
    role = 'controller';
    confidence = 1.0;
  } else if (fileName.includes('service')) {
    role = 'service';
    confidence = 1.0;
  } else if (fileName.includes('router') || fileName.includes('route')) {
    role = 'router';
    confidence = 1.0;
  } else if (fileName.includes('util') || fileName.includes('helper')) {
    role = 'utility';
    confidence = 0.9;
  }

  // 3. Analysis/content heuristics
  if (analysis.routes && analysis.routes.length > 0) {
    role = 'router';
    confidence = 1.0;
  }

  return { file: relativePath, role, confidence };
}

module.exports = { detectFileRole };
