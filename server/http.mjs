import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function finish(res, code, text, extra = {}) {
  res.writeHead(code, {
    "Content-Type": "text/plain; charset=utf-8",
    ...extra,
  });
  res.end(text);
}

export async function serveApp(req, res, { clientCount = 0 } = {}) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (!["GET", "HEAD"].includes(req.method))
    return finish(res, 405, "Method not allowed", { Allow: "GET, HEAD" });
  let pathname;
  try {
    pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
  } catch {
    return finish(res, 400, "Invalid path");
  }
  if (pathname.includes("\0") || pathname.includes("\\"))
    return finish(res, 400, "Invalid path");
  if (pathname === "/healthz") {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    return res.end(
      req.method === "HEAD"
        ? undefined
        : JSON.stringify({ status: "ok", clients: clientCount }),
    );
  }
  const root = resolve(process.env.STATIC_DIR || "dist");
  const file = resolve(
    root,
    "." + (pathname === "/" ? "/index.html" : pathname),
  );
  if (file !== root && !file.startsWith(root + sep))
    return finish(res, 403, "Forbidden");
  try {
    const info = await stat(file);
    if (!info.isFile()) return finish(res, 404, "Not found");
    const etag = `"${info.size}-${Math.trunc(info.mtimeMs)}"`;
    const headers = {
      "Content-Type": types[extname(file)] || "application/octet-stream",
      "Cache-Control": pathname.startsWith("/assets/")
        ? "public, max-age=31536000, immutable"
        : "no-cache",
      ETag: etag,
    };
    if (req.headers["if-none-match"] === etag) {
      res.writeHead(304, headers);
      return res.end();
    }
    res.writeHead(200, { ...headers, "Content-Length": info.size });
    if (req.method === "HEAD") return res.end();
    const stream = createReadStream(file);
    stream.on("error", () => res.destroy());
    stream.pipe(res);
  } catch {
    finish(res, 404, "Not found");
  }
}
