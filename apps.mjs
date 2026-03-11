import path from "node:path";

export const DEFAULT_APPS_ROOT =
  process.env.PLAYWRIGHT_SMOKE_APPS_ROOT || "C:\\Users\\Edward\\Code\\edwardcoventry-apps";

const app = (id, config) => ({
  id,
  name: id,
  ...config,
  relativeCwd: id,
});

const APP_DEFINITIONS = [
  app("bot.edwardcoventry.com", {
    buildCommand: "npm run build",
    serve: { kind: "static", rootDir: "dist" },
    routes: [
      {
        path: "/verify/",
        checks: [
          { kind: "roleCount", role: "main", exactly: 1 },
          { kind: "roleCount", role: "heading", level: 1, min: 1 },
          {
            kind: "role",
            role: "heading",
            level: 1,
            name: "Verify you are a bot by completing the action below.",
          },
          { kind: "role", role: "navigation", name: "Primary" },
        ],
      },
      {
        path: "/events/",
        checks: [
          { kind: "roleCount", role: "main", exactly: 1 },
          { kind: "role", role: "heading", level: 1, name: "Bot events" },
          { kind: "roleCount", role: "status", min: 1 },
        ],
      },
    ],
  }),
  app("dark-mode-color-palette-generator", {
    buildCommand: "npm run build",
    serve: { kind: "static", rootDir: "dist" },
    routes: [
      {
        path: "/color-palette-generator.html",
        checks: [
          { kind: "roleCount", role: "main", exactly: 1 },
          { kind: "role", role: "heading", level: 1, name: "Color Palette Generator" },
          { kind: "role", role: "button", name: "Generate a new color palette" },
        ],
      },
    ],
  }),
  app("edbot.edwardcoventry.com", {
    serve: { kind: "static", rootDir: "." },
    routes: [
      {
        path: "/",
        checks: [
          { kind: "roleCount", role: "main", exactly: 1 },
          { kind: "role", role: "heading", level: 1, name: "Message Edbot" },
          { kind: "role", role: "navigation", name: "Primary" },
        ],
      },
    ],
  }),
  app("recipe-app", {
    buildCommand: "npm run ui:build",
    serve: { kind: "static", rootDir: "packages/ui/dist" },
    routes: [
      {
        path: "/",
        checks: [
          { kind: "roleCount", role: "main", exactly: 1 },
          { kind: "roleCount", role: "heading", level: 1, min: 1 },
          { kind: "label", name: "Recipe request" },
        ],
      },
    ],
  }),
  app("roses-are-red-violets-are-blue", {
    serve: { kind: "static", rootDir: "public" },
    routes: [
      {
        path: "/",
        checks: [
          { kind: "roleCount", role: "main", exactly: 1 },
          { kind: "role", role: "heading", level: 1, name: "Run me" },
          { kind: "label", name: "Input" },
          { kind: "roleCount", role: "status", min: 1 },
        ],
      },
    ],
  }),
  app("smartphone-dimensions", {
    buildCommand: "npm run build",
    serve: { kind: "static", rootDir: "dist" },
    routes: [
      {
        path: "/",
        checks: [
          { kind: "roleCount", role: "main", exactly: 1 },
          { kind: "role", role: "heading", level: 1, name: "Foldable Display Explorer" },
          { kind: "label", name: "Folded diagonal slider" },
          { kind: "label", name: "Folded diagonal value" },
        ],
      },
    ],
  }),
  app("test-app-edward-coventry", {
    buildCommand: "npm run build",
    serve: { kind: "static", rootDir: "dist" },
    routes: [
      {
        path: "/",
        checks: [
          { kind: "roleCount", role: "main", exactly: 1 },
          { kind: "role", role: "heading", level: 1, name: "Quiz Layout Test App" },
          { kind: "label", name: "Single-line composer input" },
          { kind: "label", name: "Multi-line composer input" },
        ],
      },
    ],
  }),
  app("uk-political-compass", {
    buildCommand: "npm run build",
    serve: {
      kind: "static",
      rootDir: "dist",
      mounts: [{ urlPrefix: "/apps/uk-political-compass", dir: "dist" }],
    },
    routes: [
      {
        path: "/",
        checks: [
          { kind: "roleCount", role: "main", exactly: 1 },
          {
            kind: "role",
            role: "heading",
            level: 1,
            nameRegex: "^UK Politics Compass \\d{4}$",
          },
          { kind: "role", role: "heading", level: 2, name: "Questions" },
          { kind: "role", role: "button", name: "Show My Position" },
        ],
      },
    ],
  }),
  app("water-calculator", {
    buildCommand: "npm run build",
    serve: {
      kind: "static",
      rootDir: "dist",
      mounts: [{ urlPrefix: "/apps/water-calculator", dir: "dist" }],
    },
    routes: [
      {
        path: "/apps/water-calculator/",
        checks: [
          { kind: "roleCount", role: "main", exactly: 1 },
          { kind: "role", role: "heading", level: 1, name: "Water Use Calculator" },
          { kind: "role", role: "heading", level: 2, name: "Configure your use" },
          { kind: "selector", selector: '[aria-label^="Show breakdown for "]' },
        ],
      },
    ],
  }),
  app("what-kind-of-are-you", {
    buildCommand: "npm run build",
    serve: { kind: "static", rootDir: "dist" },
    routes: [
      {
        path: "/",
        checks: [
          { kind: "roleCount", role: "main", exactly: 1 },
          { kind: "roleCount", role: "heading", level: 1, min: 1 },
          { kind: "label", name: "Quiz topic" },
        ],
      },
    ],
  }),
];

export const APP_IDS = APP_DEFINITIONS.map((appConfig) => appConfig.id);

export function getApps({ appsRoot = DEFAULT_APPS_ROOT } = {}) {
  return APP_DEFINITIONS.map((appConfig) => ({
    ...appConfig,
    cwd: path.join(appsRoot, appConfig.relativeCwd),
  }));
}
