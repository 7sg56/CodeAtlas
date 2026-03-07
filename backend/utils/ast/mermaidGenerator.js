/**
 * Mermaid Architecture Generation
 * Transforms module graphs into stylized Mermaid syntax for rendering on frontend.
 */

function generateMermaidDiagram(modules, moduleEdges) {
  if (!modules || modules.length === 0) return "graph TD\n  Unknown[\"Project (Unknown Structure)\"]";

  let mermaidDiagram = "graph TD\n";

  // Stylized Mermaid definition
  mermaidDiagram += "  %% Modules\n";
  modules.forEach(mod => {
    // Sanitizing module name for Mermaid
    const moduleName = mod.name || mod.module || 'Unknown';
    const safeName = moduleName.replace(/[^a-zA-Z0-9]/g, '_');
    mermaidDiagram += `  ${safeName}["${moduleName}"]\n`;
  });

  mermaidDiagram += "\n  %% Dependencies\n";
  moduleEdges.forEach(edge => {
    const fromStr = edge.from || 'Unknown';
    const toStr = edge.to || 'Unknown';
    const fromSafe = fromStr.replace(/[^a-zA-Z0-9]/g, '_');
    const toSafe = toStr.replace(/[^a-zA-Z0-9]/g, '_');
    mermaidDiagram += `  ${fromSafe} --> ${toSafe}\n`;
  });

  // Adding basic styling if needed
  mermaidDiagram += "\n  %% Styling\n";
  mermaidDiagram += "  classDef default fill:#111,stroke:#444,stroke-width:2px,color:#fff;\n";
  
  return mermaidDiagram;
}

module.exports = { generateMermaidDiagram };
