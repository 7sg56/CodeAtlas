"use client";

import React, { useMemo } from "react";
import { 
  Bot, 
  Search, 
  Layers, 
  Boxes, 
  Activity, 
  BookOpen, 
  ShieldAlert, 
  Info,
  ChevronRight
} from "lucide-react";
import AnalysisCard from "./AnalysisCard";

interface AIAnalysisViewProps {
  explanation: string;
}

interface ParsedSections {
  purpose: string;
  architecture: string;
  modules: string;
  execution: string;
  onboarding: string;
  risks: string;
}

export default function AIAnalysisView({ explanation }: AIAnalysisViewProps) {
  const sections = useMemo(() => {
    if (!explanation) return null;

    const result: ParsedSections = {
      purpose: "",
      architecture: "",
      modules: "",
      execution: "",
      onboarding: "",
      risks: "",
    };

    // The current backend uses these exact headers
    const lines = explanation.split("\n");
    let currentKey: keyof ParsedSections | null = null;
    let content: string[] = [];

    const flush = () => {
      if (currentKey) {
        result[currentKey] = content.join("\n").trim();
      }
    };

    lines.forEach((line) => {
      const l = line.trim().toUpperCase();
      
      if (l.startsWith("PROJECT PURPOSE")) {
        flush();
        currentKey = "purpose";
        content = [];
      } else if (l.startsWith("SYSTEM ARCHITECTURE")) {
        flush();
        currentKey = "architecture";
        content = [];
      } else if (l.startsWith("MODULE BREAKDOWN")) {
        flush();
        currentKey = "modules";
        content = [];
      } else if (l.startsWith("HOW THE SYSTEM WORKS") || l.startsWith("EXECUTION FLOW")) {
        flush();
        currentKey = "execution";
        content = [];
      } else if (l.startsWith("WHERE TO START READING") || l.startsWith("DEVELOPER ONBOARDING")) {
        flush();
        currentKey = "onboarding";
        content = [];
      } else if (l.startsWith("RISK & IMPORTANT AREAS") || l.startsWith("RISK AREAS")) {
        flush();
        currentKey = "risks";
        content = [];
      } else {
        content.push(line);
      }
    });
    flush();

    return result;
  }, [explanation]);

  if (!explanation || !sections) {
    return (
      <div className="p-10 text-center text-zinc-500 bg-zinc-900/40 rounded-2xl border border-dashed border-zinc-800 flex flex-col items-center gap-4">
        <Bot size={48} className="opacity-20" />
        <p className="font-medium text-zinc-400">Architectural analysis unavailable for this repository.</p>
        <p className="text-xs max-w-sm">Ensure your repository analysis has successfully completed with Groq API enabled.</p>
      </div>
    );
  }

  // Purpose formatting - extracting first high-level sentence for header
  const firstSentence = sections.purpose.split(/[.!?]/)[0] + ".";

  return (
    <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="relative overflow-hidden group p-8 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-indigo-900/20 border border-zinc-800">
        <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
          <div className="p-5 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-2xl shadow-indigo-500/5 group-hover:scale-110 transition-transform duration-500">
            <Bot size={48} className="text-indigo-400" />
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-extrabold text-white tracking-tight mb-3">AI System Architect</h2>
            <p className="text-zinc-400 text-lg leading-relaxed max-w-2xl font-medium">
              This analysis was generated using LLM reasoning on top of local structural signals.
            </p>
          </div>
        </div>
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 blur-[120px] pointer-events-none" />
      </div>

      {/* Grid Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnalysisCard title="Project Purpose" icon={Search} accentColor="#6c8cff">
          {sections.purpose || "No specific purpose detected."}
        </AnalysisCard>
        
        <AnalysisCard title="System Architecture" icon={Layers} accentColor="#a87cff">
          {sections.architecture || "Not detected from analysis."}
        </AnalysisCard>
        
        <AnalysisCard title="Module Breakdown" icon={Boxes} accentColor="#5ce0a0">
          <div className="space-y-4 py-2">
            {sections.modules ? (
               sections.modules.split('\n').map((line, i) => {
                 const isHeader = line.includes(':') && line.length < 50;
                 return (
                   <div key={i} className={isHeader ? "text-white font-bold text-sm uppercase tracking-wide mt-2 first:mt-0" : "flex items-start gap-2 text-zinc-400"}>
                     {!isHeader && line.trim() && <ChevronRight size={14} className="mt-1 text-emerald-500 shrink-0" />}
                     <span>{line}</span>
                   </div>
                 );
               })
            ) : "No clusters detected."}
          </div>
        </AnalysisCard>
        
        <AnalysisCard title="Execution Flow" icon={Activity} accentColor="#f0b060">
          <div className="bg-black/20 p-4 rounded-lg border border-white/5 font-mono text-sm">
            {sections.execution || "Flow analysis unknown."}
          </div>
        </AnalysisCard>
        
        <AnalysisCard title="Developer Onboarding" icon={BookOpen} accentColor="#50d0e0">
          <div className="space-y-3">
             {sections.onboarding ? (
               sections.onboarding.split('\n').map((line, i) => (
                 <div key={i} className="flex gap-3 text-zinc-300">
                    {line.trim() && <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-2 shrink-0" />}
                    <span>{line}</span>
                 </div>
               ))
             ) : "No specific guidance detected."}
          </div>
        </AnalysisCard>
        
        <AnalysisCard title="Risk & Important Areas" icon={ShieldAlert} accentColor="#ff6b7a">
          <div className="bg-red-500/5 p-4 rounded-lg border border-red-500/10 text-red-100/80">
            {sections.risks || "No critical bottlenecks detected."}
          </div>
        </AnalysisCard>
      </div>
    </div>
  );
}
