# CodeAtlas API Documentation

This document outlines the available API endpoints for the CodeAtlas backend, their functionality, and where they are located in the codebase. This is intended for developers who are joining the project or need to debug the analysis pipeline.

## Project Overview

CodeAtlas is a repository intelligence engine that visualizes codebase architecture.
- **Backend**: Node.js / Express
- **Frontend**: Next.js (App Router)
- **Intelligence**: Unified AST Analysis + Semantic Graph + AI Reasoning (Groq)
- **Persistence**: AWS (S3 for analysis JSON, DynamoDB for metadata) - *Optional*

## Core Intelligence Pipeline

When a repository is analyzed (via `POST /analyze` or `POST /analyze/upload`), it goes through the following stages:

1. **Extraction**: `simple-git` clones the repo, or `adm-zip` extracts an upload.
2. **Scanning**: `utils/scanner.js` builds a file tree and detects basic metadata.
3. **AST Analysis**: `utils/ast/analyzer.js` parses source files to identify components (routers, controllers, etc.), exports/imports, and complexity.
4. **AI Reasoning**: `utils/ai/groq.js` uses Groq LLMs to synthesize a high-level architectural explanation.
5. **Storage**: `utils/storage/aws.js` optionally persists results to AWS.

---

## Environment Configuration

Copy `.env.example` to `.env` to configure the system. Key variables:

- `GROQ_API_KEY`: Required for AI architectural reasoning.
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`: Required for AWS persistence.
- `S3_BUCKET_NAME`: Target bucket for analysis results.
- `DYNAMODB_TABLE_NAME`: Target table for repository metadata.

---

## Base URL
All API requests should be prefixed with:
- Local: `http://localhost:5001/api`
- Production: `https://codeatlas-production.up.railway.app/api`

---

## 1. Analysis Endpoints

These endpoints are responsible for the core repository analysis pipeline.

### `POST /analyze`
- **Description**: Clones a remote repository (from GitHub or other Git providers), runs the AST analysis engine, generates architectural reasoning using AI, and caches the result.
- **Route File**: `backend/routes/analyze.js`
- **Handler**: `analyzeRepository` in `backend/controllers/analyzeController.js`
- **Payload**:
  ```json
  {
    "githubUrl": "https://github.com/user/repo"
  }
  ```
- **Note**: This endpoint has a rate limit applied (10 requests per 15 minutes).

### `POST /analyze/upload`
- **Description**: Accepts a `.zip` file upload containing a repository. Extracts, analyzes, and returns the result without cloning from Git.
- **Route File**: `backend/routes/upload.js`
- **Handler**: Inline in `backend/routes/upload.js`
- **Constraints**: Max file size 200MB. Only `.zip` files are accepted.

---

## 2. Export Endpoints

Used to generate human-readable reports from analysis data.

### `POST /export`
- **Description**: Takes the raw JSON analysis result and returns a formatted Markdown report as a downloadable file.
- **Route File**: `backend/routes/export.js`
- **Handler**: Inline in `backend/routes/export.js` (uses `generateMarkdown` helper function).
- **Format**: Returns `text/markdown` with `Content-Disposition: attachment`.

---

## 3. Cache Management

Handles the in-memory cache and cleanup of temporary repository clones.

### `GET /cache`
- **Description**: Returns the number of repositories currently held in the in-memory analysis cache.
- **Route File**: `backend/routes/cache.js`
- **Handler**: Inline in `backend/routes/cache.js`.

### `DELETE /cache`
- **Description**: Flushes the entire in-memory analysis cache and deletes all temporarily cloned repositories from the server's disk.
- **Route File**: `backend/routes/cache.js`
- **Handler**: Inline in `backend/routes/cache.js`.

---

## Project Structure (Backend)

For reference, the backend is structured as follows:

- `index.js`: Main entry point, registers routes and middleware.
- `routes/`: Express router definitions.
- `controllers/`: Request handling logic (controllers).
- `utils/`: Core logic and helper functions.
  - `utils/ast/`: The AST analysis engine.
  - `utils/ai/`: Integration with AI models (e.g., Groq).
  - `utils/repoCache.js`: Logic for managing cloned repos and memory cache.
  - `utils/scanner.js`: Filesystem scanning and metadata extraction.

## Adding New Endpoints

1. Create a new route file in `backend/routes/` (or update an existing one).
2. (Optional but recommended) Implement the logic in a controller within `backend/controllers/`.
3. Register the new route in `backend/index.js` using `app.use('/api/your-path', yourRoute)`.
