#!/usr/bin/env node

import { spawn } from "node:child_process";
import fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";
import { APP_IDS, DEFAULT_APPS_ROOT, getApps } from "./apps.mjs";
import { runChecks } from "./lib/checks.mjs";
import { startStaticServer } from "./lib/server.mjs";

function parseArgs(argv) {
  const args = {
    appIds: [],
    appsRoot: DEFAULT_APPS_ROOT,
    artifactsDir: path.resolve(process.cwd(), "artifacts"),
    build: false,
    cwdOverride: null,
    headed: false,
    list: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--build") args.build = true;
    else if (arg === "--headed") args.headed = true;
    else if (arg === "--list") args.list = true;
    else if (arg === "--apps-root") args.appsRoot = path.resolve(argv[index + 1]), (index += 1);
    else if (arg === "--artifacts-dir") args.artifactsDir = path.resolve(argv[index + 1]), (index += 1);
    else if (arg === "--cwd") args.cwdOverride = path.resolve(argv[index + 1]), (index += 1);
    else if (arg === "--app") args.appIds.push(argv[index + 1]), (index += 1);
    else if (arg === "all") args.appIds = [...APP_IDS];
    else args.appIds.push(arg);
  }

  if (!args.appIds.length && !args.list) args.appIds = [...APP_IDS];
  return args;
}

function log(message = "") {
  process.stdout.write(`${message}\n`);
}

function sanitizeSegment(value) {
  return String(value)
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "route";
}

async function writeFailureArtifacts({ appId, artifactsDir, routePath, page }) {
  const routeDir = path.join(artifactsDir, sanitizeSegment(appId), sanitizeSegment(routePath));
  await fsp.mkdir(routeDir, { recursive: true });

  const screenshotPath = path.join(routeDir, "failure.png");
  const htmlPath = path.join(routeDir, "page.html");
  const accessibilityPath = path.join(routeDir, "accessibility.json");

  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
  await fsp.writeFile(htmlPath, await page.content(), "utf8").catch(() => {});

  const accessibilityTree = await page.accessibility.snapshot({ interestingOnly: false }).catch(() => null);
  if (accessibilityTree) {
    await fsp.writeFile(accessibilityPath, JSON.stringify(accessibilityTree, null, 2), "utf8").catch(() => {});
  }

  return { accessibilityPath, htmlPath, routeDir, screenshotPath };
}

async function runCommand(command, cwd) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      env: process.env,
      shell: true,
      stdio: "inherit",
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed (${code}): ${command}`));
    });
    child.on("error", reject);
  });
}

async function runApp(browser, app, options) {
  log(`\n[${app.id}]`);

  if (options.build && app.buildCommand) {
    log(`  building: ${app.buildCommand}`);
    await runCommand(app.buildCommand, app.cwd);
  }

  if (app.serve.kind !== "static") {
    throw new Error(`Unsupported serve kind for ${app.id}: ${app.serve.kind}`);
  }

  const server = await startStaticServer({
    cwd: app.cwd,
    rootDir: app.serve.rootDir,
    mounts: app.serve.mounts || [],
  });

  const context = await browser.newContext();
  const page = await context.newPage();
  const failures = [];

  try {
    for (const route of app.routes) {
      const url = new URL(route.path, `${server.baseUrl}/`).toString();
      log(`  route: ${route.path}`);
      let routeFailures = [];
      try {
        await page.goto(url, { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("load").catch(() => {});
        await page.waitForTimeout(250);
        routeFailures = await runChecks(page, route.checks);
      } catch (error) {
        routeFailures = [`navigation failed: ${error.message}`];
      }

      if (routeFailures.length) {
        const artifactPaths = await writeFailureArtifacts({
          appId: app.id,
          artifactsDir: options.artifactsDir,
          routePath: route.path,
          page,
        });
        failures.push({ path: route.path, messages: routeFailures, artifactPaths });
        for (const message of routeFailures) {
          log(`    x ${message}`);
        }
        log(`    artifacts: ${artifactPaths.routeDir}`);
      } else {
        log("    ok");
      }
    }
  } finally {
    await context.close();
    await server.stop();
  }

  return failures;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const allApps = getApps({ appsRoot: args.appsRoot });

  if (args.list) {
    log(APP_IDS.join("\n"));
    return;
  }

  const apps = allApps.filter((app) => args.appIds.includes(app.id));
  const unknown = args.appIds.filter((id) => !APP_IDS.includes(id));
  if (unknown.length) {
    throw new Error(`Unknown app ids: ${unknown.join(", ")}`);
  }
  if (args.cwdOverride) {
    if (apps.length !== 1) {
      throw new Error("--cwd can only be used when running exactly one app.");
    }
    apps[0] = { ...apps[0], cwd: args.cwdOverride };
  }
  const browser = await chromium.launch({ headless: !args.headed });
  let failed = false;

  try {
    for (const app of apps) {
      const failures = await runApp(browser, app, args);
      if (failures.length) {
        failed = true;
      }
    }
  } finally {
    await browser.close();
  }

  if (failed) {
    process.exitCode = 1;
    log(`\nSmoke checks failed. Artifacts written to ${args.artifactsDir}`);
  } else {
    log("\nSmoke checks passed.");
  }
}

main().catch((error) => {
  process.exitCode = 1;
  log(`\nSmoke checks failed with an error:\n${error.stack || error.message}`);
});
