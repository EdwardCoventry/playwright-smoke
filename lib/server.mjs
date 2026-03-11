import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import path from "node:path";

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

function normalizePrefix(prefix) {
  if (!prefix || prefix === "/") return "/";
  const trimmed = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function contentTypeFor(filePath) {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

async function fileExists(filePath) {
  try {
    const stat = await fsp.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function directoryExists(filePath) {
  try {
    const stat = await fsp.stat(filePath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function resolveStaticPath(rootDir, requestPath) {
  const unsafePath = decodeURIComponent(requestPath.split("?")[0]);
  const normalized = unsafePath.replace(/^\/+/, "");
  const absolute = path.resolve(rootDir, normalized);
  const root = path.resolve(rootDir);

  if (!absolute.startsWith(root)) return null;

  if (await fileExists(absolute)) return absolute;

  if (await directoryExists(absolute)) {
    const indexPath = path.join(absolute, "index.html");
    if (await fileExists(indexPath)) return indexPath;
  }

  const htmlPath = `${absolute}.html`;
  if (await fileExists(htmlPath)) return htmlPath;

  return null;
}

function matchMount(mounts, pathname) {
  for (const mount of mounts) {
    const prefix = normalizePrefix(mount.urlPrefix);
    if (prefix === "/") return { ...mount, relativePath: pathname };
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      const relativePath = pathname.slice(prefix.length) || "/";
      return { ...mount, relativePath };
    }
  }
  return null;
}

export async function getAvailablePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
    });
  });
}

export async function startStaticServer({ cwd, rootDir, mounts = [] }) {
  const resolvedRoot = path.resolve(cwd, rootDir);
  const resolvedMounts = mounts
    .map((mount) => ({
    urlPrefix: mount.urlPrefix,
    dir: path.resolve(cwd, mount.dir),
    }))
    .sort((left, right) => normalizePrefix(right.urlPrefix).length - normalizePrefix(left.urlPrefix).length);
  const port = await getAvailablePort();

  const server = http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url || "/", "http://127.0.0.1");
      const mount = matchMount(
        [...resolvedMounts, { urlPrefix: "/", dir: resolvedRoot }],
        requestUrl.pathname,
      );

      if (!mount) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const filePath = await resolveStaticPath(mount.dir, mount.relativePath);
      if (!filePath) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      res.writeHead(200, { "Content-Type": contentTypeFor(filePath) });
      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      res.writeHead(500);
      res.end(String(error));
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    async stop() {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    },
  };
}
