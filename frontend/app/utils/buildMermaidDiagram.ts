/**
 * Mermaid Diagram Builders
 *
 * Two separate, focused diagrams:
 *
 * 1. Architecture Diagram (buildArchitectureDiagram)
 *    Simple top-down flow: Client -> Server -> Entry -> Route Groups
 *    No file dependencies -- just the high-level shape of the app.
 *
 * 2. API Wiring Guide (buildImportExportMap)
 *    Role-categorized dependency diagram. Each file is auto-classified
 *    (Entry, Route, Middleware, Service, Utility, etc.) and shown with
 *    distinct shapes and colors, flowing top-down like a wiring schematic.
 */

// =========================================================================
// Shared types & helpers
// =========================================================================

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

function escapeLabel(label: string): string {
    return label
        .replace(/"/g, "")
        .replace(/\[/g, "［")
        .replace(/\]/g, "］")
        .replace(/\(/g, "（")
        .replace(/\)/g, "）");
}

function toNodeId(str: string): string {
    return str
        .replace(/[^a-zA-Z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");
}

function cleanFilePath(filePath: string): string {
    return filePath.replace(/\.\w+$/, "");
}

// =========================================================================
// 1. Architecture Diagram -- simple app shape
// =========================================================================

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

function groupRoutes(routes: RouteInfo[]): { path: string; count: number }[] {
    const groups = new Map<string, number>();
    for (const route of routes) {
        const normalized = route.path.startsWith("/") ? route.path : `/${route.path}`;
        const segments = normalized.split("/").filter(Boolean);
        let key: string;
        if (segments.length >= 3) key = `/${segments[0]}/${segments[1]}/${segments[2]}`;
        else if (segments.length === 2) key = `/${segments[0]}/${segments[1]}`;
        else if (segments.length === 1) key = `/${segments[0]}`;
        else key = "/";
        groups.set(key, (groups.get(key) || 0) + 1);
    }
    return Array.from(groups.entries())
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
}

interface ArchInput {
    frameworks: string[];
    entrypoints?: EntrypointInfo[];
    routes?: RouteInfo[];
}

/**
 * Simple architecture diagram: Client -> Server -> Entry -> Routes.
 * No dependency data -- just the app's high-level shape.
 */
export function buildArchitectureDiagram(input: ArchInput): string {
    const { frameworks, entrypoints = [], routes = [] } = input;

    if (routes.length === 0 && entrypoints.length === 0) return "";

    const lines: string[] = ["graph TD"];
    let n = 0;
    const MAX = 12;

    const fe = frameworks.find((fw) => FRONTEND_FRAMEWORKS.has(fw));
    const be = frameworks.find((fw) => BACKEND_FRAMEWORKS.has(fw));
    const fs = frameworks.some((fw) => FULLSTACK_FRAMEWORKS.has(fw));

    if (fe && n < MAX) {
        const label = fs ? escapeLabel(fe) : `${escapeLabel(fe)} Frontend`;
        lines.push(`  Client["${label}"]`);
        n++;
    }

    if (n < MAX) {
        const label = be
            ? `${escapeLabel(be)} Server`
            : fs ? `${escapeLabel(fe || "App")} Server` : "Server";
        lines.push(`  Server["${label}"]`);
        n++;
        if (fe) lines.push("  Client --> Server");
    }

    if (entrypoints.length > 0 && n < MAX) {
        const ep = entrypoints[0];
        lines.push(`  Entry["${escapeLabel(cleanFilePath(ep.file))}"]`);
        lines.push("  Server --> Entry");
        n++;
    }

    const groups = groupRoutes(routes);
    if (groups.length > 0 && n < MAX) {
        lines.push('  API["API Routes"]');
        const from = entrypoints.length > 0 ? "Entry" : "Server";
        lines.push(`  ${from} --> API`);
        n++;

        for (const g of groups) {
            if (n >= MAX) break;
            const id = `R_${toNodeId(g.path)}`;
            const label = g.count > 1 ? `${g.path} -- ${g.count} endpoints` : g.path;
            lines.push(`  ${id}["${escapeLabel(label)}"]`);
            lines.push(`  API --> ${id}`);
            n++;
        }
    }

    if (n < 2) return "";
    return lines.join("\n");
}

// =========================================================================
// 2. API Wiring Guide -- role-categorized dependency diagram
// =========================================================================

const NOISE = [/\.test\b/i, /\.spec\b/i, /\btests?\b/i, /\.d$/];

function isNoise(p: string): boolean {
    return NOISE.some((r) => r.test(p));
}


// Auto-classify a file into a role based on its path
type FileRole =
    | "entry"
    | "route"
    | "middleware"
    | "service"
    | "model"
    | "utility"
    | "component"
    | "page"
    | "config";

function classifyFile(
    filePath: string,
    inDegree: number,
    outDegree: number
): FileRole {
    const lower = filePath.toLowerCase();

    // Entry: files named index/main/app/server that import others but nothing imports them
    if (inDegree === 0 && outDegree > 0) {
        if (/(index|main|app|server)\b/.test(lower)) return "entry";
    }
    if (/\broute[s]?\b/i.test(lower) || /\bcontroller[s]?\b/i.test(lower))
        return "route";
    if (/\bmiddleware[s]?\b/i.test(lower)) return "middleware";
    if (/\bservice[s]?\b/i.test(lower)) return "service";
    if (/\bmodel[s]?\b/i.test(lower)) return "model";
    if (/\butil[s]?\b/i.test(lower) || /\bhelper[s]?\b/i.test(lower) || /\blib\b/i.test(lower))
        return "utility";
    if (/\bcomponent[s]?\b/i.test(lower)) return "component";
    if (/\bpage[s]?\b/i.test(lower) || /\bview[s]?\b/i.test(lower) || /\blayout\b/i.test(lower))
        return "page";
    if (/\bconfig\b/i.test(lower)) return "config";

    // Fallback: imports others but not imported -> entry
    if (inDegree === 0 && outDegree > 0) return "entry";

    return "utility";
}

const ROLE_LABELS: Record<FileRole, string> = {
    entry: "Entry",
    route: "Route",
    middleware: "Middleware",
    service: "Service",
    model: "Model",
    utility: "Utility",
    component: "Component",
    page: "Page",
    config: "Config",
};

// Different Mermaid node shapes per role for visual distinction
function nodeShape(id: string, label: string, role: FileRole): string {
    switch (role) {
        case "entry":
            return `${id}(["${label}"])`;         // stadium (rounded pill)
        case "route":
            return `${id}["${label}"]`;           // rectangle
        case "middleware":
            return `${id}{{"${label}"}}`;         // hexagon
        case "service":
            return `${id}(["${label}"])`;         // stadium
        case "model":
            return `${id}[("${label}")]`;         // cylinder
        case "utility":
            return `${id}>"${label}"]`;           // flag/asymmetric
        case "component":
            return `${id}["${label}"]`;           // rectangle
        case "page":
            return `${id}["${label}"]`;           // rectangle
        default:
            return `${id}["${label}"]`;
    }
}

interface MapInput {
    dependencies: DependencyInfo[];
}

/**
 * API Wiring Guide: a role-categorized dependency diagram.
 *
 * Each file is auto-classified (Entry, Route, Middleware, Service, Utility)
 * and shown with a distinct shape and color. The diagram flows top-down
 * like a wiring schematic: Entry -> Routes -> Services/Middleware/Utilities.
 *
 * Think of it as an electrical diagram for a codebase -- new users can see
 * "index.js (Entry) wires into routes/analyze (Route) which uses
 * utils/scanner (Utility) and ast/analyzer (Service)".
 */
export function buildImportExportMap(input: MapInput): string {
    const { dependencies } = input;
    if (!dependencies || dependencies.length === 0) return "";

    const clean = dependencies.filter((d) => !isNoise(d.from) && !isNoise(d.to));
    if (clean.length === 0) return "";

    // Collect all files and compute degrees
    const allFiles = new Set<string>();
    clean.forEach((d) => {
        allFiles.add(d.from);
        allFiles.add(d.to);
    });

    const inDeg = new Map<string, number>();
    const outDeg = new Map<string, number>();
    allFiles.forEach((f) => {
        inDeg.set(f, 0);
        outDeg.set(f, 0);
    });
    clean.forEach((d) => {
        outDeg.set(d.from, outDeg.get(d.from)! + 1);
        inDeg.set(d.to, inDeg.get(d.to)! + 1);
    });

    // Strip common path prefix for cleaner labels
    const filesArr = Array.from(allFiles);
    let commonPrefix = "";
    if (filesArr.length > 0) {
        const parts = filesArr[0].split("/");
        for (let i = 0; i < parts.length - 1; i++) {
            const prefix = parts.slice(0, i + 1).join("/") + "/";
            if (filesArr.every((f) => f.startsWith(prefix))) commonPrefix = prefix;
        }
    }
    const shortLabel = (p: string) =>
        p.startsWith(commonPrefix) ? p.slice(commonPrefix.length) : p;

    // Prune to 20 most important files
    const MAX_NODES = 20;
    const MAX_EDGES = 30;

    let showFiles: Set<string>;
    if (allFiles.size <= MAX_NODES) {
        showFiles = allFiles;
    } else {
        const scores = new Map<string, number>();
        allFiles.forEach((f) => {
            let s = outDeg.get(f)! + inDeg.get(f)!;
            if (inDeg.get(f)! === 0 && outDeg.get(f)! > 0) s += 20;
            if (/(index|main|app|server)/i.test(f)) s += 15;
            if (/(route|controller|middleware)/i.test(f)) s += 10;
            if (/(service|model)/i.test(f)) s += 5;
            scores.set(f, s);
        });
        showFiles = new Set(
            Array.from(scores.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, MAX_NODES)
                .map(([f]) => f)
        );
    }

    const visEdges = clean
        .filter((d) => showFiles.has(d.from) && showFiles.has(d.to))
        .slice(0, MAX_EDGES);

    if (visEdges.length === 0) return "";

    // Classify each file
    const fileRoles = new Map<string, FileRole>();
    showFiles.forEach((f) => {
        fileRoles.set(f, classifyFile(f, inDeg.get(f) || 0, outDeg.get(f) || 0));
    });

    const lines: string[] = ["graph TD"];

    // Color definitions per role
    lines.push(
        "  classDef entry fill:#4ade80,stroke:#166534,color:#052e16,font-weight:bold"
    );
    lines.push("  classDef route fill:#60a5fa,stroke:#1e40af,color:#172554");
    lines.push("  classDef middleware fill:#fbbf24,stroke:#92400e,color:#451a03");
    lines.push("  classDef service fill:#a78bfa,stroke:#5b21b6,color:#1e1b4b");
    lines.push("  classDef model fill:#f472b6,stroke:#9d174d,color:#500724");
    lines.push("  classDef utility fill:#94a3b8,stroke:#475569,color:#0f172a");
    lines.push("  classDef component fill:#2dd4bf,stroke:#0f766e,color:#042f2e");
    lines.push("  classDef page fill:#fb923c,stroke:#9a3412,color:#431407");
    lines.push("  classDef config fill:#94a3b8,stroke:#475569,color:#0f172a");

    // Emit nodes with role-specific shapes and labels
    showFiles.forEach((f) => {
        const id = toNodeId(f);
        const role = fileRoles.get(f)!;
        const roleTag = ROLE_LABELS[role];
        const label = `${roleTag}: ${escapeLabel(shortLabel(f))}`;
        lines.push(`  ${nodeShape(id, label, role)}:::${role}`);
    });

    // Emit edges
    const seenEdges = new Set<string>();
    visEdges.forEach((d) => {
        const a = toNodeId(d.from);
        const b = toNodeId(d.to);
        const key = `${a}->${b}`;
        if (a !== b && !seenEdges.has(key)) {
            seenEdges.add(key);
            lines.push(`  ${a} --> ${b}`);
        }
    });

    return lines.join("\n");
}
