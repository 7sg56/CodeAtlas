# CodeAtlas AST Analysis Engine

The AST analysis engine operates on top of [Tree-sitter](https://tree-sitter.github.io/tree-sitter/) to parse source code into robust Abstract Syntax Trees. It is designed to extract deep structural information from repositories to power code visualizations and insights.

## Core Capabilities

The engine exposes specific **extractors** that walk the AST to query meaningful information:

- **Routes**: Discovers HTTP API endpoints across various web frameworks (e.g., Express, FastAPI, NestJS, Spring Boot), capturing method, path, and precise line numbers.
- **Entrypoints**: Identifies bootstrap scripts and application entry points (e.g., `app.listen()`, `func main()`, `if __name__ == "__main__":`).
- **Dependencies (Imports)**: Maps local file-to-file module imports to understand codebase architecture and module coupling.
- **Frameworks**: Detects framework usage by actively analyzing `import` and `require` statements in the code, rather than solely depending on configuration files (`package.json`, `requirements.txt`).
- **Symbols (WIP)**: Extracts functions, classes, and exported symbols.
- **Complexity (WIP)**: Measures per-function and file-level cyclomatic complexity and nesting depth.

## Language Support

The engine currently supports the following **7 languages** via dedicated tree-sitter grammars:

| Language | Ext | Notes |
|----------|-----|-------|
| **JavaScript** | `.js`, `.jsx`, `.mjs`, `.cjs` | ES6+, React, CommonJS |
| **TypeScript** | `.ts`, `.tsx` | Types, Decorators, TSX |
| **Python** | `.py` | Web frameworks, Scripts |
| **Go** | `.go` | Packages, Gin, Fiber |
| **Rust** | `.rs` | Actix, Axum, Rocket |
| **Java** | `.java` | Spring Boot, generic classes |
| **Ruby** | `.rb` | Rails, Sinatra |

## Architecture

The system is highly modular:
- `engine.js` - Handles grammar initialization, file reading, and coordinates the tree-sitter parsers.
- `analyzer.js` - The main orchestrator. It walks a repository, dispatches files to the parser, applies all extractors, and aggregates the results into a unified analysis object.
- `extractors/` - Individual query modules focused on extracting specific insights from the `tree` object.
