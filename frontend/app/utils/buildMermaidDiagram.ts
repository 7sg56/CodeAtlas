/**
 * Deterministic Mermaid Diagram Builder
 *
 * Converts structured AST analysis output (frameworks, entrypoints, routes)
 * into a Mermaid `graph TD` diagram representing the API interaction surface.
 *
 * Flow:  Client --> Server --> Entrypoints --> API Layer --> Route Groups
 *
 * Rules:
 *  - Only uses data explicitly provided by the AST engine
 *  - Never invents components, databases, or services
 *  - Max 15 nodes, max 5 route groups, max 3 entrypoints shown
 */

interface EntrypointInfo {
    file: string;
    type: string;
    line: number;
    snippet: string;
}

interface RouteInfo {
    file: string;
    method: string;
    path: string;
    line: number;
    framework: string;
}

interface DiagramInput {
    frameworks: string[];
    entrypoints?: EntrypointInfo[];
    routes?: RouteInfo[];
}

// Frameworks that indicate a frontend exists
const FRONTEND_FRAMEWORKS = new Set([
    "React", "Vue.js", "Angular", "Svelte",
    "Next.js", "Nuxt.js", "Electron", "Tauri",
]);

// Frameworks that indicate a backend exists
const BACKEND_FRAMEWORKS = new Set([
    "Express", "Fastify", "NestJS", "Koa", "Hapi", "Node.js",
    "Django", "Django (Python)", "Flask", "Flask (Python)",
    "FastAPI", "FastAPI (Python)", "Tornado (Python)",
    "Spring Boot", "Spring Boot (Java)", "Spring", "Spring (Java)",
    "Quarkus (Java)", "Micronaut (Java)",
    "Gin", "Gin (Go)", "Echo", "Echo (Go)", "Fiber", "Fiber (Go)",
    "Gorilla", "Gorilla (Go)",
    "Actix", "Actix (Rust)", "Axum", "Axum (Rust)",
    "Rocket", "Rocket (Rust)", "Warp (Rust)",
    "Ruby on Rails", "Rails", "Sinatra", "Sinatra (Ruby)",
    "Laravel (PHP)", "Symfony (PHP)", "Slim (PHP)",
]);

// Full-stack frameworks (count as both frontend and backend)
const FULLSTACK_FRAMEWORKS = new Set(["Next.js", "Nuxt.js"]);

/**
 * Escape special Mermaid characters in labels.
 */
