"use client";

import { useMemo } from "react";
import { ArrowDown, Code, MapPin, Play, Terminal, Bot } from "lucide-react";

interface ExecutionFlowProps {
  data: any;
}

export default function ExecutionFlow({ data }: ExecutionFlowProps) {
  const { groqPrompt, aiExplanation } = data;
  
  const aiFlowSteps = useMemo(() => {
    if (!aiExplanation) return null;
    
    const lines = aiExplanation.split('\n');
    let sectionContent: string[] = [];
    let insideSection = false;
    
    for (const line of lines) {
      const cleanLine = line.trim().replace(/^[#\s*]+|[#\s*]+$/g, "").toUpperCase();
      if (cleanLine.startsWith("HOW THE SYSTEM WORKS") || cleanLine.startsWith("EXECUTION FLOW")) {
        insideSection = true;
        continue;
      }
      if (insideSection) {
        // Detect next header
        if (cleanLine === "WHERE TO START READING" || 
            cleanLine === "DEVELOPER ONBOARDING" || 
            cleanLine === "RISK & IMPORTANT AREAS" || 
            cleanLine === "RISK AREAS") {
          break;
        }
        if (line.trim()) sectionContent.push(line.trim());
      }
    }
    
    if (sectionContent.length === 0) return null;
    
    // Try to extract structural steps from "File A -> File B" notation
    const steps: string[] = [];
    sectionContent.forEach(line => {
      if (line.includes('->')) {
        const parts = line.split('->').map(p => p.trim().replace(/^[*\s!-]+/, ""));
        parts.forEach(p => {
          if (p && !steps.includes(p)) steps.push(p);
        });
      }
    });
    
    return {
      steps: steps.length > 0 ? steps : null,
      raw: sectionContent.join('\n')
    };
  }, [aiExplanation]);

  const flow = (groqPrompt?.execution_flow && groqPrompt.execution_flow.length > 0) 
    ? groqPrompt.execution_flow 
    : aiFlowSteps?.steps || [];

  if (flow.length === 0) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
        <Terminal size={48} style={{ opacity: 0.2 }} />
        <div>
          <p style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>Heuristic flow analysis unavailable</p>
          <p style={{ fontSize: "13px" }}>The structural analyzer couldn't trace a reliable execution path.</p>
        </div>
        
        {aiFlowSteps?.raw && (
          <div style={{ 
            marginTop: "20px", 
            padding: "24px", 
            background: "var(--bg-secondary)", 
            border: "1px solid var(--border-subtle)", 
            borderRadius: "var(--radius-lg)",
            textAlign: "left",
            maxWidth: "600px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", color: "var(--accent-blue)" }}>
              <Bot size={18} />
              <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>AI System Architect Insights</span>
            </div>
            <div style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>
              {aiFlowSteps.raw}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px", animation: "fade-in 0.5s ease" }}>
      <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
        <Play size={22} color="var(--accent-green)" />
        Runtime Execution Path
      </h3>

      <div style={{ 
        position: "relative", 
        paddingLeft: "32px", 
        display: "flex", 
        flexDirection: "column", 
        gap: "24px" 
      }}>
        {/* Vertical Line */}
        <div style={{ 
          position: "absolute", 
          left: "11px", 
          top: "10px", 
          bottom: "10px", 
          width: "2px", 
          background: "linear-gradient(to bottom, var(--accent-green) 0%, var(--accent-blue) 100%)", 
          opacity: 0.3 
        }} />

        {flow.map((path: string, i: number) => (
          <div key={i} style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "20px",
            position: "relative"
          }}>
            <div style={{ 
              width: "24px", 
              height: "24px", 
              borderRadius: "50%", 
              background: i === 0 ? "var(--accent-green)" : "var(--bg-tertiary)", 
              border: "3px solid var(--bg-primary)",
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: i === 0 ? "#fff" : "var(--text-muted)",
              boxShadow: i === 0 ? "0 0 15px rgba(72, 199, 142, 0.4)" : "none"
            }}>
              {i === 0 ? <Play size={10} fill="currentColor" /> : <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "currentColor" }} />}
            </div>

            <div style={{ 
              flex: 1, 
              padding: "16px 20px", 
              background: "var(--bg-secondary)", 
              border: "1px solid var(--border-subtle)", 
              borderRadius: "var(--radius-md)",
              display: "flex",
              alignItems: "center",
              gap: "16px",
              boxShadow: i === 0 ? "0 4px 12px rgba(0,0,0,0.15)" : "none"
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "var(--font-geist-mono), monospace" }}>
                   {path}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                   {i === 0 ? "System Entrypoint" : i < 3 ? "Middleware / Route Handler" : "Primary Logic / Controller"}
                </div>
              </div>
              <MapPin size={18} color={i === 0 ? "var(--accent-green)" : "var(--text-muted)"} />
            </div>

            {i < flow.length - 1 && (
               <div style={{ position: "absolute", bottom: "-20px", left: "-2px", color: "var(--accent-blue)", opacity: 0.5 }}>
                 <ArrowDown size={14} />
               </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
