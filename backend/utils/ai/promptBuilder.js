/**
 * AI Prompt Builder
 * 
 * Transforms the repository graph and semantic intelligence results into a 
 * compact JSON payload optimized for Groq LLM reasoning.
 * 
 * Target persona: Senior Software Architect explaining to a new teammate.
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
  const instruction = `
ROLE:
You are a senior software architect helping a new developer understand an unfamiliar codebase. 
Your goal is to provide a clear, intuitive, and technically grounded explanation.

STYLE RULES:
- Use direct, confident developer language. 
- Avoid vague qualifiers like "appears to," "suggests," or "likely."
- Speak like a human mentor, not a generic robot.
- Reference actual file paths provided in the context (e.g., "backend/index.js").
- DO NOT wrap your response in JSON code blocks. 
- Respond ONLY with the structured Markdown sections listed below.

STRICT ANTI-HALLUCINATION:
- Use ONLY the structured data provided.
- If a piece of information cannot be determined, state: "Not detected from analysis."
- Do NOT assume frameworks or patterns unless they are explicitly listed in the Project Context.
- Never invent file names or functionality.

OUTPUT STRUCTURE (Follow strictly for frontend rendering):

PROJECT PURPOSE
Clear explanation of what the system does.

SYSTEM ARCHITECTURE
High-level architectural pattern and organization.

MODULE BREAKDOWN
Explain the logical modules identified (grouping related files). Describe their purpose and key files.

HOW THE SYSTEM WORKS (EXECUTION FLOW)
Describe the runtime path using entrypoints and dependency flow. Use "File A -> File B" notation.

WHERE TO START READING (DEVELOPER ONBOARDING)
Provide a sequential reading order of core files and explain WHY each is important for a new teammate.

RISK & IMPORTANT AREAS
Highlight complex hubs or critical failure points detected in the analysis.
`.trim();

  const prompt = {
    project: {
      name: project.name || "Unknown Project",
      type: project.type || "Software Repository",
      purpose: project.purpose || "Not determined",
      frameworks: project.frameworks || [],
      languages: project.languages || [],
      health_score: health?.health_score || 0,
      readme_excerpt: (project.readme_excerpt || "").substring(0, 1500) || "No README available"
    },
    architecture: {
      pattern: project.architecture || "Not detected",
      module_hubs: hotspots?.slice(0, 5).map(h => h.file) || []
    },
    modules: modules.map(m => ({
      name: m.module,
      responsibility: `Handles ${m.roles?.slice(0, 2).join(', ') || 'core logic'} of ${m.responsibility_keywords?.slice(0, 3).sort().join(', ') || 'unspecified domain'}`,
      files: m.filesInModule?.slice(0, 10) || [],
      key_functions: m.key_functions || [],
      dependencies: module_dependencies.filter(d => d.from === m.module).map(d => d.to)
    })),
    execution_flow: execution_flow || [],
    onboarding: {
      recommended_reading_order: onboarding.recommended_reading_order || []
    },
    structural_risks: hotspots?.map(h => ({
      file: h.file,
      complexity_reason: h.reason
    })) || [],
    TASK: "Generate the architectural onboarding summary following the provided STYLE and ROLE.",
    instruction
  };

  return prompt;
}

module.exports = { buildGroqPrompt };
