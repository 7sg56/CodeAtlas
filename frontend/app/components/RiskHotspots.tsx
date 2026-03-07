"use client";

import { AlertTriangle, Cpu, Info, Shield, Terminal } from "lucide-react";

interface RiskHotspotsProps {
  data: any;
}

export default function RiskHotspots({ data }: RiskHotspotsProps) {
  const { hotspots, health } = data;

  if (!hotspots || hotspots.length === 0) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
        <Shield size={48} style={{ opacity: 0.2, marginBottom: "16px" }} />
        <p>No critical hotspots detected. This repository exhibits high structural clarity.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px", animation: "fade-in 0.5s ease" }}>
      <div style={{
         padding: "24px",
         background: "rgba(255, 107, 122, 0.03)",
         border: "1px solid rgba(255, 107, 122, 0.15)",
         borderRadius: "var(--radius-lg)",
         display: "flex",
         alignItems: "center",
         gap: "24px"
      }}>
         <AlertTriangle size={48} color="var(--accent-red)" />
         <div>
            <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px", color: "var(--text-primary)" }}>High-Risk Components</h3>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
              The system identified files with high complexity, dependency centrality, or entrypoint proximity. 
              These are the most critical points of failure.
            </p>
         </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {hotspots.map((h: any, i: number) => (
          <div key={i} style={{
             padding: "20px",
             background: "var(--bg-secondary)",
             border: "1px solid var(--border-subtle)",
             borderRadius: "var(--radius-md)",
             transition: "all 0.2s ease",
             position: "relative"
          }}>
             <div style={{ position: "absolute", top: "12px", right: "12px", background: "rgba(255, 107, 122, 0.1)", color: "var(--accent-red)", padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase" }}>
                Risk detected
             </div>
             
             <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                   <Terminal size={18} color="var(--accent-red)" />
                   <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "var(--font-geist-mono), monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {h.file}
                   </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", fontSize: "13px", padding: "8px 12px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)" }}>
                   <Info size={14} />
                   Reason: <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{h.reason}</span>
                </div>
             </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "12px", padding: "20px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-muted)", fontSize: "13px" }}>
             <Cpu size={16} />
             System Health Metric: <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{health?.health_score || 0} / 100</span>
          </div>
          <button style={{ background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--text-muted)", padding: "4px 12px", borderRadius: "100px", fontSize: "12px", cursor: "pointer", transition: "all 0.2s ease" }} onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.borderColor = "var(--text-primary)"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border-subtle)"; }}>
             Explain Risk Factors
          </button>
      </div>
    </div>
  );
}
