// Serves the static export in out/ at /sundial/, the way SiteGround serves it under
// glorious.works, so Playwright tests the files that ship. Usage: node e2e/serve.mjs [port]
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, sep } from "node:path";

const ROOT = join(import.meta.dirname, "..", "out");
const BASE = "/sundial";
const port = Number(process.argv[2] ?? 3218);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
  if (path === BASE) {
    res.writeHead(301, { Location: `${BASE}/` }).end();
    return;
  }
  if (!path.startsWith(`${BASE}/`)) {
    res.writeHead(404).end("Not found");
    return;
  }
  let file = normalize(join(ROOT, path.slice(BASE.length)));
  if (!file.startsWith(ROOT + sep) && file !== ROOT) {
    res.writeHead(403).end();
    return;
  }
  try {
    if (statSync(file).isDirectory()) file = join(file, "index.html");
    statSync(file);
  } catch {
    res.writeHead(404).end("Not found");
    return;
  }
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`Serving out/ at http://localhost:${port}${BASE}/`));
