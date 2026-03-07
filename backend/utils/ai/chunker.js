const fs = require("fs-extra");
const path = require("path");

/**
 * Code Chunking System
 * 
 * Breaks repository code into semantic chunks for AI analysis.
 * Prioritizes AST boundaries like functions and classes.
 */

/**
 * Chunks a repository's code.
 */
async function createChunks(repoPath, analysisResult) {
    const chunks = [];
    const { symbols } = analysisResult;

    for (const fileSymbols of symbols) {
        const filePath = path.join(repoPath, fileSymbols.file);
        let source;
        try {
            source = await fs.readFile(filePath, "utf-8");
        } catch (e) {
            continue;
        }

        const lines = source.split("\n");
        const fileChunks = [];

        const boundaries = [
            ...fileSymbols.functions.map(f => ({ ...f, type: "function" })),
            ...fileSymbols.classes.map(c => ({ ...c, type: "class" }))
        ].sort((a, b) => a.line - b.line);

        let lastLine = 0;

        if (boundaries.length === 0) {
            addFallbackChunks(fileChunks, fileSymbols.file, lines, 0, lines.length);
        } else {
            for (let i = 0; i < boundaries.length; i++) {
                const boundary = boundaries[i];

                // Handle gap before boundary
                if (boundary.line - 1 > lastLine) {
                    addFallbackChunks(fileChunks, fileSymbols.file, lines, lastLine, boundary.line - 1);
                }

                const startLine = boundary.line - 1;
                const nextBoundary = boundaries[i + 1];
                const nextStart = nextBoundary ? nextBoundary.line - 1 : lines.length;

                // Ensure chunk doesn't exceed 120 lines
                const endLine = Math.min(startLine + 120, nextStart);

                fileChunks.push({
                    file: fileSymbols.file,
                    symbol: boundary.name,
                    type: boundary.type,
                    startLine: startLine + 1,
                    endLine,
                    code: lines.slice(startLine, endLine).join("\n")
                });

                lastLine = endLine;
            }

            // Handle remaining lines
            if (lastLine < lines.length) {
                addFallbackChunks(fileChunks, fileSymbols.file, lines, lastLine, lines.length);
            }
        }

        chunks.push(...fileChunks);
    }

    return chunks;
}

function addFallbackChunks(chunks, file, lines, start, end) {
    let currentLine = start;
    while (currentLine < end) {
        const chunkEnd = Math.min(currentLine + 80, end);
        chunks.push({
            file,
            symbol: "none",
            type: "general",
            startLine: currentLine + 1,
            endLine: chunkEnd,
            code: lines.slice(currentLine, chunkEnd).join("\n")
        });
        currentLine = chunkEnd;
    }
}

module.exports = { createChunks };
