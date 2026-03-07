/**
 * AI Prompt Builder
 * 
 * Transforms the repository graph and semantic intelligence results into a 
 * compact JSON payload optimized for Groq LLM reasoning.
 */

function buildGroqPrompt({ project, modules, module_dependencies, entrypoints, api_routes, execution_flow, onboarding, architecture_graph }) {
  const instruction = `Analyze the repository structure and generate a developer onboarding summary explaining:
1. what the project does
2. the architecture of the system
3. the responsibilities of each module
4. how components interact
5. where a new developer should start reading code`;

  const prompt = {
    project: {
      name: project.name || "Unknown Project",
      type: project.type || "Software Repository",
      architecture: project.architecture || "Unknown Architecture",
      purpose: project.purpose || "Generic functional analysis"
    },
    modules: modules.map(m => ({
      name: m.module,
      responsibility: `Handles ${m.roles.slice(0, 2).join(', ')} of ${m.responsibility_keywords.slice(0, 3).sort().join(', ')}`,
      files: m.files,
      key_functions: m.key_functions.slice(0, 5)
    })),
    architecture_graph: architecture_graph || {
      modules: [],
      edges: []
    },
    module_dependencies: module_dependencies || [],
    entrypoints: entrypoints || [],
    api_routes: api_routes || [],
    execution_flow: execution_flow || [],
    onboarding: {
      recommended_reading_order: onboarding.recommended_reading_order || []
    },
    instruction
  };

  // Token Optimization: Groq JSON must favor architectural signals, not raw data.
  return prompt;
}

module.exports = { buildGroqPrompt };
