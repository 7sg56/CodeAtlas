/**
 * Mental Model Builder
 * 
 * Converts low-level module clusters into a high-level conceptual mental model.
 * Maps technical patterns to architectural roles and generates conceptual interaction diagrams.
 */

const COMPONENT_MAP = {
  // Mapping roles/keywords to conceptual components
  "api": "API Gateway",
  "route": "API Layer",
  "controller": "Service Layer",
  "service": "Business Logic",
  "ast": "Analysis Engine",
  "parse": "Parsing Engine",
  "tree-sitter": "Parsing Engine",
  "ai": "AI Reasoning Engine",
  "llm": "AI Reasoning Engine",
  "prompt": "AI Reasoning Engine",
  "store": "Storage Layer",
  "database": "Data Layer",
  "cache": "Caching System",
  "ui": "Frontend Interface",
  "frontend": "UI Layer",
  "component": "UI Components",
  "util": "Utility Helpers",
  "helper": "Utility Helpers",
  "middleware": "Middleware",
  "auth": "Security Layer"
};

/**
 * Builds a conceptual mental model of the system.
 */
function buildMentalModel(modules, moduleEdges) {
  const components = {};
  
  // 1. Group technical modules into conceptual components
  modules.forEach(mod => {
    const name = mod.module.toLowerCase();
    const roles = mod.roles || [];
    
    let conceptualCategory = "Supporting Logic";
    
    // Check name first
    for (const [key, category] of Object.entries(COMPONENT_MAP)) {
      if (name.includes(key)) {
        conceptualCategory = category;
        break;
      }
    }
    
    // If not found, check roles
    if (conceptualCategory === "Supporting Logic") {
      for (const role of roles) {
        for (const [key, category] of Object.entries(COMPONENT_MAP)) {
          if (role.toLowerCase().includes(key)) {
            conceptualCategory = category;
            break;
          }
        }
        if (conceptualCategory !== "Supporting Logic") break;
      }
    }
    
    if (!components[conceptualCategory]) {
      components[conceptualCategory] = {
        name: conceptualCategory,
        modules: [],
        description: "" 
      };
    }
    components[conceptualCategory].modules.push(mod.module);
  });

  // 2. Map component interactions based on module edges
  const interactions = [];
  const interactionKeys = new Set();

  moduleEdges.forEach(edge => {
    const fromComp = findCategory(edge.from, components);
    const toComp = findCategory(edge.to, components);
    
    if (fromComp && toComp && fromComp !== toComp) {
      const key = `${fromComp}->${toComp}`;
      if (!interactionKeys.has(key)) {
        interactions.push({ from: fromComp, to: toComp });
        interactionKeys.add(key);
      }
    }
  });

  // 3. Generate Mermaid conceptual diagram
  const mermaid = generateConceptualMermaid(components, interactions);

  return {
    conceptual_components: Object.values(components),
    interactions,
    mermaid
  };
}

function findCategory(moduleName, components) {
  for (const [category, data] of Object.entries(components)) {
    if (data.modules.includes(moduleName)) return category;
  }
  return null;
}

function generateConceptualMermaid(components, interactions) {
  let mm = "graph TD\n";
  
  // Style config
  mm += "  classDef layer fill:#1a1a26,stroke:#6c8cff,stroke-width:2px,color:#fff;\n";
  mm += "  classDef active fill:#2a2a3a,stroke:#5ce0a0,stroke-width:2px,color:#fff;\n";

  const categories = Object.keys(components);
  
  // Add nodes
  categories.forEach(cat => {
    const safeId = cat.replace(/\s+/g, "_");
    mm += `  ${safeId}("${cat}")\n`;
    mm += `  class ${safeId} layer;\n`;
  });

  // Add edges
  interactions.forEach(edge => {
    const fromId = edge.from.replace(/\s+/g, "_");
    const toId = edge.to.replace(/\s+/g, "_");
    mm += `  ${fromId} --> ${toId}\n`;
  });

  return mm;
}

module.exports = { buildMentalModel };
