"use client";

import { useEffect, useState } from "react";
import { Bot, MessageSquare, Terminal } from "lucide-react";

interface AIExplanationProps {
  explanation: string;
}

export default function AIExplanation({ explanation }: AIExplanationProps) {
  const [sections, setSections] = useState<{ title: string; content: string }[]>([]);

  useEffect(() => {
    if (!explanation) return;

    // Simple parser for the architectural output structure
    const lines = explanation.split("\n");
    const result: { title: string; content: string }[] = [];
    let currentTitle = "Summary";
    let currentContent: string[] = [];

    lines.forEach(line => {
      const titleMatch = line.match(/^(PROJECT PURPOSE|SYSTEM ARCHITECTURE|ARCHITECTURE OVERVIEW|MODULE BREAKDOWN|HOW THE SYSTEM WORKS|EXECUTION FLOW|WHERE TO START READING|DEVELOPER ONBOARDING|RISK & IMPORTANT AREAS|RISK AREAS)/i);
      if (titleMatch) {
         if (currentContent.length > 0) {
            result.push({ title: currentTitle, content: currentContent.join("\n").trim() });
         }
         currentTitle = titleMatch[0].toUpperCase();
         currentContent = [];
      } else {
         currentContent.push(line);
      }
    });

    if (currentContent.length > 0) {
      result.push({ title: currentTitle, content: currentContent.join("\n").trim() });
    }

    setSections(result);
  }, [explanation]);

  if (!explanation) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
        <Bot size={48} style={{ opacity: 0.2, marginBottom: "16px" }} />
        <p>AI reasoned summary is unavailable for this repository.</p>
      </div>
    );
  }

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
         <Bot size={48} color="var(--accent-blue)" />
         <div>
            <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>AI System Architect</h3>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
               This analysis was generated using LLM reasoning on top of local structural signals.
            </p>
         </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
        {sections.map((section, i) => (
          <div key={i} style={{
             padding: "24px",
             background: "var(--bg-secondary)",
             border: "1px solid var(--border-subtle)",
             borderRadius: "var(--radius-md)",
             transition: "all 0.2s ease",
          }}>
             <h4 style={{ fontSize: "12px", fontWeight: 600, color: "var(--accent-blue)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Terminal size={14} />
                {section.title}
             </h4>
             <div style={{ 
               fontSize: "15px", 
               color: "var(--text-primary)", 
               lineHeight: 1.7, 
               whiteSpace: "pre-wrap", 
               fontFamily: "var(--font-geist-sans), Inter, sans-serif"
             }}>
                {section.content}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
