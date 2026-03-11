"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, FileCode, Layers, Link, MessageSquare } from "lucide-react";

interface ModuleExplorerProps {
  data: any;
}

export default function ModuleExplorer({ data }: ModuleExplorerProps) {
  const { groqPrompt } = data;
  const modules = groqPrompt?.modules || [];
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (name: string) => {
    setExpanded(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", animation: "fade-in 0.5s ease" }}>
      <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
        <Layers size={22} color="var(--accent-purple)" />
        Logical Module Clusters
      </h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "14px" }}>
        {modules.map((mod: any, i: number) => (
          <div key={i} style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            transition: "all 0.3s ease",
            boxShadow: expanded[mod.module] ? "0 10px 30px rgba(0,0,0,0.2)" : "none"
          }}>
            <div
              onClick={() => toggle(mod.module)}
              style={{
                padding: "20px 24px",
                display: "flex",
                alignItems: "center",
                gap: "20px",
                cursor: "pointer",
                transition: "background 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-tertiary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "var(--radius-md)",
                background: "linear-gradient(135deg, rgba(232, 108, 255, 0.1), rgba(108, 140, 255, 0.1))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-purple)"
              }}>
                <Layers size={20} />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "16px", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" }}>
                  {mod.module}
                  <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-muted)", background: "var(--bg-tertiary)", padding: "2px 8px", borderRadius: "4px" }}>
                    {mod.files?.length || 0} files
                  </span>
                </div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
                  {mod.responsibility}
                </div>
              </div>

              {expanded[mod.module] ? <ChevronDown size={20} color="var(--text-muted)" /> : <ChevronRight size={20} color="var(--text-muted)" />}
            </div>

            {expanded[mod.module] && (
              <div style={{
                padding: "24px",
                background: "rgba(10, 10, 15, 0.5)",
                borderTop: "1px solid var(--border-subtle)",
                animation: "fade-in 0.3s ease"
              }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
                  {/* Left Col: Files */}
                  <div>
                    <h4 style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <FileCode size={14} />
                      Core Files in Module
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {mod.files?.slice(0, 8).map((f: string, idx: number) => (
                        <div key={idx} style={{
                          fontSize: "13px",
                          color: "var(--text-primary)",
                          padding: "8px 12px",
                          background: "var(--bg-tertiary)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "var(--radius-sm)",
                          fontFamily: "var(--font-geist-mono), monospace",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          {f}
                        </div>
                      ))}
                      {(mod.files?.length || 0) > 8 && <div style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center", marginTop: "4px" }}>+ {mod.files.length - 8} more files</div>}
                    </div>
                  </div>

                  {/* Right Col: Functions & Context */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    <div>
                      <h4 style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <MessageSquare size={14} />
                        Keyword Context
                      </h4>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {mod.responsibility?.split(' of ')[1]?.split(', ').map((kw: string, idx: number) => (
                          <span key={idx} style={{
                            display: "inline-block",
                            fontSize: "12px",
                            padding: "4px 10px",
                            background: "rgba(108, 140, 255, 0.05)",
                            color: "var(--accent-blue)",
                            border: "1px solid rgba(108, 140, 255, 0.15)",
                            borderRadius: "4px"
                          }}>
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Link size={14} />
                        Key Functional Identifiers
                      </h4>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {mod.key_functions?.map((fn: string, idx: number) => (
                          <span key={idx} style={{
                            fontSize: "11px",
                            padding: "2px 8px",
                            background: "var(--bg-tertiary)",
                            color: "var(--text-secondary)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "4px",
                            fontFamily: "var(--font-geist-mono), monospace"
                          }}>
                            {fn}()
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
