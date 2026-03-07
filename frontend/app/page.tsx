"use client";

import { useState, useRef, useMemo } from "react";
import FileTree from "./components/FileTree";
import MermaidDiagram from "./components/MermaidDiagram";
import ProjectOverview from "./components/ProjectOverview";
import ModuleExplorer from "./components/ModuleExplorer";
import ExecutionFlow from "./components/ExecutionFlow";
import OnboardingGuide from "./components/OnboardingGuide";
import RiskHotspots from "./components/RiskHotspots";
import AIAnalysisView from "../components/analysis/AIAnalysisView";
import InteractiveGraph from "./components/InteractiveGraph";
import AnalysisProgress from "./components/AnalysisProgress";
import { buildArchitectureDiagram, buildImportExportMap } from "./utils/buildMermaidDiagram";
import { BarChart3, Binary, BookOpen, Code2, Cpu, FileJson, GitGraph, Layers2, LayoutDashboard, Route } from "lucide-react";

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
    mermaid: string;
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
  groqPrompt?: any;
  aiExplanation?: string;
  health?: {
    health_score: number;
    metrics: {
      avg_complexity: number;
      dependency_density: string;
      module_structure: string;
      clarity: string;
    };
  };
  hotspots?: { file: string; reason: string }[];
  mentalModel?: {
    mermaid: string;
    conceptual_components: any[];
    interactions: any[];
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
  const [activeTab, setActiveTab] = useState<"overview" | "arch" | "modules" | "flow" | "onboarding" | "files" | "graph" | "ai" | "api">("overview");
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

        {/* Loading / Progress */}
        <AnalysisProgress isLoading={loading} error={error} />

        {/* Results */}
        {data && (
          <div className="animate-fade-in" style={{ display: "flex", gap: "40px", alignItems: "flex-start", marginTop: "16px" }}>
            {/* Sidebar */}
            <aside
              style={{
                width: "240px",
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
                Intelligence Engine
              </h3>
              {[
                { id: "overview", label: "Overview", icon: <LayoutDashboard size={16} /> },
                { id: "ai", label: "AI Architect", icon: <Binary size={16} /> },
                { id: "arch", label: "Architecture", icon: <Cpu size={16} /> },
                { id: "modules", label: "Modules", icon: <Layers2 size={16} /> },
                { id: "flow", label: "Execution Flow", icon: <Route size={16} /> },
                { id: "onboarding", label: "Onboarding", icon: <BookOpen size={16} /> },
                { id: "graph", label: "Dependency Graph", icon: <GitGraph size={16} /> },
                { id: "api", label: "API Surface", icon: <FileJson size={16} /> },
                { id: "files", label: "File Tree", icon: <Code2 size={16} /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    padding: "12px 14px",
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
                  <span style={{ 
                    color: activeTab === tab.id ? "var(--accent-blue)" : "inherit",
                    opacity: activeTab === tab.id ? 1 : 0.6 
                  }}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </aside>

            {/* Main Content Area */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "32px", minWidth: 0 }}>
              {/* Repo name header */}
              <div style={{ paddingBottom: "16px", borderBottom: "1px solid var(--border-subtle)", marginBottom: "-8px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  <h2 style={{ fontSize: "28px", fontWeight: 700, margin: 0, letterSpacing: "-0.5px" }}>{repoName}</h2>
                  <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                    {data.fw?.slice(0, 3).map((f: string) => (
                      <span key={f} style={{ fontSize: "11px", fontWeight: 700, background: "rgba(108, 140, 255, 0.1)", color: "var(--accent-blue)", padding: "2px 8px", borderRadius: "100px" }}>{f}</span>
                    ))}
                    {data.cached && <span style={{ fontSize: "11px", fontWeight: 700, background: "rgba(245, 166, 35, 0.1)", color: "var(--accent-amber)", padding: "2px 8px", borderRadius: "100px" }}>Cached</span>}
                  </div>
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-geist-mono), monospace" }}>
                   ID: {data.id?.substring(0, 8)}
                </div>
              </div>

              {/* TAB CONTENT */}
              <div className="tab-pane">
                {activeTab === "overview" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
                    <ProjectOverview data={data} />
                    <RiskHotspots data={data} />
                  </div>
                )}

                {activeTab === "ai" && (
                  <AIAnalysisView explanation={data.aiExplanation || ""} />
                )}

                {activeTab === "arch" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
                    {data.mentalModel?.mermaid && (
                      <MermaidDiagram syntax={data.mentalModel.mermaid} title="Conceptual System Architecture" />
                    )}
                    {data.arch?.mermaid ? (
                      <MermaidDiagram syntax={data.arch.mermaid} title="Infrastructure & Module Dependencies" />
                    ) : (
                      !data.mentalModel?.mermaid && (
                        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                          <Cpu size={48} style={{ opacity: 0.2, marginBottom: "16px" }} />
                          <p>Architecture graph could not be synthesized for this repository.</p>
                        </div>
                      )
                    )}
                  </div>
                )}

                {activeTab === "modules" && (
                  <ModuleExplorer data={data} />
                )}

                {activeTab === "flow" && (
                  <ExecutionFlow data={data} />
                )}

                {activeTab === "onboarding" && (
                  <OnboardingGuide data={data} />
                )}

                {activeTab === "graph" && (
                  <InteractiveGraph data={{
                    entries: data.entry,
                    files: data.files,
                    deps: data.deps,
                    hubs: data.hubs
                  }} />
                )}

                {activeTab === "api" && (
                   <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                      <div style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-subtle)", padding: "24px" }}>
                        <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                          <Route size={22} color="var(--accent-green)" />
                          API Surface Area
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {data.api.map((route: any, i: number) => {
                             const [method, path, fileId] = route;
                             return (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                                   <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--accent-green)", minWidth: "50px" }}>{method}</span>
                                   <span style={{ fontSize: "14px", fontWeight: 600, flex: 1, fontFamily: "var(--font-geist-mono), monospace" }}>{path}</span>
                                   <span style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-geist-mono), monospace" }}>{data.files[fileId] || fileId}</span>
                                </div>
                             );
                          })}
                        </div>
                      </div>
                   </div>
                )}

                {activeTab === "files" && (
                  <FileTree tree={data.st} />
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}