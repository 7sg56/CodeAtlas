"use client";

import { Activity, Code, Cpu, Layers, Server, ShieldCheck } from "lucide-react";

interface ProjectOverviewProps {
  data: any;
}

export default function ProjectOverview({ data }: ProjectOverviewProps) {
  const { arch, health, fw, lang, ss, api } = data;

  const stats = [
    { label: "Files", value: ss?.files || 0, icon: <Code size={18} />, color: "var(--accent-blue)" },
    { label: "Modules", value: arch?.modules || 0, icon: <Layers size={18} />, color: "var(--accent-purple)" },
    { label: "API Routes", value: api?.length || 0, icon: <Server size={18} />, color: "var(--accent-green)" },
    { label: "Architecture", value: arch?.pattern || "Modular", icon: <Cpu size={18} />, color: "var(--accent-amber)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px", animation: "fade-in 0.5s ease" }}>
      {/* Header Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
        {stats.map((stat, i) => (
          <div key={i} style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "20px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            transition: "transform 0.2s ease, border-color 0.2s ease",
            cursor: "default"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.borderColor = stat.color;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.borderColor = "var(--border-subtle)";
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "var(--radius-sm)",
              background: `${stat.color}15`,
              color: stat.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "1px" }}>{stat.label}</div>
              <div style={{ fontSize: "20px", fontWeight: 700, marginTop: "2px" }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Details */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Health Panel */}
        <div style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "24px",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            top: 0,
            right: 0,
            padding: "12px",
            background: "linear-gradient(135deg, transparent 50%, rgba(108, 255, 140, 0.05) 50%)",
            width: "120px",
            height: "120px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "flex-end",
            opacity: 0.8
          }}>
             <ShieldCheck size={48} color="var(--accent-green)" style={{ opacity: 0.1 }} />
          </div>

          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
            <ShieldCheck size={20} color="var(--accent-green)" />
            Repository Health
          </h3>
          
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <div style={{ position: "relative", width: "100px", height: "100px" }}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="var(--bg-tertiary)" strokeWidth="8" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="var(--accent-green)" strokeWidth="8" 
                  strokeDasharray={`${(health?.health_score || 0) * 2.82} 282`} 
                  strokeDashoffset="0"
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                  style={{ transition: "stroke-dasharray 1s ease-out" }}
                />
              </svg>
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "24px", fontWeight: 700 }}>
                {health?.health_score || 0}
              </div>
            </div>
            
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Complexity</span>
                <span style={{ fontSize: "14px", fontWeight: 600 }}>{health?.metrics?.avg_complexity || 0}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Coupling</span>
                <span style={{ fontSize: "14px", fontWeight: 600 }}>{health?.metrics?.dependency_density || "low"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Architecture Clarity</span>
                <span style={{ fontSize: "14px", fontWeight: 600 }}>{health?.metrics?.clarity || "high"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* System DNA Panel */}
        <div style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "24px",
        }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
            <Activity size={20} color="var(--accent-blue)" />
            System Intelligence DNA
          </h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
             <div style={{ padding: "12px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase" }}>Primary Frameworks</div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {fw?.map((f: string) => (
                    <span key={f} style={{ background: "rgba(108, 140, 255, 0.1)", color: "var(--accent-blue)", padding: "2px 10px", borderRadius: "100px", fontSize: "12px", border: "1px solid rgba(108, 140, 255, 0.2)" }}>
                      {f}
                    </span>
                  ))}
                </div>
             </div>

             <div style={{ padding: "12px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase" }}>Language Distribution</div>
                <div style={{ height: "4px", background: "var(--border-subtle)", borderRadius: "2px", margin: "8px 0", display: "flex", overflow: "hidden" }}>
                  {data?.ext?.languages?.slice(0, 3).map((l: any, i: number) => (
                     <div key={i} style={{ width: `${l.percentage}%`, background: ["var(--accent-blue)", "var(--accent-purple)", "var(--accent-amber)"][i % 3] }} />
                  ))}
                </div>
                <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                   {data?.ext?.languages?.slice(0, 3).map((l: any, i: number) => (
                     <div key={i} style={{ fontSize: "12px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "4px" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: ["var(--accent-blue)", "var(--accent-purple)", "var(--accent-amber)"][i % 3] }} />
                        {l.language}: {Math.round(l.percentage)}%
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
