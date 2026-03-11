const path = require('path');

/**
 * Infer the purpose of the repository based on architectural signals,
 * language distribution, and optional README context.
 * 
 * @param {Object} fingerprint - Fingerprint result.
 * @param {Object[]} modules - List of modules.
 * @param {string} [readmeExcerpt] - First ~2000 chars of the repo's README.md.
 * @returns {Object} { project_type, purpose }
 */
function inferProjectPurpose(fingerprint, modules, readmeExcerpt = '') {
  const { frameworks, signals, api_routes, languages } = fingerprint;
  
  const keywords = Array.from(new Set(modules.flatMap(m => m.responsibility_keywords))).slice(0, 10);
  const langSet = new Set((languages || []).map(l => l.toLowerCase()));
  const readmeLower = (readmeExcerpt || '').toLowerCase();
  
  let project_type = 'unknown';
  let purpose = '';

  // ---- Web / Fullstack categories ----
  if (frameworks.includes('Next.js')) {
    project_type = 'fullstack_web_application';
    purpose = 'Builds a modern, full-stack web application with integrated frontend and server-side logic.';
  } else if (signals.api_service && !signals.frontend_present) {
    project_type = 'backend_api_service';
    purpose = `Provides an API for ${keywords.slice(0, 3).join(', ')} functionalities.`;
  } else if (signals.frontend_present && !signals.api_service) {
    project_type = 'frontend_application';
    purpose = `Delivers a client-side user interface for ${keywords.slice(0, 3).join(', ') || 'user interaction'}.`;
  }

  // ---- System-level categories ----
  else if (signals.kernel_module) {
    project_type = 'os_kernel';
    purpose = 'Implements an operating system kernel or kernel-level modules managing hardware, memory, and process scheduling.';
  } else if (signals.systems_language_dominant && signals.makefile_present && !signals.api_service) {
    // Large C/C++ projects with Makefiles but no API routes
    if (readmeLower.includes('kernel') || readmeLower.includes('operating system')) {
      project_type = 'os_kernel';
      purpose = 'Implements an operating system kernel managing hardware abstraction, process scheduling, and system calls.';
    } else if (readmeLower.includes('compiler') || readmeLower.includes('parser') || readmeLower.includes('llvm') || readmeLower.includes('lexer')) {
      project_type = 'compiler_or_toolchain';
      purpose = 'Implements a compiler, interpreter, or language toolchain for source code transformation and execution.';
    } else if (readmeLower.includes('game') || readmeLower.includes('engine') || readmeLower.includes('render') || readmeLower.includes('opengl') || readmeLower.includes('vulkan')) {
      project_type = 'game_engine';
      purpose = 'Provides a game engine or graphics framework for rendering, simulation, and interactive content.';
    } else if (readmeLower.includes('database') || readmeLower.includes('storage engine') || readmeLower.includes('sql')) {
      project_type = 'database_system';
      purpose = 'Implements a database or storage engine for data persistence, querying, and transaction management.';
    } else if (readmeLower.includes('embedded') || readmeLower.includes('firmware') || readmeLower.includes('microcontroller')) {
      project_type = 'embedded_system';
      purpose = 'Provides firmware or embedded software for hardware devices and microcontrollers.';
    } else {
      project_type = 'systems_software';
      purpose = 'Implements system-level software in a compiled language with native build tooling.';
    }
  }

  // ---- CLI / Library / Tooling categories ----
  else if (signals.cli_tool && !signals.api_service) {
    project_type = 'cli_utility';
    purpose = `Enables users to manage or analyze tasks related to ${keywords.slice(0, 3).join(', ')} via a terminal interface.`;
  } else if (signals.library) {
    project_type = 'reusable_library';
    purpose = `Exposes a set of reusable classes and functions for handling ${keywords.slice(0, 3).join(', ')}.`;
  }

  // ---- Specialized categories via README hints ----
  else if (readmeLower.includes('machine learning') || readmeLower.includes('deep learning') || readmeLower.includes('neural network') || readmeLower.includes('model training')) {
    project_type = 'machine_learning';
    purpose = 'Provides machine learning infrastructure for model training, evaluation, or inference.';
  } else if (readmeLower.includes('blockchain') || readmeLower.includes('smart contract') || readmeLower.includes('web3')) {
    project_type = 'blockchain';
    purpose = 'Implements blockchain infrastructure, smart contracts, or decentralized application logic.';
  }

  // ---- Keyword-based fallback ----
  else if (keywords.some(k => ['ast', 'parsing', 'grammar', 'repository'].includes(k))) {
    project_type = 'developer_tooling';
    purpose = 'Provides specialized infrastructure for analyzing repositories or processing structured code.';
  }

  // Refine purpose based on keyword combos
  if (keywords.includes('analysis') && keywords.includes('ast')) {
    purpose = 'Analyzes software repositories and generates architecture summaries using tree-sitter based parsing.';
  }

  // If still unknown and we have a README, extract a purpose from it
  if (project_type === 'unknown' && readmeExcerpt) {
    project_type = 'open_source_project';
    // Extract first meaningful sentence from README as the purpose
    const firstLine = readmeExcerpt
      .split('\n')
      .map(l => l.replace(/^[#\s*>-]+/, '').trim())
      .find(l => l.length > 20 && !l.startsWith('!') && !l.startsWith('[') && !l.startsWith('http'));
    if (firstLine) {
      purpose = firstLine.length > 200 ? firstLine.substring(0, 200) + '...' : firstLine;
    } else {
      purpose = 'Open source project. Refer to the repository README for a detailed description.';
    }
  }

  // Final fallback
  if (!purpose) {
    purpose = 'Analyzes information and provides specific functional capabilities.';
  }

  return { project_type, purpose };
}

module.exports = { inferProjectPurpose };