function escapeLabel(label: string): string {
    return label.replace(/"/g, "'").replace(/[[\](){}]/g, "");
}

/**
 * Strip file extension to make a clean label.
 */
function cleanFilePath(filePath: string): string {
    return filePath.replace(/\.\w+$/, "");
}

/**
 * Create a safe Mermaid node ID from a string.
 */
function toNodeId(str: string): string {
    return str.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

/**
 * Group routes by their first-level path segments.
 */
function groupRoutes(routes: RouteInfo[]): { path: string; count: number }[] {
    const groups = new Map<string, number>();

    for (const route of routes) {
        const normalized = route.path.startsWith("/") ? route.path : `/${route.path}`;
        const segments = normalized.split("/").filter(Boolean);

        let groupKey: string;
        if (segments.length >= 2) {
            groupKey = `/${segments[0]}/${segments[1]}`;
        } else if (segments.length === 1) {
            groupKey = `/${segments[0]}`;
        } else {
            groupKey = "/";
        }

        groups.set(groupKey, (groups.get(groupKey) || 0) + 1);
    }

    return Array.from(groups.entries())
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
}

/**
 * Build a deterministic Mermaid diagram from AST analysis data.
 * Returns empty string if there is not enough data to draw a meaningful diagram.
 */
export function buildMermaidDiagram(input: DiagramInput): string {
    const { frameworks, entrypoints = [], routes = [] } = input;

    if (routes.length === 0 && entrypoints.length === 0) {
        return "";
    }

    const lines: string[] = ["graph TD"];
    let nodeCount = 0;
    const MAX_NODES = 15;

    const detectedFrontend = frameworks.find((fw) => FRONTEND_FRAMEWORKS.has(fw));
    const detectedBackend = frameworks.find((fw) => BACKEND_FRAMEWORKS.has(fw));
    const isFullstack = frameworks.some((fw) => FULLSTACK_FRAMEWORKS.has(fw));

    // Client node
    if (detectedFrontend && nodeCount < MAX_NODES) {
        const clientLabel = isFullstack
            ? escapeLabel(detectedFrontend)
            : `${escapeLabel(detectedFrontend)} Frontend`;
        lines.push(`  Client["${clientLabel}"]`);
        nodeCount++;
    }

    // Server node
    const serverLabel = detectedBackend
        ? `${escapeLabel(detectedBackend)} Server`
        : isFullstack
            ? `${escapeLabel(detectedFrontend || "App")} Server`
            : "Server";

    if (nodeCount < MAX_NODES) {
        lines.push(`  Server["${serverLabel}"]`);
        nodeCount++;

        if (detectedFrontend) {
            lines.push(`  Client --> Server`);
        }
    }

    // Entrypoint nodes
    const shownEntrypoints = entrypoints.slice(0, 3);
    for (const ep of shownEntrypoints) {
        if (nodeCount >= MAX_NODES) break;
        const cleanPath = cleanFilePath(ep.file);
        const nodeId = `EP_${toNodeId(cleanPath)}`;
        const typeLabel = ep.type.replace(/_/g, " ");
        lines.push(`  ${nodeId}["${escapeLabel(cleanPath)}"]`);
        lines.push(`  Server -->|"${typeLabel}"| ${nodeId}`);
        nodeCount++;
    }

    // API Layer + Route Groups
    if (routes.length > 0 && nodeCount < MAX_NODES) {
        lines.push(`  API["API Layer"]`);
        lines.push(`  Server --> API`);
        nodeCount++;

        const groups = groupRoutes(routes);
        for (const group of groups) {
            if (nodeCount >= MAX_NODES) break;
            const nodeId = `Route_${toNodeId(group.path)}`;
            const label = group.count > 1 ? `${group.path} (${group.count})` : group.path;
            lines.push(`  ${nodeId}["${escapeLabel(label)}"]`);
            lines.push(`  API --> ${nodeId}`);
            nodeCount++;
        }
    }

    if (nodeCount < 2) {
        return "";
    }

    return lines.join("\n");
}

// =========================================================================
// File Dependency Diagram
// =========================================================================

interface DependencyInfo {
    from: string;
    to: string;
}

interface DependencyDiagramInput {
    dependencies: DependencyInfo[];
}

/**
 * Get the basename of a file path (last segment).
 */
function basename(filePath: string): string {
    const parts = filePath.split("/");
    return parts[parts.length - 1];
}

/**
 * Get the module name for a file -- its parent directory path (up to 2 levels).
 * Top-level files use their own name as the module.
 */
function getModule(filePath: string): string {
    const parts = filePath.split("/").filter(Boolean);
    if (parts.length >= 2) {
        return parts.slice(0, Math.min(parts.length - 1, 2)).join("/");
    }
    return parts[0] || filePath;
}

const NOISE_PATTERNS = [
    /\.test\b/i,
    /\.spec\b/i,
    /\btests?\b/i,
    /\bconfig\b/i,
    /\bscripts?\b/i,
    /\.d$/,
];

function isNoise(filePath: string): boolean {
    return NOISE_PATTERNS.some((p) => p.test(filePath));
}

/**
 * Build a clean Mermaid diagram showing module-level (directory) dependencies.
 *
 * Instead of showing every individual file (which creates unreadable spaghetti),
 * files are collapsed into their parent directory as a single node. Edges show
 * how many imports flow between directories. Test/config files are filtered out.
 */
export function buildDependencyDiagram(input: DependencyDiagramInput): string {
    const { dependencies } = input;

    if (!dependencies || dependencies.length === 0) {
        return "";
    }

    // Filter out noise (tests, config, scripts)
    const cleanDeps = dependencies.filter(
        (d) => !isNoise(d.from) && !isNoise(d.to)
    );

    if (cleanDeps.length === 0) return "";

    // Aggregate at module (directory) level
    const moduleEdges = new Map<string, number>();
    const moduleFiles = new Map<string, Set<string>>();

    for (const dep of cleanDeps) {
        const fromMod = getModule(dep.from);
        const toMod = getModule(dep.to);

        if (!moduleFiles.has(fromMod)) moduleFiles.set(fromMod, new Set());
        moduleFiles.get(fromMod)!.add(basename(dep.from));

        if (!moduleFiles.has(toMod)) moduleFiles.set(toMod, new Set());
        moduleFiles.get(toMod)!.add(basename(dep.to));

        // Skip intra-module edges (files within same directory)
        if (fromMod === toMod) continue;

        const key = `${fromMod}::${toMod}`;
        moduleEdges.set(key, (moduleEdges.get(key) || 0) + 1);
    }

    // If all deps are intra-module, fall back to compact file-level
    if (moduleEdges.size === 0) {
        return buildCompactFileDiagram(cleanDeps);
    }

    const MAX_NODES = 10;
    const MAX_EDGES = 12;

    // Collect modules from edges
    const allModules = new Set<string>();
    for (const [key] of moduleEdges) {
        const [from, to] = key.split("::");
        allModules.add(from);
        allModules.add(to);
    }

    // Prune to most connected if needed
    let modulesToShow: Set<string>;
    if (allModules.size <= MAX_NODES) {
        modulesToShow = allModules;
    } else {
        const scores = new Map<string, number>();
        for (const m of allModules) scores.set(m, 0);
        for (const [key, w] of moduleEdges) {
            const [from, to] = key.split("::");
            scores.set(from, (scores.get(from) || 0) + w);
            scores.set(to, (scores.get(to) || 0) + w);
        }
        const sorted = Array.from(scores.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, MAX_NODES);
        modulesToShow = new Set(sorted.map(([m]) => m));
    }

    const visibleEdges = Array.from(moduleEdges.entries())
        .filter(([key]) => {
            const [from, to] = key.split("::");
            return modulesToShow.has(from) && modulesToShow.has(to);
        })
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_EDGES);

    if (visibleEdges.length === 0) return "";

    const lines: string[] = ["graph TD"];

    // Module nodes with file count
    for (const mod of modulesToShow) {
        const id = toNodeId(mod);
        const count = moduleFiles.get(mod)?.size || 0;
        const label = count > 1 ? `${mod} -- ${count} files` : mod;
        lines.push(`  ${id}["${escapeLabel(label)}"]`);
    }

    // Edges with weight
    for (const [key, weight] of visibleEdges) {
        const [from, to] = key.split("::");
        const fromId = toNodeId(from);
        const toId = toNodeId(to);
        if (fromId === toId) continue;
        if (weight > 1) {
            lines.push(`  ${fromId} -->|"${weight}"| ${toId}`);
        } else {
            lines.push(`  ${fromId} --> ${toId}`);
        }
    }

    return lines.join("\n");
}

/**
 * Fallback for single-module repos: compact file-level diagram.
 */
function buildCompactFileDiagram(deps: DependencyInfo[]): string {
    const MAX = 8;
    const allFiles = new Set<string>();
    for (const d of deps) {
        allFiles.add(d.from);
        allFiles.add(d.to);
    }

    let files: Set<string>;
    if (allFiles.size <= MAX) {
        files = allFiles;
    } else {
        const scores = new Map<string, number>();
        for (const f of allFiles) scores.set(f, 0);
        for (const d of deps) {
            scores.set(d.from, (scores.get(d.from) || 0) + 1);
            scores.set(d.to, (scores.get(d.to) || 0) + 1);
        }
        files = new Set(
            Array.from(scores.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, MAX)
                .map(([f]) => f)
        );
    }

    const edges = deps.filter((d) => files.has(d.from) && files.has(d.to));
    if (edges.length === 0) return "";

    const lines: string[] = ["graph TD"];
    for (const f of files) {
        lines.push(`  ${toNodeId(f)}["${escapeLabel(basename(f))}"]`);
    }

    const seen = new Set<string>();
    for (const d of edges) {
        const fId = toNodeId(d.from);
        const tId = toNodeId(d.to);
        const k = `${fId}->${tId}`;
        if (fId !== tId && !seen.has(k)) {
            seen.add(k);
            lines.push(`  ${fId} --> ${tId}`);
        }
    }

    return lines.join("\n");
}
