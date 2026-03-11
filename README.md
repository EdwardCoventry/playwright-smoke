# Playwright Smoke

Shared semantic smoke checks for the sites under `C:\Users\Edward\Code\edwardcoventry-apps`.

## Install

```powershell
npm install
```

## Usage

List configured apps:

```powershell
npm run smoke -- --list
```

Run all smoke checks against the current built/static outputs:

```powershell
npm run smoke
```

Rebuild apps that have a configured build command before running checks:

```powershell
npm run smoke:build
```

Run a single app:

```powershell
npm run smoke -- --app water-calculator
```

Run a single app from inside one of the app repos:

```powershell
node ..\..\scripts\playwright-smoke\run-app.mjs water-calculator --build
```

Run a checked-out app from an arbitrary directory, which is useful in CI:

```powershell
node run.mjs --app water-calculator --build --cwd C:\path\to\checked-out\water-calculator
```

Open the browser visibly:

```powershell
npm run smoke -- --headed --app uk-political-compass
```

Write failure artifacts somewhere custom:

```powershell
npm run smoke -- --artifacts-dir .\tmp\smoke-artifacts
```

## What It Checks

The shared manifest currently enforces a small Playwright-friendly baseline:

- exactly one `main` landmark on the tested route
- at least one level-1 heading
- app-specific role/label checks for the key controls we hardened
- a screenshot, HTML dump, and accessibility tree for any failing route

The manifest lives in [apps.mjs](./apps.mjs).

## CI Note

Repo-local wrapper scripts work today because these app repos sit next to `C:\Users\Edward\Code\scripts`.

If you want GitHub Actions or another remote CI system to run the same smoke suite, the shared runner needs to live in a checked-out repo or published package. A remote runner cannot see this local directory unless you explicitly provision it there.
