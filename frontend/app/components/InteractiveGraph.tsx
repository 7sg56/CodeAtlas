"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Maximize2 } from "lucide-react";

// Use dynamic import for ForceGraph2D as it needs client-side context (browsers)
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

interface InteractiveGraphProps {
  data: any;
}

export default function InteractiveGraph({ data }: InteractiveGraphProps) {
  const { entries, files, deps, hubs } = data;
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      });
    }
    
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const graphData = useMemo(() => {
    const nodes = Object.entries(files).map(([id, name]: [string, any]) => ({
      id: Number(id),
      name,
      val: hubs.includes(Number(id)) ? 5 : 2,
      color: hubs.includes(Number(id)) ? "var(--accent-amber)" : "var(--accent-blue)",
      isHub: hubs.includes(Number(id)),
      isEntry: entries?.includes(Number(id))
    }));

    const links = deps.map(([from, to]: [number, number]) => ({
      source: from,
      target: to
    }));

    return { nodes, links };
  }, [files, deps, hubs, entries]);

  useEffect(() => {
    // Initial zoom to fit after data is loaded and component mounted
    const timer = setTimeout(() => {
      if (graphRef.current) {
        graphRef.current.zoomToFit(400, 100);
        // Add stronger repulsion force
        graphRef.current.d3Force('charge').strength(-150);
        graphRef.current.d3Force('link').distance(50);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [graphData]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", height: "100%", minHeight: "750px" }}>
       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
             <h3 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>Interactive Dependency Graph</h3>
             <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "4px 0 0 0" }}>Explore file relationships and import density using force-directed physics.</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
             <button onClick={() => graphRef.current?.zoomToFit(400)} style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "var(--text-muted)", padding: "4px 12px", borderRadius: "100px", fontSize: "11px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                <Maximize2 size={12} />
                Fit Graph
             </button>
          </div>
       </div>

       <div ref={containerRef} style={{ flex: 1, background: "#050508", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-subtle)", overflow: "hidden", position: "relative" }}>
          <ForceGraph2D
            ref={graphRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            nodeLabel="name"
            nodeColor={(node: any) => node.color}
            nodeRelSize={4}
            linkColor={() => "rgba(108, 140, 255, 0.4)"}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={0.005}
            linkDirectionalParticleWidth={1.5}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            onNodeClick={(node: any) => {
              graphRef.current.centerAt(node.x, node.y, 400);
              graphRef.current.zoom(4, 400);
            }}
            nodeCanvasObject={(node: any, ctx: any, globalScale: any) => {
              const label = node.name.split('/').pop();
              // Cap font size so it doesn't overwhelm nodes when zoomed out
              const baseFontSize = 14;
              const fontSize = Math.min(baseFontSize, baseFontSize / Math.sqrt(globalScale));
              
              // Draw node circle
              const r = (node.isHub ? 6 : node.isEntry ? 5 : 3);
              ctx.beginPath();
              ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
              ctx.fillStyle = node.color;
              ctx.fill();

              // Add glow for hubs
              if (node.isHub) {
                ctx.shadowColor = node.color;
                ctx.shadowBlur = 15;
                ctx.strokeStyle = "rgba(255,255,255,0.5)";
                ctx.stroke();
                ctx.shadowBlur = 0;
              }

              // Draw Label - always show but keep size relative
              ctx.font = `${fontSize}px var(--font-geist-mono)`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              
              // Text background/halo
              const textWidth = ctx.measureText(label).width;
              ctx.fillStyle = 'rgba(5, 5, 8, 0.6)';
              ctx.fillRect(node.x - textWidth/2 - 2, node.y + r + 2, textWidth + 4, fontSize + 2);
              
              ctx.fillStyle = node.isHub ? 'var(--accent-amber)' : 'rgba(255, 255, 255, 0.8)';
              ctx.fillText(label, node.x, node.y + r + fontSize/2 + 4);
            }}
          />
          
          <div style={{ position: "absolute", bottom: "16px", right: "16px", background: "rgba(10, 10, 15, 0.8)", padding: "12px", borderRadius: "12px", fontSize: "11px", display: "flex", flexDirection: "column", gap: "10px", backdropFilter: "blur(10px)", border: "1px solid var(--border-subtle)", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
             <div style={{ fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", fontSize: "9px", marginBottom: "4px" }}>Legend</div>
             <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--accent-blue)", boxShadow: "0 0 10px rgba(108, 140, 255, 0.3)" }} />
                <span>File Module</span>
             </div>
             <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--accent-amber)", boxShadow: "0 0 10px rgba(240, 176, 96, 0.3)" }} />
                <span style={{ fontWeight: 600, color: "var(--accent-amber)" }}>Dependency Hub</span>
             </div>
             <div style={{ borderTop: "1px solid var(--border-subtle)", marginTop: "4px", paddingTop: "8px", fontSize: "10px", color: "var(--text-muted)" }}>
                Scroll to zoom • Drag to move
             </div>
          </div>
       </div>
    </div>
  );
}
