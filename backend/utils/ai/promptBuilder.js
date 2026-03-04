/**
 * AI Prompt Builder
 * 
 * Transforms the full repository analysis into a single structured JSON payload for Groq.
 */

function buildGroqPrompt({ analysisResult, semanticGraph, chunks }) {
    const {
        repoId,
        astFrameworks,
        languages,
        entrypoints,
        filesAnalyzed,
        summary,
        routes,
        structure,
        stats,
        dependencies,
        symbols,
        complexity
    } = analysisResult;
    const { callGraph, moduleGraph, routeHandlers } = semanticGraph;

    // Filter and prioritize chunks
    const prioritizedChunks = chunks
        .filter(c => {
            const isHandler = routeHandlers.some(rh => rh.file === c.file && rh.handler === c.symbol);
            const isEntry = entrypoints.some(ep => ep.file === c.file);
            const isService = c.file.toLowerCase().includes("service");
            const isCtrl = c.file.toLowerCase().includes("controller");
            return isHandler || isEntry || isService || isCtrl;
        })
        .slice(0, 50);

    // Fill up if less than 50
    if (prioritizedChunks.length < 50) {
        const seenFiles = new Set(prioritizedChunks.map(c => `${c.file}:${c.symbol}`));
        for (const c of chunks) {
            if (prioritizedChunks.length >= 50) break;
            const key = `${c.file}:${c.symbol}`;
            if (!seenFiles.has(key)) {
                prioritizedChunks.push(c);
                seenFiles.add(key);
            }
        }
    }

    // The final object combines raw AST results for the UI with normalized semantic graphs for the AI
    return {
        // UI compatibility fields
        repoId,
        frameworks: astFrameworks,
        languages,
        stats,
        structure,
        entrypoints,
        routes,
        dependencies,
        symbols,
        complexity,
        analysis: {
            filesAnalyzed,
            summary
        },

        // AI-optimized payload sections
        groqContext: {
            projectOverview: {
                frameworks: astFrameworks,
                languages: languages.map(l => l.language),
                entrypoints: entrypoints.map(ep => ({ file: ep.file, type: ep.type })),
                filesAnalyzed
            },
            architecture: {
                callGraph,
                moduleGraph,
                dependencies
            },
            apiSurface: {
                routes,
                routeHandlers
            },
            modules: {
                detectedModules: moduleGraph.modules.map(m => m.name),
                filesPerModule: moduleGraph.modules.reduce((acc, m) => {
                    acc[m.name] = m.files;
                    return acc;
                }, {})
            },
            complexity: {
                totalFunctions: summary.totalFunctions,
                totalClasses: summary.totalClasses,
                averageComplexity: summary.avgComplexity
            },
            chunks: prioritizedChunks,
            instruction: "Analyze this repository structure and explain its architecture, major modules, and API flow. Identify important components and summarize how the system works."
        }
    };
}

module.exports = { buildGroqPrompt };
