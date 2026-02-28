"use client";

import { useState, useMemo } from "react";
import FileTree from "./components/FileTree";
import MermaidDiagram from "./components/MermaidDiagram";
import { buildArchitectureDiagram } from "./utils/buildMermaidDiagram";

interface LanguageInfo {
  language: string;
  count: number;
  percentage: number;
}

interface FileNode {
  name: string;
  type: "file" | "folder";
  size?: number;
  language?: string | null;
  children?: FileNode[];
}

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

interface AnalysisResult {
  repoId: string;
  frameworks?: string[];
  framework?: string; // backward compat with old API
  languages: LanguageInfo[];
  stats: { files: number; folders: number };
  structure: FileNode[];
  entrypoints?: EntrypointInfo[];
  routes?: RouteInfo[];
  dependencies?: DependencyInfo[];
  analysis?: { filesAnalyzed: number };
  cached?: boolean;
}

const FRAMEWORK_COLORS: Record<string, string> = {
  "Next.js": "#000000",
  React: "#61dafb",
  Express: "#68a063",
  NestJS: "#e0234e",
  "Vue.js": "#41b883",
  Angular: "#dd0031",
  Svelte: "#ff3e00",
  Fastify: "#000000",
  "Nuxt.js": "#00c58e",
  "Node.js": "#339933",
  // Python
  "Django (Python)": "#092e20",
  "Flask (Python)": "#000000",
  "FastAPI (Python)": "#009688",
  "Streamlit (Python)": "#ff4b4b",
  "Tornado (Python)": "#4c768d",
  // Java
  "Spring Boot (Java)": "#6db33f",
  "Spring (Java)": "#6db33f",
  "Quarkus (Java)": "#4695eb",
  "Micronaut (Java)": "#1a1a1a",
  "Java Project": "#b07219",
  // Rust
  "Actix (Rust)": "#000000",
  "Axum (Rust)": "#dea584",
  "Rocket (Rust)": "#d33847",
  "Tauri (Rust)": "#ffc131",
  "Warp (Rust)": "#dea584",
  "Rust Project": "#dea584",
  // Go
  "Gin (Go)": "#00add8",
  "Echo (Go)": "#00add8",
  "Fiber (Go)": "#00add8",
  "Gorilla (Go)": "#00add8",
  "Go Project": "#00add8",
  // PHP
  "Laravel (PHP)": "#ff2d20",
  "Symfony (PHP)": "#000000",
  "Slim (PHP)": "#74a045",
  "PHP Project": "#4f5d95",
  // Ruby
  "Ruby on Rails": "#cc0000",
  "Sinatra (Ruby)": "#000000",
  "Ruby Project": "#cc342d",
  // AST-detected names (without language suffix)
  FastAPI: "#009688",
  Flask: "#000000",
  Django: "#092e20",
  Gin: "#00add8",
  Echo: "#00add8",
  Fiber: "#00add8",
  Actix: "#000000",
  Axum: "#dea584",
  Rocket: "#d33847",
  Tauri: "#ffc131",
  Electron: "#47848f",
  "Spring Boot": "#6db33f",
  Spring: "#6db33f",
  Koa: "#333333",
  Hapi: "#f5a623",
  Prisma: "#2d3748",
  TypeORM: "#e83524",
  Sequelize: "#3b76c3",
  GraphQL: "#e535ab",
  "Apollo GraphQL": "#311c87",
  "Socket.io": "#010101",
  Mongoose: "#800000",
  "Tailwind CSS": "#38bdf8",
  Sinatra: "#000000",
  Rails: "#cc0000",
  Unknown: "#666680",
};

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f7df1e",
  Python: "#3572a5",
  Java: "#b07219",
  Go: "#00add8",
  Rust: "#dea584",
  Ruby: "#cc342d",
  PHP: "#4f5d95",
  "C#": "#178600",
  "C++": "#f34b7d",
  C: "#555555",
  Swift: "#f05138",
  Kotlin: "#a97bff",
  HTML: "#e34c26",
  CSS: "#1572b6",
  SCSS: "#c6538c",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  JSON: "#5d5d5d",
  YAML: "#cb171e",
  Markdown: "#083fa1",
  Shell: "#89e051",
  SQL: "#e38c00",
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clearingCache, setClearingCache] = useState(false);

  const analyze = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
      const res = await fetch(`${apiUrl}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUrl: url }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Analysis failed");
      }

      const result = await res.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async () => {
    setClearingCache(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
      await fetch(`${apiUrl}/api/cache`, { method: "DELETE" });
      // Re-analyze to get a fresh (non-cached) result
      await analyze();
    } catch (err: any) {
      setError(err.message || "Failed to clear cache");
    } finally {
      setClearingCache(false);
    }
  };

  const repoName = url.split("/").filter(Boolean).slice(-1)[0] || "Repository";

  const architectureSyntax = useMemo(() => {
    if (!data) return "";
    return buildArchitectureDiagram({
      frameworks: data.frameworks || (data.framework ? [data.framework] : []),
      entrypoints: data.entrypoints,
      routes: data.routes,
      dependencies: data.dependencies,
    });
  }, [data]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "var(--radius-sm)",
            background: "linear-gradient(135deg, var(--accent-blue), var(--accent-purple))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            fontWeight: 700,
            color: "#fff",
          }}
        >
          C
        </div>
        <h1
          style={{
            fontSize: "18px",
            fontWeight: 600,
            margin: 0,
            letterSpacing: "-0.3px",
          }}
        >
          CodeAtlas
        </h1>
        <span
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            background: "var(--bg-tertiary)",
            padding: "2px 8px",
            borderRadius: "var(--radius-sm)",
            fontFamily: "var(--font-geist-mono), monospace",
          }}
        >
          v0.1
        </span>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: "960px", margin: "0 auto", padding: "40px 24px" }}>
        {/* Hero Section */}
        {!data && !loading && (
          <div
            className="animate-fade-in"
            style={{ textAlign: "center", marginBottom: "48px" }}
          >
            <h2
              style={{
                fontSize: "32px",
                fontWeight: 700,
                marginBottom: "12px",
                letterSpacing: "-0.5px",
                background: "linear-gradient(135deg, var(--text-primary) 0%, var(--accent-blue) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Understand any codebase in minutes
            </h2>
            <p
              style={{
                fontSize: "15px",
                color: "var(--text-secondary)",
                maxWidth: "480px",
                margin: "0 auto",
                lineHeight: 1.6,
              }}
            >
              Paste a GitHub repository URL to analyze its structure, detect the framework and languages, and explore the file tree.
            </p>
          </div>
        )}

        {/* Input Section */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "32px",
          }}
        >
          <input
            type="text"
            placeholder="https://github.com/owner/repo"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && analyze()}
            disabled={loading}
            style={{
              flex: 1,
              padding: "12px 16px",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-primary)",
              fontSize: "14px",
              fontFamily: "var(--font-geist-mono), monospace",
              outline: "none",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--accent-blue)";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(108, 140, 255, 0.1)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border-subtle)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          <button
            onClick={analyze}
            disabled={loading || !url.trim()}
            style={{
              padding: "12px 28px",
              background: loading
                ? "var(--bg-tertiary)"
                : "linear-gradient(135deg, var(--accent-blue), var(--accent-purple))",
              border: "none",
              borderRadius: "var(--radius-md)",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 600,
              cursor: loading || !url.trim() ? "not-allowed" : "pointer",
              opacity: loading || !url.trim() ? 0.6 : 1,
              transition: "opacity 0.2s ease, transform 0.1s ease",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              whiteSpace: "nowrap",
            }}
          >
            {loading && (
              <span
                className="animate-spin"
                style={{
                  display: "inline-block",
                  width: "14px",
                  height: "14px",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                }}
              />
            )}
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div
            className="animate-fade-in"
            style={{
              padding: "14px 18px",
              background: "rgba(255, 107, 122, 0.08)",
              border: "1px solid rgba(255, 107, 122, 0.2)",
              borderRadius: "var(--radius-md)",
              color: "var(--accent-red)",
              fontSize: "14px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span style={{ fontSize: "16px" }}>!</span>
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-shimmer"
                style={{
                  height: i === 1 ? "80px" : i === 2 ? "120px" : "300px",
                  borderRadius: "var(--radius-md)",
                }}
              />
            ))}
          </div>
        )}

        {/* Results */}
        {data && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Repo name header */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <h3
                style={{
                  fontSize: "22px",
                  fontWeight: 600,
                  margin: 0,
                  letterSpacing: "-0.3px",
                }}
              >
                {repoName}
              </h3>
            </div>

            {/* Stats Row */}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {/* Framework Badge */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 12px",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 500,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {(data.frameworks?.length || 0) > 1 ? "Frameworks" : "Framework"}
                </span>
                {(data.frameworks || (data.framework ? [data.framework] : ["Unknown"])).map((fw) => {
                  const darkBadge = fw === "Next.js" || fw === "Fastify" || fw === "Flask (Python)" || fw === "Actix (Rust)" || fw === "Symfony (PHP)" || fw === "Sinatra (Ruby)" || fw === "Micronaut (Java)";
                  return (
                    <span
                      key={fw}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "3px 10px",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "13px",
                        fontWeight: 600,
                        background: `${FRAMEWORK_COLORS[fw] || "#666680"}20`,
                        color: darkBadge
                          ? "var(--text-primary)"
                          : FRAMEWORK_COLORS[fw] || "var(--text-primary)",
                        border: `1px solid ${FRAMEWORK_COLORS[fw] || "#666680"}30`,
                      }}
                    >
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: FRAMEWORK_COLORS[fw] || "#666680",
                        }}
                      />
                      {fw}
                    </span>
                  );
                })}
              </div>

              {/* File count */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <span style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Files
                </span>
                <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--accent-green)" }}>
                  {data.stats.files}
                </span>
              </div>

              {/* Folder count */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <span style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Folders
                </span>
                <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--accent-amber)" }}>
                  {data.stats.folders}
                </span>
              </div>
            </div>

            {/* Languages Section */}
            {data.languages.length > 0 && (
              <div
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "20px",
                }}
              >
                <h4
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginTop: 0,
                    marginBottom: "16px",
                  }}
                >
                  Languages
                </h4>

                {/* Language bar */}
                <div
                  style={{
                    display: "flex",
                    height: "10px",
                    borderRadius: "5px",
                    overflow: "hidden",
                    marginBottom: "16px",
                    gap: "2px",
                  }}
                >
                  {data.languages.map((lang) => (
                    <div
                      key={lang.language}
                      title={`${lang.language}: ${lang.percentage}%`}
                      style={{
                        width: `${lang.percentage}%`,
                        minWidth: lang.percentage > 0 ? "4px" : "0",
                        background: LANG_COLORS[lang.language] || "#666680",
                        transition: "width 0.3s ease",
                      }}
                    />
                  ))}
                </div>

                {/* Language pills */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {data.languages.map((lang) => (
                    <div
                      key={lang.language}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <span
                        style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          background: LANG_COLORS[lang.language] || "#666680",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontWeight: 500 }}>{lang.language}</span>
                      <span style={{ color: "var(--text-muted)" }}>
                        {lang.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Entrypoints Section */}
            {data.entrypoints && data.entrypoints.length > 0 && (
              <div
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "20px",
                }}
              >
                <h4
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginTop: 0,
                    marginBottom: "16px",
                  }}
                >
                  Entrypoints
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {data.entrypoints.map((ep, i) => (
                    <div
                      key={`${ep.file}-${ep.line}-${i}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "10px 14px",
                        background: "var(--bg-tertiary)",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          padding: "2px 8px",
                          borderRadius: "var(--radius-sm)",
                          background: ep.type === "server_bootstrap"
                            ? "rgba(108, 140, 255, 0.15)"
                            : ep.type === "client_bootstrap"
                              ? "rgba(160, 120, 255, 0.15)"
                              : "rgba(72, 199, 142, 0.15)",
                          color: ep.type === "server_bootstrap"
                            ? "var(--accent-blue)"
                            : ep.type === "client_bootstrap"
                              ? "var(--accent-purple)"
                              : "var(--accent-green)",
                          flexShrink: 0,
                        }}
                      >
                        {ep.type.replace(/_/g, " ")}
                      </span>
                      <span
                        style={{
                          fontSize: "13px",
                          fontFamily: "var(--font-geist-mono), monospace",
                          color: "var(--text-primary)",
                          fontWeight: 500,
                        }}
                      >
                        {ep.file}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--text-muted)",
                          marginLeft: "auto",
                          flexShrink: 0,
                        }}
                      >
                        line {ep.line}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* API Routes Section */}
            {data.routes && data.routes.length > 0 && (
              <div
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                  <h4
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      margin: 0,
                    }}
                  >
                    API Routes
                  </h4>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--text-muted)",
                      background: "var(--bg-tertiary)",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-sm)",
                      fontFamily: "var(--font-geist-mono), monospace",
                    }}
                  >
                    {data.routes.length} endpoint{data.routes.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {data.routes.map((route, i) => {
                    const methodColors: Record<string, string> = {
                      GET: "#48c78e",
                      POST: "#6c8cff",
                      PUT: "#f5a623",
                      PATCH: "#f5a623",
                      DELETE: "#ff6b7a",
                      USE: "#888",
                      ALL: "#a078ff",
                      CONTROLLER: "#e0234e",
                      RESOURCE: "#cc0000",
                    };
                    const color = methodColors[route.method] || "#888";
                    return (
                      <div
                        key={`${route.method}-${route.path}-${route.file}-${i}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "8px 14px",
                          background: "var(--bg-tertiary)",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 800,
                            fontFamily: "var(--font-geist-mono), monospace",
                            letterSpacing: "0.5px",
                            padding: "2px 8px",
                            borderRadius: "var(--radius-sm)",
                            background: `${color}20`,
                            color: color,
                            minWidth: "60px",
                            textAlign: "center" as const,
                            flexShrink: 0,
                          }}
                        >
                          {route.method}
                        </span>
                        <span
                          style={{
                            fontSize: "13px",
                            fontFamily: "var(--font-geist-mono), monospace",
                            color: "var(--text-primary)",
                            fontWeight: 500,
                          }}
                        >
                          {route.path}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--text-muted)",
                            marginLeft: "auto",
                            flexShrink: 0,
                            fontFamily: "var(--font-geist-mono), monospace",
                          }}
                        >
                          {route.file}:{route.line}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            color: "var(--text-muted)",
                            background: "var(--bg-secondary)",
                            padding: "1px 6px",
                            borderRadius: "var(--radius-sm)",
                            flexShrink: 0,
                          }}
                        >
                          {route.framework}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Architecture Overview */}
            {architectureSyntax && (
              <MermaidDiagram syntax={architectureSyntax} title="Architecture Overview" />
            )}

            {/* Analysis Stats */}
            {data.analysis && (
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 16px",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    AST Parsed
                  </span>
                  <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--accent-blue)" }}>
                    {data.analysis.filesAnalyzed} files
                  </span>
                </div>
                {data.cached && (
                  <button
                    onClick={clearCache}
                    disabled={clearingCache}
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: clearingCache ? "var(--text-muted)" : "var(--accent-amber)",
                      background: clearingCache
                        ? "var(--bg-tertiary)"
                        : "rgba(245, 166, 35, 0.1)",
                      padding: "5px 12px",
                      borderRadius: "var(--radius-sm)",
                      border: `1px solid ${clearingCache ? "var(--border-subtle)" : "rgba(245, 166, 35, 0.25)"}`,
                      cursor: clearingCache ? "not-allowed" : "pointer",
                      transition: "all 0.2s ease",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {clearingCache && (
                      <span
                        className="animate-spin"
                        style={{
                          display: "inline-block",
                          width: "10px",
                          height: "10px",
                          border: "1.5px solid var(--text-muted)",
                          borderTopColor: "var(--accent-amber)",
                          borderRadius: "50%",
                        }}
                      />
                    )}
                    {clearingCache ? "Clearing..." : "Cached -- Clear cache"}
                  </button>
                )}
              </div>
            )}

            {/* File Tree */}
            <div>
              <h4
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginTop: 0,
                  marginBottom: "12px",
                }}
              >
                Repository Structure
              </h4>
              <FileTree tree={data.structure} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}