"use client";

import { useState } from "react";

interface FileNode {
    name: string;
    type: "file" | "folder";
    size?: number;
    language?: string | null;
    children?: FileNode[];
}

const LANGUAGE_COLORS: Record<string, string> = {
    TypeScript: "#3178c6",
    JavaScript: "#f7df1e",
    Python: "#3572a5",
    Java: "#b07219",
    Go: "#00add8",
    Rust: "#dea584",
    Ruby: "#cc342d",
    PHP: "#4f5d95",
    "C#": "#178600",
    "C++": "#f34b7d",
    C: "#555555",
    Swift: "#f05138",
    Kotlin: "#a97bff",
    HTML: "#e34c26",
    CSS: "#1572b6",
    SCSS: "#c6538c",
    Vue: "#41b883",
    Svelte: "#ff3e00",
    JSON: "#5d5d5d",
    YAML: "#cb171e",
    Markdown: "#083fa1",
    Shell: "#89e051",
    SQL: "#e38c00",
    Dart: "#00b4ab",
};

function getFileIcon(name: string, type: string): string {
    if (type === "folder") return "";
    const ext = name.split(".").pop()?.toLowerCase() || "";
    const icons: Record<string, string> = {
        ts: "TS", tsx: "TX", js: "JS", jsx: "JX",
        py: "PY", java: "JA", go: "GO", rs: "RS",
        html: "<>", css: "##", scss: "##",
        json: "{}", yaml: "YM", yml: "YM",
        md: "MD", sql: "DB", sh: "SH",
        vue: "VU", svelte: "SV",
        png: "IM", jpg: "IM", svg: "SV", gif: "IM",
        lock: "LK", toml: "TM", env: "EN",
        gitignore: "GI", dockerfile: "DK",
    };
    return icons[ext] || "FI";
}

function getIconColor(name: string): string {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    const colors: Record<string, string> = {
        ts: "#3178c6", tsx: "#3178c6", js: "#f7df1e", jsx: "#f7df1e",
        py: "#3572a5", java: "#b07219", go: "#00add8", rs: "#dea584",
        html: "#e34c26", css: "#1572b6", scss: "#c6538c",
        json: "#5d5d5d", yaml: "#cb171e", yml: "#cb171e",
        md: "#083fa1", vue: "#41b883", svelte: "#ff3e00",
    };
    return colors[ext] || "#666680";
}

function TreeNode({ node, depth = 0 }: { node: FileNode; depth?: number }) {
    const [isOpen, setIsOpen] = useState(depth < 1);
    const isFolder = node.type === "folder";
    const hasChildren = isFolder && node.children && node.children.length > 0;

    const sorted = hasChildren
        ? [...node.children!].sort((a, b) => {
            if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
            return a.name.localeCompare(b.name);
        })
        : [];

    return (
        <div>
            <div
                onClick={() => isFolder && setIsOpen(!isOpen)}
                style={{
                    cursor: isFolder ? "pointer" : "default",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "5px 12px 5px",
                    paddingLeft: `${depth * 20 + 12}px`,
                    borderRadius: "var(--radius-sm)",
                    fontSize: "13px",
                    fontFamily: "var(--font-geist-mono), monospace",
                    color: isFolder ? "var(--text-primary)" : "var(--text-secondary)",
                    transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
            >
                {/* Expand/collapse arrow for folders */}
                {isFolder ? (
                    <span
                        style={{
                            display: "inline-flex",
                            width: "14px",
                            justifyContent: "center",
                            fontSize: "10px",
                            color: "var(--text-muted)",
                            transition: "transform 0.2s ease",
                            transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                        }}
                    >
                        &#9654;
                    </span>
                ) : (
                    <span style={{ width: "14px" }} />
                )}

                {/* Icon */}
                {isFolder ? (
                    <span style={{ fontSize: "15px", opacity: 0.8 }}>
                        {isOpen ? "\uD83D\uDCC2" : "\uD83D\uDCC1"}
                    </span>
                ) : (
                    <span
                        style={{
                            fontSize: "9px",
                            fontWeight: 700,
                            color: getIconColor(node.name),
                            background: `${getIconColor(node.name)}18`,
                            padding: "1px 4px",
                            borderRadius: "3px",
                            letterSpacing: "0.5px",
                            fontFamily: "var(--font-geist-sans), sans-serif",
                        }}
                    >
                        {getFileIcon(node.name, node.type)}
                    </span>
                )}

                {/* Name */}
                <span style={{ fontWeight: isFolder ? 500 : 400 }}>{node.name}</span>

                {/* File count for folders */}
                {isFolder && node.children && (
                    <span
                        style={{
                            marginLeft: "auto",
                            fontSize: "11px",
                            color: "var(--text-muted)",
                            fontFamily: "var(--font-geist-sans), sans-serif",
                        }}
                    >
                        {node.children.length}
                    </span>
                )}
            </div>

            {/* Children */}
            {isOpen && hasChildren && (
                <div>
                    {sorted.map((child, i) => (
                        <TreeNode key={`${child.name}-${i}`} node={child} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function FileTree({ tree }: { tree: FileNode[] }) {
    const sorted = [...tree].sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        return a.name.localeCompare(b.name);
    });

    return (
        <div
            style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "8px 0",
                maxHeight: "600px",
                overflowY: "auto",
            }}
        >
            {sorted.map((node, i) => (
                <TreeNode key={`${node.name}-${i}`} node={node} depth={0} />
            ))}
        </div>
    );
}
