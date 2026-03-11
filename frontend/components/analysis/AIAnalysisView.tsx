"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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

/**
 * Shared markdown component config for consistent rendering across all cards.
 */
function MarkdownContent({ content }: { content: string }) {
  if (!content) return null;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h3 className="text-zinc-200 font-bold text-base mt-4 mb-2">{children}</h3>,
        h2: ({ children }) => <h4 className="text-zinc-200 font-bold text-sm mt-3 mb-2">{children}</h4>,
        h3: ({ children }) => <h5 className="text-zinc-300 font-semibold text-sm mt-3 mb-1">{children}</h5>,
        h4: ({ children }) => <h6 className="text-zinc-300 font-semibold text-xs mt-2 mb-1">{children}</h6>,
        p: ({ children }) => <p className="text-zinc-400 leading-relaxed my-1.5 text-[14px]">{children}</p>,
        ul: ({ children }) => <ul className="my-2 ml-4 space-y-1 list-disc text-zinc-400 text-[14px]">{children}</ul>,
        ol: ({ children }) => <ol className="my-2 ml-4 space-y-1 list-decimal text-zinc-400 text-[14px]">{children}</ol>,
        li: ({ children }) => <li className="text-zinc-400 leading-relaxed">{children}</li>,
        strong: ({ children }) => <strong className="text-zinc-200 font-semibold">{children}</strong>,
        em: ({ children }) => <em className="text-zinc-300 italic">{children}</em>,
        code: ({ children, className }) => {
          const isBlock = className?.includes('language-');
          if (isBlock) {
            return (
              <pre className="bg-zinc-800/60 rounded-lg p-3 my-2 overflow-x-auto border border-zinc-700/50">
                <code className="text-indigo-300 text-xs font-mono">{children}</code>
              </pre>
            );
          }
          return <code className="text-indigo-300 bg-zinc-800/60 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>;
        },
        pre: ({ children }) => <>{children}</>,
        a: ({ href, children }) => <a href={href} className="text-indigo-400 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
        blockquote: ({ children }) => <blockquote className="border-l-2 border-indigo-500/30 pl-3 my-2 text-zinc-400 italic">{children}</blockquote>,
        hr: () => <hr className="border-zinc-700/50 my-4" />,
        table: ({ children }) => <table className="w-full text-sm text-zinc-400 my-2 border-collapse">{children}</table>,
        th: ({ children }) => <th className="text-left text-zinc-300 font-semibold px-2 py-1 border-b border-zinc-700">{children}</th>,
        td: ({ children }) => <td className="px-2 py-1 border-b border-zinc-800">{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
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

    const lines = explanation.split("\n");
    let currentKey: keyof ParsedSections | null = null;
    let content: string[] = [];

    const flush = () => {
      if (currentKey) {
        result[currentKey] = content.join("\n").trim();
      }
    };

    lines.forEach((line) => {
      const cleanLine = line.trim().replace(/^[#\s*]+|[#\s*]+$/g, "").toUpperCase();

      if (cleanLine.startsWith("PROJECT PURPOSE")) {
        flush();
        currentKey = "purpose";
        content = [];
      } else if (cleanLine.startsWith("SYSTEM ARCHITECTURE")) {
        flush();
        currentKey = "architecture";
        content = [];
      } else if (cleanLine.startsWith("MODULE BREAKDOWN")) {
        flush();
        currentKey = "modules";
        content = [];
      } else if (cleanLine.startsWith("HOW THE SYSTEM WORKS") || cleanLine.startsWith("EXECUTION FLOW")) {
        flush();
        currentKey = "execution";
        content = [];
      } else if (cleanLine.startsWith("WHERE TO START READING") || cleanLine.startsWith("DEVELOPER ONBOARDING")) {
        flush();
        currentKey = "onboarding";
        content = [];
      } else if (cleanLine.startsWith("RISK & IMPORTANT AREAS") || cleanLine.startsWith("RISK AREAS")) {
        flush();
        currentKey = "risks";
        content = [];
      } else {
        if (currentKey && !line.trim().match(/^[=-]{3,}$/)) {
          content.push(line);
        }
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
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 blur-[120px] pointer-events-none" />
      </div>

      {/* Grid Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnalysisCard title="Project Purpose" icon={Search} accentColor="#6c8cff">
          <MarkdownContent content={sections.purpose || "No specific purpose detected."} />
        </AnalysisCard>

        <AnalysisCard title="System Architecture" icon={Layers} accentColor="#a87cff">
          <MarkdownContent content={sections.architecture || "Not detected from analysis."} />
        </AnalysisCard>

        <AnalysisCard title="Module Breakdown" icon={Boxes} accentColor="#5ce0a0">
          <MarkdownContent content={sections.modules || "No clusters detected."} />
        </AnalysisCard>

        <AnalysisCard title="Execution Flow" icon={Activity} accentColor="#f0b060">
          <div className="bg-black/20 p-4 rounded-lg border border-white/5">
            <MarkdownContent content={sections.execution || "Flow analysis unknown."} />
          </div>
        </AnalysisCard>

        <AnalysisCard title="Developer Onboarding" icon={BookOpen} accentColor="#50d0e0">
          <MarkdownContent content={sections.onboarding || "No specific guidance detected."} />
        </AnalysisCard>

        <AnalysisCard title="Risk & Important Areas" icon={ShieldAlert} accentColor="#ff6b7a">
          <div className="bg-red-500/5 p-4 rounded-lg border border-red-500/10">
            <MarkdownContent content={sections.risks || "No critical bottlenecks detected."} />
          </div>
        </AnalysisCard>
      </div>
    </div>
  );
}
