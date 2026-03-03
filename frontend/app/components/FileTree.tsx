"use client";

import { useState } from "react";

interface FileNode {
    name: string;
    type: "file" | "folder";
    size?: number;
    language?: string | null;
    children?: FileNode[];
}

/* ------------------------------------------------------------------ */
/*  SVG Icons                                                          */
/* ------------------------------------------------------------------ */

function ChevronIcon({ open }: { open: boolean }) {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            style={{
                transition: "transform 0.15s ease",
                transform: open ? "rotate(90deg)" : "rotate(0deg)",
                flexShrink: 0,
            }}
        >
            <path
                d="M6 4L10 8L6 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function FolderIcon({ open }: { open: boolean }) {
    if (open) {
        return (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <path
                    d="M1.5 3.5C1.5 2.94772 1.94772 2.5 2.5 2.5H5.79289C6.0581 2.5 6.31246 2.60536 6.5 2.79289L7.70711 4H13.5C14.0523 4 14.5 4.44772 14.5 5V5.5H3.5C2.94772 5.5 2.5 5.94772 2.5 6.5L1.5 12V3.5Z"
                    fill="#6c8cff"
                    opacity="0.3"
                />
                <path
                    d="M2.5 6.5C2.5 5.94772 2.94772 5.5 3.5 5.5H14.5V12C14.5 12.5523 14.0523 13 13.5 13H2.5V6.5Z"
                    fill="#6c8cff"
                    opacity="0.7"
                />
            </svg>
        );
    }
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <path
                d="M1.5 3C1.5 2.44772 1.94772 2 2.5 2H6.08579C6.35097 2 6.60536 2.10536 6.79289 2.29289L7.91421 3.41421C8.10175 3.60175 8.3561 3.70711 8.62132 3.70711H13.5C14.0523 3.70711 14.5 4.15482 14.5 4.70711V13C14.5 13.5523 14.0523 14 13.5 14H2.5C1.94772 14 1.5 13.5523 1.5 13V3Z"
                fill="#6c8cff"
                opacity="0.6"
            />
        </svg>
    );
}

function FileIcon({ ext }: { ext: string }) {
    const color = getExtColor(ext);
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <path
                d="M4 1.5C3.44772 1.5 3 1.94772 3 2.5V13.5C3 14.0523 3.44772 14.5 4 14.5H12C12.5523 14.5 13 14.0523 13 13.5V5.5L9.5 1.5H4Z"
                fill={color}
                opacity="0.15"
            />
            <path
                d="M9.5 1.5V4.5C9.5 5.05228 9.94772 5.5 10.5 5.5H13"
                stroke={color}
                strokeWidth="1"
                opacity="0.4"
            />
            <path
                d="M4 1.5C3.44772 1.5 3 1.94772 3 2.5V13.5C3 14.0523 3.44772 14.5 4 14.5H12C12.5523 14.5 13 14.0523 13 13.5V5.5L9.5 1.5H4Z"
                stroke={color}
                strokeWidth="1"
                opacity="0.4"
                fill="none"
            />
        </svg>
    );
}

/* ------------------------------------------------------------------ */
/*  Color mapping                                                      */
/* ------------------------------------------------------------------ */

function getExtColor(ext: string): string {
    const map: Record<string, string> = {
        ts: "#3178c6", tsx: "#3178c6",
        js: "#e8d44d", jsx: "#e8d44d",
        py: "#3572a5", java: "#b07219",
        go: "#00add8", rs: "#dea584",
        rb: "#cc342d", php: "#4f5d95",
        html: "#e44d26", htm: "#e44d26",
        css: "#2965f1", scss: "#c6538c", sass: "#c6538c", less: "#1d365d",
        json: "#5d5d5d", yaml: "#cb171e", yml: "#cb171e", xml: "#e44d26",
        md: "#519aba", mdx: "#519aba",
        vue: "#41b883", svelte: "#ff3e00",
        sql: "#e38c00",
        sh: "#89e051", bash: "#89e051", zsh: "#89e051",
        swift: "#f05138", kt: "#a97bff", dart: "#00b4ab",
        c: "#555555", cpp: "#f34b7d", h: "#555555", hpp: "#f34b7d",
        cs: "#178600", scala: "#c22d40",
        graphql: "#e10098", gql: "#e10098",
        dockerfile: "#2496ed", docker: "#2496ed",
        toml: "#9c4121", ini: "#9c4121", cfg: "#9c4121",
        env: "#ecd53f",
        lock: "#555555",
        svg: "#ffb13b", png: "#a074c4", jpg: "#a074c4", jpeg: "#a074c4", gif: "#a074c4", ico: "#a074c4", webp: "#a074c4",
        gitignore: "#f14e32",
        txt: "#6e7681",
        log: "#6e7681",
    };
    return map[ext] || "#6e7681";
}

