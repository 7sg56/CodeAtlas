"use client";

import { useState, useRef, useMemo } from "react";
import FileTree from "./components/FileTree";
import MermaidDiagram from "./components/MermaidDiagram";
import { buildArchitectureDiagram, buildImportExportMap } from "./utils/buildMermaidDiagram";

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
  repo: string;
  id?: string;
  fw: string[];
  lang: string[];
  entry: number[];
  files: Record<number, string>;
  type: Record<number, string>;
  api: [string, string, string | number][];
  deps: [number, number][];
  hubs: number[];
  arch: {
    pattern: string;
    routers: number;
    controllers: number;
    services: number;
    modules: number;
  };
  det?: Record<number, {
    fn: string[];
    cx: number;
    rt: [string, string][];
  }>;
  st: FileNode[];
  ss: { files: number; folders: number };
  ext: {
    languages: LanguageInfo[];
  };
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
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "api" | "files">("overview");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

  const analyze = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    setUploadName(null);

    try {
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
      setData({ ...result, cached: !!result.cached });
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const analyzeZip = async (file: File) => {
    setLoading(true);
    setError(null);
    setData(null);
    setUploadName(file.name.replace(/\.zip$/i, ""));

    try {
      const formData = new FormData();
      formData.append("repo", file);

      const res = await fetch(`${apiUrl}/api/analyze/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Upload analysis failed");
      }

      const result = await res.json();
      if (result.repository) {
        setData({ ...result, cached: result.cached });
      } else {
        setData({ ...result.analysis, cached: result.cached });
      }
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Something went wrong");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const exportDocs = async () => {
    if (!data) return;
    try {
      const res = await fetch(`${apiUrl}/api/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${repoName}-codeatlas.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Failed to export documentation");
    }
  };

  const clearCache = async () => {
    setClearingCache(true);
    try {
      await fetch(`${apiUrl}/api/cache`, { method: "DELETE" });
      // Re-analyze to get a fresh (non-cached) result
      await analyze();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Failed to clear cache");
    } finally {
      setClearingCache(false);
    }
  };

  const repoName = uploadName || data?.repo || url.split("/").filter(Boolean).slice(-1)[0] || "Repository";

  const architectureSyntax = useMemo(() => {
    if (!data) return "";
    const flatRoutes = data.api.map(r => ({
      method: r[0],
      path: r[1],
      handler: typeof r[2] === 'number' ? (data.files[r[2]] || "Unknown") : r[2],
      framework: data.fw[0] || "Unknown",
      file: typeof r[2] === 'number' ? (data.files[r[2]] || "Unknown") : "Internal",
    }));

    return buildArchitectureDiagram({
      frameworks: data.fw,
      entrypoints: data.entry.map(id => ({ file: data.files[id] || "Unknown", type: "Entry", snippet: "", line: 0 })),
      routes: flatRoutes as any[],
    });
  }, [data]);

  const importMapSyntax = useMemo(() => {
    if (!data) return "";
    const allDeps = data.deps.map(([fromId, toId]) => ({
      from: data.files[fromId] || "Unknown",
      to: data.files[toId] || "Unknown"
    }));

    return buildImportExportMap({ dependencies: allDeps as any[] });
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
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
        </div>

        {/* Header Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Export Docs Button */}
          {data && (
            <button
              onClick={exportDocs}
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--accent-green)",
                background: "rgba(72, 199, 142, 0.1)",
                padding: "6px 14px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid rgba(72, 199, 142, 0.25)",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              Export Docs
            </button>
          )}

          {/* Clear Cache Button */}
          {data?.cached && (
            <button
              onClick={clearCache}
              disabled={clearingCache}
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: clearingCache ? "var(--text-muted)" : "var(--accent-amber)",
                background: clearingCache
                  ? "var(--bg-tertiary)"
                  : "rgba(245, 166, 35, 0.1)",
                padding: "6px 14px",
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
                    width: "12px",
                    height: "12px",
                    border: "2px solid var(--text-muted)",
                    borderTopColor: "var(--accent-amber)",
                    borderRadius: "50%",
                  }}
                />
              )}
              {clearingCache ? "Clearing Cache..." : "Clear Cache & Reanalyze"}
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main style={{ width: "100vw", maxWidth: "100%", padding: "40px 5vw" }}>
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
              Paste a GitHub repository URL or upload a ZIP file to analyze its structure, detect frameworks and languages, and explore the file tree.
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && !loading && analyze()}
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
            onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
              e.currentTarget.style.borderColor = "var(--accent-blue)";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(108, 140, 255, 0.1)";
            }}
            onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
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

          {/* ZIP Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const file = e.target.files?.[0];
              if (file) analyzeZip(file);
            }}
            disabled={loading}
            style={{ display: "none" }}
            id="zip-upload"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            style={{
              padding: "12px 20px",
              background: "var(--bg-tertiary)",
              border: "1px dashed var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-secondary)",
              fontSize: "13px",
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.5 : 1,
              transition: "all 0.2s ease",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            Upload .zip
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
          <div className="animate-fade-in" style={{ display: "flex", gap: "40px", alignItems: "flex-start", marginTop: "16px" }}>
            {/* Sidebar */}
            <aside
              style={{
                width: "220px",
                flexShrink: 0,
                position: "sticky",
                top: "32px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <h3
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "8px",
                  paddingLeft: "12px",
                }}
              >
                Navigation
              </h3>
              {[
                { id: "overview", label: "Overview", icon: "📊" },
                { id: "api", label: "API & Endpoints", icon: "🔌" },
                { id: "files", label: "Files", icon: "📂" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as "overview" | "api" | "files")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    padding: "10px 12px",
                    background: activeTab === tab.id ? "var(--bg-tertiary)" : "transparent",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-secondary)",
                    fontSize: "14px",
                    fontWeight: activeTab === tab.id ? 600 : 500,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                    if (activeTab !== tab.id) {
                      e.currentTarget.style.background = "var(--bg-secondary)";
                      e.currentTarget.style.color = "var(--text-primary)";
                    }
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                    if (activeTab !== tab.id) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--text-secondary)";
                    }
                  }}
                >
                  <span style={{ fontSize: "16px", opacity: activeTab === tab.id ? 1 : 0.6 }}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </aside>

            {/* Main Content Area */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "32px", minWidth: 0 }}>
              {/* Repo name header */}
              <div style={{ paddingBottom: "16px", borderBottom: "1px solid var(--border-subtle)", marginBottom: "-8px" }}>
                <h3
                  style={{
                    fontSize: "28px",
                    fontWeight: 700,
                    margin: 0,
                    letterSpacing: "-0.5px",
                  }}
                >
                  {repoName}
                </h3>
              </div>

              {/* OVERVIEW TAB */}
              {activeTab === "overview" && (
                <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
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
                        {(data.fw?.length || 0) > 1 ? "Frameworks" : "Framework"}
                      </span>
                      {(data.fw || ["Unknown"]).map((fw: string) => {
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
                        {data.ss.files}
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
                        {data.ss.folders}
                      </span>
                    </div>
                  </div>

                  {/* Languages Section */}
                  {data.ext.languages.length > 0 && (
                    <div
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-md)",
                        padding: "24px",
                      }}
                    >
                      <h4 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>🌐</span> Language Distribution
                      </h4>

                      <div style={{ display: "flex", height: "8px", borderRadius: "4px", overflow: "hidden", marginBottom: "20px" }}>
                        {data.ext.languages.map((lang: LanguageInfo) => (
                          <div
                            key={lang.language}
                            style={{
                              width: `${lang.percentage}%`,
                              background: LANG_COLORS[lang.language] || "#666",
                              transition: "width 0.5s ease"
                            }}
                          />
                        ))}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "12px" }}>
                        {data.ext.languages.map((lang: LanguageInfo) => (
                          <div
                            key={lang.language}
                            title={`${lang.language}: ${lang.percentage}%`}
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


                  {/* Architecture Overview */}
                  {architectureSyntax && (
                    <MermaidDiagram syntax={architectureSyntax} title="Architecture" />
                  )}


                  {/* Summary Stats Summary Section */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "16px",
                    }}
                  >
                    {[
                      { label: "Files Analyzed", value: Object.keys(data.files).length, color: "var(--accent-blue)" },
                      { label: "Routers", value: data.arch.routers, color: "var(--accent-purple)" },
                      { label: "Controllers", value: data.arch.controllers, color: "var(--accent-green)" },
                      { label: "Services", value: data.arch.services, color: "var(--accent-amber)" },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        style={{
                          padding: "20px",
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "var(--radius-md)",
                        }}
                      >
                        <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
                          {stat.label}
                        </div>
                        <div style={{ fontSize: "24px", fontWeight: 700, color: stat.color }}>
                          {stat.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Anchors Section */}
                  {data.hubs.length > 0 && (
                    <div style={{ marginTop: "32px", background: "var(--bg-secondary)", padding: "24px", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
                      <h4 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "16px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                        ⚓ Architectural Anchors
                      </h4>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                        {data.hubs.map(id => (
                          <span key={id} style={{ padding: "6px 14px", background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", borderRadius: "20px", fontSize: "13px", fontWeight: 500 }}>
                            {data.files[id]}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}


                </div>
              )}

              {/* API TAB */}
              {activeTab === "api" && (
                <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  {/* Entrypoints Section */}
                  {data.entry.length > 0 && (
                    <div
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-md)",
                        padding: "24px",
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
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {data.entry.map((id, i) => (
                          <div
                            key={`${id}-${i}`}
                            style={{
                              padding: "16px",
                              background: "var(--bg-tertiary)",
                              border: "1px solid var(--border-subtle)",
                              borderRadius: "var(--radius-sm)",
                            }}
                          >
                            <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px", fontFamily: "var(--font-geist-mono), monospace" }}>
                              {data.files[id]}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}


                  {/* API Surface Section */}
                  {data.api.length > 0 && (
                    <div
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-md)",
                        padding: "24px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
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
                          API Surface
                        </h4>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "2px 8px",
                            background: "var(--bg-tertiary)",
                            borderRadius: "10px",
                            color: "var(--accent-blue)",
                            fontFamily: "var(--font-geist-mono), monospace",
                          }}
                        >
                          {data.api.length} endpoint{data.api.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {data.api.map((route, i) => {
                          const methodColors: Record<string, string> = {
                            GET: "#48c78e",
                            POST: "#6c8cff",
                            PUT: "#f5a623",
                            DELETE: "#ff6b7a",
                            PATCH: "#a97bff",
                          };
                          const [method, path, handler] = route;
                          return (
                            <div
                              key={i}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                padding: "12px 16px",
                                background: "var(--bg-tertiary)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: "var(--radius-sm)",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 800,
                                  color: methodColors[method] || "var(--text-muted)",
                                  minWidth: "50px",
                                }}
                              >
                                {method}
                              </span>
                              <span style={{ fontSize: "14px", fontWeight: 600, flex: 1, fontFamily: "var(--font-geist-mono), monospace" }}>
                                {path}
                              </span>
                              <span style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-geist-mono), monospace" }}>
                                {typeof handler === 'number' ? data.files[handler] : handler}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}


                  {/* API Wiring Guide */}
                  {importMapSyntax && (
                    <MermaidDiagram syntax={importMapSyntax} title="API Wiring Guide" />
                  )}


                </div>
              )}

              {/* FILES TAB */}
              {activeTab === "files" && (
                <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
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
                    <FileTree tree={data.st} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}