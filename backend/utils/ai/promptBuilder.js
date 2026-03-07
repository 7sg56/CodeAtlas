/**
 * AI Prompt Builder
 * 
 * Transforms the repository graph and semantic intelligence results into a 
 * compact JSON payload optimized for Groq LLM reasoning.
 */

function buildGroqPrompt({ 
  project, 
  modules, 
  module_dependencies, 
  entrypoints, 
  api_routes, 
  execution_flow, 
  onboarding, 
  architecture_graph,
  health,
  hotspots 
}) {
  const instruction = `You are a senior software architect helping developers understand unfamiliar codebases.
You must analyze the repository using ONLY the structured data provided.
Do not invent missing information.
Do not assume frameworks that are not listed.

TASK:
Using the information provided in the JSON sections, generate a structured explanation of the repository.
Explain:
1. What the project does
2. The system architecture
3. The role of each module
4. The execution flow of the system
5. Where a new developer should start reading
6. Any architectural risks or complexity areas

OUTPUT FORMAT:
Return the answer in the following structure:

PROJECT PURPOSE
Explain what the system does.

ARCHITECTURE OVERVIEW
Explain the architecture pattern.

MODULE BREAKDOWN
Explain each module.

EXECUTION FLOW
Describe how the system runs.

DEVELOPER ONBOARDING
Explain where a developer should start.

RISK AREAS
Explain complexity or architectural risks.

Keep explanations concise and technical.`;

  const prompt = {
    project: {
      name: project.name || "Unknown Project",
      type: project.type || "Software Repository",
      architecture: project.architecture || "Unknown Architecture",
      purpose: project.purpose || "Generic functional analysis",
      frameworks: project.frameworks || [],
      languages: project.languages || [],
      health_score: health?.health_score || 0,
      health_metrics: health?.metrics || {}
    },
    modules: modules.map(m => ({
      name: m.module,
      responsibility: `Handles ${m.roles?.slice(0, 2).join(', ') || 'logic'} of ${m.responsibility_keywords?.slice(0, 3).sort().join(', ') || 'unspecified domain'}`,
      file_count: m.files,
      files: m.filesInModule,
      key_functions: m.key_functions?.slice(0, 5) || []
    })),
    risk_hotspots: hotspots || [],
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

  return prompt;
}

module.exports = { buildGroqPrompt };