function getExtLabel(ext: string): string | null {
    const labels: Record<string, string> = {
        ts: "TS", tsx: "TSX", js: "JS", jsx: "JSX",
        py: "PY", java: "JV", go: "GO", rs: "RS",
        rb: "RB", php: "PHP",
        html: "HTML", htm: "HTM",
        css: "CSS", scss: "SCSS",
        json: "{ }", yaml: "YML", yml: "YML",
        md: "MD", mdx: "MDX",
        vue: "VUE", svelte: "SVL",
        sql: "SQL",
        sh: "SH", bash: "SH",
        swift: "SW", kt: "KT",
        svg: "SVG",
        lock: "LCK",
        toml: "TML",
        env: "ENV",
        gitignore: "GIT",
        dockerfile: "DKR",
    };
    return labels[ext] || null;
}

/* ------------------------------------------------------------------ */
/*  Tree Node                                                          */
/* ------------------------------------------------------------------ */

function TreeNode({ node, depth = 0 }: { node: FileNode; depth?: number }) {
    const [isOpen, setIsOpen] = useState(depth < 1);
    const isFolder = node.type === "folder";
    const hasChildren = isFolder && node.children && node.children.length > 0;
    const ext = node.name.includes(".") ? node.name.split(".").pop()?.toLowerCase() || "" : node.name.toLowerCase();

    const sorted = hasChildren
        ? [...node.children!].sort((a, b) => {
            if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
            return a.name.localeCompare(b.name);
        })
        : [];

    const label = !isFolder ? getExtLabel(ext) : null;

    return (
        <div style={{ position: "relative" }}>
            {/* Indentation guide lines */}
            {depth > 0 && Array.from({ length: depth }).map((_, i) => (
                <div
                    key={i}
                    style={{
                        position: "absolute",
                        left: `${i * 20 + 20}px`,
                        top: 0,
                        bottom: 0,
                        width: "1px",
                        background: "var(--border-subtle)",
                        opacity: 0.5,
                    }}
                />
            ))}

            {/* Row */}
            <div
                onClick={() => isFolder && setIsOpen(!isOpen)}
                role={isFolder ? "button" : undefined}
                style={{
                    position: "relative",
                    cursor: isFolder ? "pointer" : "default",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    height: "30px",
                    paddingLeft: `${depth * 20 + 12}px`,
                    paddingRight: "14px",
                    fontSize: "13px",
                    fontFamily: "var(--font-geist-mono), 'SF Mono', 'Fira Code', monospace",
                    color: isFolder ? "var(--text-primary)" : "var(--text-secondary)",
                    transition: "background 0.1s ease",
                    userSelect: "none",
                }}
                onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
            >
                {/* Chevron or spacer */}
                <span style={{ width: "16px", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                    {isFolder ? <ChevronIcon open={isOpen} /> : null}
                </span>

                {/* Icon */}
                {isFolder ? <FolderIcon open={isOpen} /> : <FileIcon ext={ext} />}

                {/* Name */}
                <span
                    style={{
                        fontWeight: isFolder ? 500 : 400,
                        letterSpacing: "-0.01em",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {node.name}
                </span>

                {/* Right side: ext label for files, count for folders */}
                <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    {!isFolder && label && (
                        <span
                            style={{
                                fontSize: "9px",
                                fontWeight: 600,
                                color: getExtColor(ext),
                                opacity: 0.6,
                                letterSpacing: "0.04em",
                                fontFamily: "var(--font-geist-sans), sans-serif",
                            }}
                        >
                            {label}
                        </span>
                    )}
                    {isFolder && node.children && (
                        <span
                            style={{
                                fontSize: "11px",
                                color: "var(--text-muted)",
                                opacity: 0.6,
                                fontFamily: "var(--font-geist-sans), sans-serif",
                            }}
                        >
                            {node.children.length}
                        </span>
                    )}
                </span>
            </div>

            {/* Children */}
            {isOpen && hasChildren && (
                <div>
                    {sorted.map((child, i) => (
                        <TreeNode
                            key={`${child.name}-${i}`}
                            node={child}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Root Component                                                     */
/* ------------------------------------------------------------------ */

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
                padding: "6px 0",
                maxHeight: "600px",
                overflowY: "auto",
                overflowX: "hidden",
            }}
        >
            {sorted.map((node, i) => (
                <TreeNode key={`${node.name}-${i}`} node={node} depth={0} />
            ))}
        </div>
    );
}
