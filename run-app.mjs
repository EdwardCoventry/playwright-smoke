#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const [, , appId, ...rest] = process.argv;

if (!appId) {
  process.stderr.write("Usage: node run-app.mjs <app-id> [--build] [additional args]\n");
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const runScript = path.join(scriptDir, "run.mjs");
const child = spawn(process.execPath, [runScript, "--app", appId, ...rest], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});

child.on("error", (error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
