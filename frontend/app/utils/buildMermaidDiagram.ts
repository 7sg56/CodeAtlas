/**
 * Deterministic Mermaid Diagram Builder
 *
 * Produces a single unified "Architecture Overview" diagram that tells a
 * story a newcomer can follow, top to bottom:
 *
 *   Client (if frontend detected)
 *     |
 *   Server (labeled with backend framework)
 *     |
 *   Entrypoint (bootstrap file)
 *     |
 *   Route Groups (API surface, grouped by path)
 *     |
 *   Supporting Modules (models, middleware, utils -- from dependencies)
 *
 * Rules:
 *  - Only uses data from the AST engine
 *  - Never invents components
 *  - Max 15 nodes total
 *  - Reads like a narrative, not a web of arrows
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

interface DependencyInfo {
    from: string;
    to: string;
}

interface ArchitectureInput {
    frameworks: string[];
    entrypoints?: EntrypointInfo[];
    routes?: RouteInfo[];
    dependencies?: DependencyInfo[];
}

// Framework classification
const FRONTEND_FRAMEWORKS = new Set([
    "React", "Vue.js", "Angular", "Svelte",
    "Next.js", "Nuxt.js", "Electron", "Tauri",
]);

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

const FULLSTACK_FRAMEWORKS = new Set(["Next.js", "Nuxt.js"]);

// Well-known module categories that newcomers would recognize
const MODULE_CATEGORIES: [RegExp, string, string][] = [
    // [pattern, label, nodeId]
    [/\bmodel[s]?\b/i, "Models", "Models"],
    [/\bmiddleware[s]?\b/i, "Middleware", "Middleware"],
    [/\butil[s]?\b/i, "Utilities", "Utils"],
    [/\bhelper[s]?\b/i, "Helpers", "Helpers"],
    [/\bservice[s]?\b/i, "Services", "Services"],
    [/\bcontroller[s]?\b/i, "Controllers", "Controllers"],
    [/\blib\b/i, "Library", "Lib"],
    [/\bauth\b/i, "Auth", "Auth"],
    [/\bdb\b|\bdatabase\b/i, "Database", "DB"],
    [/\bvalidat/i, "Validation", "Validation"],
];

// Noise to exclude
const NOISE_PATTERNS = [
    /\.test\b/i, /\.spec\b/i, /\btests?\b/i,
    /\bconfig\b/i, /\bscripts?\b/i, /\.d$/,
];

function isNoise(filePath: string): boolean {
    return NOISE_PATTERNS.some((p) => p.test(filePath));
}

function escapeLabel(label: string): string {
    return label.replace(/"/g, "'").replace(/[[\](){}]/g, "");
}

function cleanFilePath(filePath: string): string {
    return filePath.replace(/\.\w+$/, "");
}

function toNodeId(str: string): string {
    return str.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

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
 * Get the directory module name for a dependency file.
 */
function getModule(filePath: string): string {
    const parts = filePath.split("/").filter(Boolean);
    if (parts.length >= 2) {
        return parts.slice(0, Math.min(parts.length - 1, 2)).join("/");
    }
    return parts[0] || filePath;
}

/**
 * Categorize a module path into a well-known type (Models, Middleware, etc.)
 * Returns null if it doesn't match any known category.
 */
function categorizeModule(modulePath: string): { label: string; id: string } | null {
    for (const [pattern, label, id] of MODULE_CATEGORIES) {
        if (pattern.test(modulePath)) {
            return { label, id };
        }
    }
    return null;
}

/**
 * Build a single unified architecture diagram that reads top-to-bottom
 * like a story. Combines framework info, entrypoints, routes, and
 * dependencies into one clean narrative.
 *
 * Returns empty string if there is not enough data.
 */
