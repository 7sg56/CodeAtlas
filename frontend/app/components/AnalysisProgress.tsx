"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

interface Step {
  id: string;
  label: string;
  status: "waiting" | "running" | "done" | "error";
}

interface AnalysisProgressProps {
  isLoading: boolean;
  error: string | null;
}

export default function AnalysisProgress({ isLoading, error }: AnalysisProgressProps) {
  const [steps, setSteps] = useState<Step[]>([
    { id: "clone", label: "Cloning repository", status: "waiting" },
    { id: "parse", label: "Parsing source files (Tree-sitter)", status: "waiting" },
    { id: "graph", label: "Building architecture graph", status: "waiting" },
    { id: "ai", label: "Generating AI architectural summary", status: "waiting" },
  ]);

  useEffect(() => {
    if (!isLoading) {
      if (error) {
        setSteps(prev => prev.map(s => s.status === "running" ? { ...s, status: "error" } : s));
      } else {
        setSteps(prev => prev.map(s => ({ ...s, status: "done" })));
      }
      return;
    }

    // Heuristic progress simulation since backend is one-shot
    const timer1 = setTimeout(() => {
      setSteps(prev => {
        const next = [...prev];
        next[0].status = "running";
        return next;
      });
    }, 500);

    const timer2 = setTimeout(() => {
      setSteps(prev => {
        const next = [...prev];
        next[0].status = "done";
        next[1].status = "running";
        return next;
      });
    }, 3000);

    const timer3 = setTimeout(() => {
      setSteps(prev => {
        const next = [...prev];
        next[1].status = "done";
        next[2].status = "running";
        return next;
      });
    }, 8000);

    const timer4 = setTimeout(() => {
      setSteps(prev => {
        const next = [...prev];
        next[2].status = "done";
        next[3].status = "running";
        return next;
      });
    }, 15000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [isLoading, error]);

  if (!isLoading && !error) return null;

  return (
    <div style={{
      background: "var(--bg-secondary)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-md)",
      padding: "24px",
      marginTop: "24px",
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
    }}>
      <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
        {error ? <span style={{ color: "var(--accent-red)" }}>Analysis Failed</span> : "Intelligence Engine Pipeline"}
        {!error && <Loader2 className="animate-spin" size={16} color="var(--accent-blue)" />}
      </h3>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {steps.map((step) => (
          <div key={step.id} style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "12px",
            opacity: step.status === "waiting" ? 0.4 : 1,
            transition: "opacity 0.3s ease"
          }}>
            {step.status === "done" && <CheckCircle2 size={18} color="var(--accent-green)" />}
            {step.status === "running" && <Loader2 className="animate-spin" size={18} color="var(--accent-blue)" />}
            {step.status === "waiting" && <Circle size={18} color="var(--text-muted)" />}
            {step.status === "error" && <CheckCircle2 size={18} style={{ transform: "rotate(45deg)" }} color="var(--accent-red)" />}
            
            <span style={{ 
              fontSize: "14px", 
              fontWeight: step.status === "running" ? 600 : 400,
              color: step.status === "running" ? "var(--text-primary)" : "var(--text-secondary)"
            }}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ 
          marginTop: "16px", 
          padding: "12px", 
          background: "rgba(255, 107, 122, 0.05)", 
          borderRadius: "var(--radius-sm)",
          border: "1px solid rgba(255, 107, 122, 0.1)",
          fontSize: "13px",
          color: "var(--accent-red)",
          fontFamily: "var(--font-geist-mono), monospace"
        }}>
          Error: {error}
        </div>
      )}
    </div>
  );
}
