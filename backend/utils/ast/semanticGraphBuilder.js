const path = require("path");

/**
 * Semantic Graph Builder
 * 
 * Builds higher-level relationships on top of raw AST analysis:
 * - Call Graph: Which functions call which other functions.
 * - Module Graph: How files are grouped into modules and how modules interact.
 * - Route Handler Linking: Mapping API routes to their implementation functions.
 */

/**
 * Builds the semantic graph.
 */
function buildSemanticGraph({ symbols, dependencies, routes, entrypoints }) {
    const callGraph = buildCallGraph(symbols, dependencies);
    const moduleGraph = buildModuleGraph(symbols, dependencies);
    const routeHandlers = linkRouteHandlers(routes, symbols);

    return {
        callGraph,
        moduleGraph,
        routeHandlers
    };
}

/**
 * Detect function-to-function calls (Heuristic approach).
 */
function buildCallGraph(symbols, dependencies) {
    const nodes = [];
    const edges = [];
    const seenNodes = new Set();

    for (const s of symbols) {
        for (const fn of s.functions) {
            const id = `${s.file}:${fn.name}`;
            if (!seenNodes.has(id)) {
                nodes.push({
                    id,
                    name: fn.name,
                    file: s.file,
                    type: "function"
                });
                seenNodes.add(id);
            }
        }
    }

    const exportMap = new Map();
    for (const s of symbols) {
        const exportedFns = s.functions.filter(f => f.isExported).map(f => f.name);
        exportMap.set(s.file, new Set(exportedFns));
    }

    for (const d of dependencies) {
        const fromFile = d.from;
        const toFile = d.to;
        const exportedInTo = exportMap.get(toFile);
        if (!exportedInTo) continue;

        const fromSymbols = symbols.find(s => s.file === fromFile);
        if (!fromSymbols) continue;

        for (const fromFn of fromSymbols.functions) {
            for (const toFnName of exportedInTo) {
                edges.push({
                    from: `${fromFile}:${fromFn.name}`,
                    to: `${toFile}:${toFnName}`,
                    type: "calls"
                });
            }
        }
    }

    return { nodes, edges };
}

/**
 * Group files into logical modules based on directory structure.
 */
function buildModuleGraph(symbols, dependencies) {
    const fileToModule = new Map();
    const modules = new Map();

    for (const s of symbols) {
        const parts = s.file.split(path.sep);
        const moduleName = parts.length > 1 ? parts[0] : "root";

        if (!modules.has(moduleName)) {
            modules.set(moduleName, { name: moduleName, files: [] });
        }
        modules.get(moduleName).files.push(s.file);
        fileToModule.set(s.file, moduleName);
    }

    const edges = [];
    const moduleEdges = new Map();

    for (const d of dependencies) {
        const fromMod = fileToModule.get(d.from);
        const toMod = fileToModule.get(d.to);

        if (fromMod && toMod && fromMod !== toMod) {
            const key = `${fromMod}->${toMod}`;
            moduleEdges.set(key, (moduleEdges.get(key) || 0) + 1);
        }
    }

    for (const [key, count] of moduleEdges) {
        const [from, to] = key.split("->");
        edges.push({ from, to, dependencyCount: count });
    }

    return {
        modules: Array.from(modules.values()),
        edges
    };
}

/**
 * Map API routes to their implementation functions.
 */
function linkRouteHandlers(routes, symbols) {
    const handlers = [];

    for (const route of routes) {
        const fileSymbols = symbols.find(s => s.file === route.file);
        if (!fileSymbols) {
            handlers.push({
                method: route.method,
                path: route.path,
                handler: "unknown",
                file: route.file,
                line: route.line
            });
            continue;
        }

        let bestHandler = "anonymous";
        let minDistance = Infinity;

        for (const fn of fileSymbols.functions) {
            const dist = Math.abs(fn.line - route.line);
            if (dist < 15 && dist < minDistance) {
                minDistance = dist;
                bestHandler = fn.name;
            }
        }

        handlers.push({
            method: route.method,
            path: route.path,
            handler: bestHandler,
            file: route.file,
            line: route.line
        });
    }

    return handlers;
}

module.exports = { buildSemanticGraph };