export function buildArchitectureDiagram(input: ArchitectureInput): string {
    const {
        frameworks,
        entrypoints = [],
        routes = [],
        dependencies = [],
    } = input;

    // Need at least something to draw
    if (routes.length === 0 && entrypoints.length === 0 && dependencies.length === 0) {
        return "";
    }

    const lines: string[] = ["graph TD"];
    let nodeCount = 0;
    const MAX_NODES = 15;

    const detectedFrontend = frameworks.find((fw) => FRONTEND_FRAMEWORKS.has(fw));
    const detectedBackend = frameworks.find((fw) => BACKEND_FRAMEWORKS.has(fw));
    const isFullstack = frameworks.some((fw) => FULLSTACK_FRAMEWORKS.has(fw));

    // ---- Layer 1: Client ----
    if (detectedFrontend && nodeCount < MAX_NODES) {
        const clientLabel = isFullstack
            ? escapeLabel(detectedFrontend)
            : `${escapeLabel(detectedFrontend)} Frontend`;
        lines.push(`  Client["${clientLabel}"]`);
        nodeCount++;
    }

    // ---- Layer 2: Server ----
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

    // ---- Layer 3: Entrypoint ----
    if (entrypoints.length > 0 && nodeCount < MAX_NODES) {
        // Show just the primary entrypoint (keep it simple)
        const ep = entrypoints[0];
        const cleanPath = cleanFilePath(ep.file);
        lines.push(`  Entry["${escapeLabel(cleanPath)}"]`);
        lines.push(`  Server --> Entry`);
        nodeCount++;
    }

    // ---- Layer 4: Routes ----
    const routeGroups = groupRoutes(routes);
    const hasRoutes = routeGroups.length > 0;

    if (hasRoutes && nodeCount < MAX_NODES) {
        lines.push(`  API["API Routes"]`);
        const connectFrom = entrypoints.length > 0 ? "Entry" : "Server";
        lines.push(`  ${connectFrom} --> API`);
        nodeCount++;

        for (const group of routeGroups) {
            if (nodeCount >= MAX_NODES) break;
            const nodeId = `R_${toNodeId(group.path)}`;
            const label = group.count > 1
                ? `${group.path} -- ${group.count} endpoints`
                : group.path;
            lines.push(`  ${nodeId}["${escapeLabel(label)}"]`);
            lines.push(`  API --> ${nodeId}`);
            nodeCount++;
        }
    }

    // ---- Layer 5: Supporting modules (from dependencies) ----
    if (dependencies.length > 0 && nodeCount < MAX_NODES) {
        // Find unique target modules from routes/entrypoints
        const cleanDeps = dependencies.filter(
            (d) => !isNoise(d.from) && !isNoise(d.to)
        );

        // Get the directories that routes import FROM (the supporting cast)
        const routeDirs = new Set<string>();
        for (const r of routes) {
            routeDirs.add(getModule(r.file));
        }
        for (const ep of entrypoints) {
            routeDirs.add(getModule(ep.file));
        }

        // Find modules that the route/entry files depend on
        const supportModules = new Map<string, { label: string; id: string }>();

        for (const dep of cleanDeps) {
            const fromMod = getModule(dep.from);
            const toMod = getModule(dep.to);

            // We want modules that routes/entry depend on, not internal deps
            if (fromMod === toMod) continue;

            // Categorize the target module
            const category = categorizeModule(toMod);
            if (category && !supportModules.has(category.id)) {
                supportModules.set(category.id, category);
            }
        }

        // Also look for uncategorized but important modules
        // (ones that many files depend on)
        if (supportModules.size === 0) {
            const targetCounts = new Map<string, number>();
            for (const dep of cleanDeps) {
                const toMod = getModule(dep.to);
                const fromMod = getModule(dep.from);
                if (fromMod !== toMod) {
                    targetCounts.set(toMod, (targetCounts.get(toMod) || 0) + 1);
                }
            }

            const topTargets = Array.from(targetCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);

            for (const [mod] of topTargets) {
                const parts = mod.split("/");
                const label = parts[parts.length - 1] || mod;
                supportModules.set(toNodeId(mod), {
                    label: label.charAt(0).toUpperCase() + label.slice(1),
                    id: toNodeId(mod),
                });
            }
        }

        // Connect supporting modules to the routes layer (or server if no routes)
        const connectFrom = hasRoutes ? "API" : (entrypoints.length > 0 ? "Entry" : "Server");

        const modulesToShow = Array.from(supportModules.values()).slice(0, 4);
        if (modulesToShow.length > 0 && nodeCount < MAX_NODES) {
            for (const mod of modulesToShow) {
                if (nodeCount >= MAX_NODES) break;
                lines.push(`  ${mod.id}["${escapeLabel(mod.label)}"]`);
                lines.push(`  ${connectFrom} --> ${mod.id}`);
                nodeCount++;
            }
        }
    }

    // Don't render trivially small diagram
    if (nodeCount < 2) {
        return "";
    }

    return lines.join("\n");
}
