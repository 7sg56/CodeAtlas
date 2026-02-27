/**
 * Smoke test: verify tree-sitter loads and the engine can parse JS/TS/Python.
 * Run with: node utils/ast/smoke-test.js
 */

const { parseFile, isSupported } = require("./engine");
const { extractEntrypoints } = require("./extractors/entrypoints");
const { extractRoutes } = require("./extractors/routes");
const { extractFrameworks } = require("./extractors/frameworks");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

async function main() {
  const tmpDir = path.join(os.tmpdir(), "codeatlas-ast-test-" + Date.now());
  await fs.ensureDir(tmpDir);

  let passed = 0;
  let failed = 0;

  function assert(label, condition) {
    if (condition) {
      console.log(`  PASS: ${label}`);
      passed++;
    } else {
      console.log(`  FAIL: ${label}`);
      failed++;
    }
  }

  // -----------------------------------------------------------------------
  // Test 1: JS file with Express routes and app.listen
  // -----------------------------------------------------------------------
  console.log("\n--- Test 1: Express JS ---");
  const jsFile = path.join(tmpDir, "server.js");
  await fs.writeFile(jsFile, `
const express = require("express");
const app = express();

app.get("/api/users", (req, res) => {
  res.json([]);
});

app.post("/api/users", (req, res) => {
  res.json({ ok: true });
});

app.listen(3000, () => {
  console.log("running");
});
  `.trim());

  const jsResult = await parseFile(jsFile);
  assert("JS file parsed", jsResult !== null);
  assert("Language is javascript", jsResult.language === "javascript");

  const jsRoutes = extractRoutes({ ...jsResult, relativePath: "server.js" });
  assert("Found 2 routes", jsRoutes.length === 2);
  assert("GET /api/users detected", jsRoutes.some(r => r.method === "GET" && r.path === "/api/users"));
  assert("POST /api/users detected", jsRoutes.some(r => r.method === "POST" && r.path === "/api/users"));

  const jsEntrypoints = extractEntrypoints({ ...jsResult, relativePath: "server.js" });
  assert("Found app.listen entrypoint", jsEntrypoints.some(e => e.type === "server_bootstrap"));

  const jsFrameworks = extractFrameworks(jsResult);
  assert("Express detected via import", jsFrameworks.has("Express"));

  // -----------------------------------------------------------------------
  // Test 2: TypeScript NestJS controller
  // -----------------------------------------------------------------------
  console.log("\n--- Test 2: NestJS TypeScript ---");
  const tsFile = path.join(tmpDir, "users.controller.ts");
  await fs.writeFile(tsFile, `
import { Controller, Get, Post, Body } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()
  findAll() {
    return [];
  }

  @Post()
  create(@Body() body: any) {
    return body;
  }

  @Get(':id')
  findOne() {
    return {};
  }
}
  `.trim());

  const tsResult = await parseFile(tsFile);
  assert("TS file parsed", tsResult !== null);
  assert("Language is typescript", tsResult.language === "typescript");

  const tsRoutes = extractRoutes({ ...tsResult, relativePath: "users.controller.ts" });
  assert("Found NestJS routes", tsRoutes.length >= 3);
  assert("CONTROLLER prefix detected", tsRoutes.some(r => r.method === "CONTROLLER" && r.path === "users"));

  const tsFrameworks = extractFrameworks(tsResult);
  assert("NestJS detected via import", tsFrameworks.has("NestJS"));

  // -----------------------------------------------------------------------
  // Test 3: Python FastAPI
  // -----------------------------------------------------------------------
  console.log("\n--- Test 3: Python FastAPI ---");
  const pyFile = path.join(tmpDir, "main.py");
  await fs.writeFile(pyFile, `
from fastapi import FastAPI

app = FastAPI()

@app.get("/items")
def read_items():
    return []

@app.post("/items")
def create_item():
    return {"ok": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
  `.trim());

  const pyResult = await parseFile(pyFile);
  assert("Python file parsed", pyResult !== null);
  assert("Language is python", pyResult.language === "python");

  const pyRoutes = extractRoutes({ ...pyResult, relativePath: "main.py" });
  assert("Found 2 Python routes", pyRoutes.length === 2);
  assert("GET /items detected", pyRoutes.some(r => r.method === "GET" && r.path === "/items"));

  const pyEntrypoints = extractEntrypoints({ ...pyResult, relativePath: "main.py" });
  assert("Found __main__ guard", pyEntrypoints.some(e => e.type === "main_guard"));

  const pyFrameworks = extractFrameworks(pyResult);
  assert("FastAPI detected via import", pyFrameworks.has("FastAPI"));

  // -----------------------------------------------------------------------
  // Test 4: Extension support check
  // -----------------------------------------------------------------------
  console.log("\n--- Test 4: Extension support ---");
  assert(".js supported", isSupported(".js"));
  assert(".ts supported", isSupported(".ts"));
  assert(".tsx supported", isSupported(".tsx"));
  assert(".py supported", isSupported(".py"));
  assert(".go supported", isSupported(".go"));
  assert(".rs supported", isSupported(".rs"));
  assert(".java supported", isSupported(".java"));
  assert(".rb supported", isSupported(".rb"));
  assert(".css NOT supported", !isSupported(".css"));
  assert(".json NOT supported", !isSupported(".json"));

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

  // Cleanup
  await fs.remove(tmpDir);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});
