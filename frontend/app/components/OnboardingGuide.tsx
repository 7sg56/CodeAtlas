"use client";

import { CheckCircle2, Circle, Info, Layers, ListTodo, Map, Navigation } from "lucide-react";

interface OnboardingGuideProps {
  data: any;
}

export default function OnboardingGuide({ data }: OnboardingGuideProps) {
  const { groqPrompt } = data;
  const onboarding = groqPrompt?.onboarding?.recommended_reading_order || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px", animation: "fade-in 0.5s ease" }}>
      <div style={{
         padding: "24px",
         background: "linear-gradient(135deg, rgba(108, 140, 255, 0.05) 0%, rgba(232, 108, 255, 0.05) 100%)",
         border: "1px solid var(--border-subtle)",
         borderRadius: "var(--radius-lg)",
         display: "flex",
         alignItems: "center",
         gap: "24px"
      }}>
         <Map size={48} color="var(--accent-blue)" />
         <div>
            <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>Your Developer Map</h3>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
              The system automatically identified a logical onboarding path for you. Follow this sequence to understand 
              the core architecture without getting lost in the noise.
            </p>
         </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <h4 style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Navigation size={14} />
          Recommended Sequential Flow
        </h4>

        {onboarding.map((item: string, i: number) => {
          const isEntry = i === 0;
          return (
            <div key={i} style={{
              display: "flex",
              gap: "20px",
              padding: "20px",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              transition: "all 0.2s ease"
            }}>
              <div style={{
                 padding: "4px 10px",
                 height: "fit-content",
                 background: isEntry ? "var(--accent-blue)" : "var(--bg-tertiary)",
                 color: isEntry ? "#fff" : "var(--text-muted)",
                 borderRadius: "4px",
                 fontSize: "13px",
                 fontWeight: 700
              }}>
                {i + 1}
              </div>

              <div style={{ flex: 1 }}>
                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div style={{ fontSize: "15px", fontWeight: 700, fontFamily: "var(--font-geist-mono), monospace" }}>
                       {item}
                    </div>
                    {isEntry && <span style={{ fontSize: "11px", fontWeight: 700, background: "rgba(108, 140, 255, 0.1)", color: "var(--accent-blue)", padding: "2px 8px", borderRadius: "100px", textTransform: "uppercase" }}>Start Here</span>}
                 </div>
                 <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", fontSize: "13px" }}>
                    <Info size={14} />
                    {isEntry 
                      ? "Primary entrypoint of the repository. Contains initialization logic." 
                      : i === onboarding.length - 1 
                        ? "Deep implementation logic. Focus on this after understanding the controllers."
                        : "Architectural hub or core service identified through dependency analysis."}
                 </div>
              </div>

              <div style={{ display: "flex", alignItems: "center" }}>
                 <Circle size={24} style={{ opacity: 0.1 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
