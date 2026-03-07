const path = require('path');

/**
 * Infer the purpose of the repository based on architectural signals.
 * @param {Object} fingerprint - Fingerprint result.
 * @param {Object[]} modules - List of modules.
 * @returns {Object} { project_type, purpose }
 */
function inferProjectPurpose(fingerprint, modules) {
  const { frameworks, signals, api_routes } = fingerprint;
  
  const keywords = Array.from(new Set(modules.flatMap(m => m.responsibility_keywords))).slice(0, 10);
  
  let project_type = 'unknown';
  let purpose = 'Analyzes information and provides specific functional capabilities.';

  if (frameworks.includes('Next.js')) {
    project_type = 'fullstack_web_application';
    purpose = 'Builds a modern, full-stack web application with integrated frontend and server-side logic.';
  } else if (signals.api_service && !signals.frontend_present) {
    project_type = 'backend_api_service';
    purpose = `Provides an API for ${keywords.slice(0, 3).join(', ')} functionalities.`;
  } else if (signals.cli_tool && !signals.api_service) {
    project_type = 'cli_utility';
    purpose = `Enables users to manage or analyze tasks related to ${keywords.slice(0, 3).join(', ')} via a terminal interface.`;
  } else if (signals.library) {
    project_type = 'reusable_library';
    purpose = `Exposes a set of reusable classes and functions for handling ${keywords.slice(0, 3).join(', ')}.`;
  } else if (keywords.some(k => ['ast', 'parsing', 'grammar', 'repository'].includes(k))) {
    project_type = 'developer_tooling';
    purpose = `Provides specialized infrastructure for analyzing repositories or processing structured code.`;
  }

  // Refine purpose based on keywords
  if (keywords.includes('analysis') && keywords.includes('ast')) {
    purpose = 'Analyzes software repositories and generates architecture summaries using tree-sitter based parsing.';
  }

  return { project_type, purpose };
}

module.exports = { inferProjectPurpose };
