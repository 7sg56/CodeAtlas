"use client";

import { useEffect, useRef, useState, useId } from "react";
import mermaid from "mermaid";

interface MermaidDiagramProps {
    syntax: string;
    title?: string | null;
}

let mermaidInitialized = false;

function initMermaidOnce() {
    if (mermaidInitialized) return;
    mermaidInitialized = true;

    mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        themeVariables: {
            darkMode: true,
            background: "#12121a",
            primaryColor: "#1e2a4a",
            primaryTextColor: "#e8e8f0",
            primaryBorderColor: "#3a4a6f",
            secondaryColor: "#1a1a2e",
            secondaryTextColor: "#9898b0",
            secondaryBorderColor: "#2a2a3a",
            tertiaryColor: "#1a1a26",
            lineColor: "#4a5a7f",
            textColor: "#e8e8f0",
            mainBkg: "#1e2a4a",
            nodeBorder: "#3a4a6f",
            clusterBkg: "#12121a",
            clusterBorder: "#2a2a3a",
            edgeLabelBackground: "#12121a",
            fontSize: "14px",
            fontFamily:
                'var(--font-geist-sans), "Inter", system-ui, -apple-system, sans-serif',
        },
        flowchart: {
            htmlLabels: true,
            curve: "basis",
            padding: 16,
            nodeSpacing: 40,
            rankSpacing: 50,
            useMaxWidth: true,
        },
        securityLevel: "loose",
    });
}

export default function MermaidDiagram({ syntax, title = "API Flow" }: MermaidDiagramProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [svgContent, setSvgContent] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const uniqueId = useId().replace(/:/g, "_");

    useEffect(() => {
        if (!syntax.trim()) return;

        initMermaidOnce();

        let cancelled = false;

        async function render() {
            try {
                const { svg } = await mermaid.render(
                    `mermaid_${uniqueId}`,
                    syntax
                );
                if (cancelled) return;
                setSvgContent(svg);
                setError(null);
            } catch (err: unknown) {
                if (cancelled) return;
                const message =
                    err instanceof Error ? err.message : "Failed to render diagram";
                setError(message);
                setSvgContent("");
            }
        }

        render();

        return () => {
            cancelled = true;
        };
    }, [syntax, uniqueId]);

    if (!syntax.trim()) return null;

    return (
        <div
            style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "20px",
            }}
        >
            {title && (
                <h4
                    style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginTop: 0,
                        marginBottom: "16px",
                    }}
                >
                    {title}
                </h4>
            )}

            {error ? (
                <div
                    style={{
                        padding: "14px 18px",
                        background: "var(--bg-tertiary)",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-subtle)",
                    }}
                >
                    <p
                        style={{
                            fontSize: "12px",
                            color: "var(--accent-red)",
                            margin: "0 0 12px 0",
                        }}
                    >
                        Diagram render error
                    </p>
                    <pre
                        style={{
                            fontSize: "12px",
                            fontFamily: "var(--font-geist-mono), monospace",
                            color: "var(--text-secondary)",
                            margin: 0,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                        }}
                    >
                        {syntax}
                    </pre>
                </div>
            ) : svgContent ? (
                <div
                    ref={containerRef}
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        overflow: "auto",
                        padding: "8px 0",
                    }}
                    dangerouslySetInnerHTML={{ __html: svgContent }}
                />
            ) : (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "32px",
                        color: "var(--text-muted)",
                        fontSize: "13px",
                    }}
                >
                    <span
                        className="animate-spin"
                        style={{
                            display: "inline-block",
                            width: "14px",
                            height: "14px",
                            border: "2px solid var(--border-subtle)",
                            borderTopColor: "var(--accent-blue)",
                            borderRadius: "50%",
                            marginRight: "10px",
                        }}
                    />
                    Rendering diagram...
                </div>
            )}
        </div>
    );
}
