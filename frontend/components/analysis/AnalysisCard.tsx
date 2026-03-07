"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface AnalysisCardProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  accentColor?: string;
}

export default function AnalysisCard({
  title,
  icon: Icon,
  children,
  accentColor = "var(--accent-blue)",
}: AnalysisCardProps) {
  return (
    <div className="group bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-all duration-300 shadow-xl flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div 
          className="p-2 rounded-lg" 
          style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
        >
          <Icon size={20} strokeWidth={2.5} />
        </div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 group-hover:text-zinc-200 transition-colors">
          {title}
        </h3>
      </div>
      
      <div className="flex-1 text-zinc-300 leading-relaxed text-[15px] font-medium opacity-90 group-hover:opacity-100 transition-opacity whitespace-pre-wrap">
        {children}
      </div>
    </div>
  );
}
