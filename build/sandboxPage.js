// Builds sandbox.html: the page that hosts learner code execution.
// Used by the Vite plugin (dev server and production build) and by tests.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const sandboxDir = fileURLToPath(new URL("../src/runner/sandbox/", import.meta.url));

// Make a JS string literal that is also safe inside an HTML <script> element.
function scriptSafeStringLiteral(text) {
  return JSON.stringify(text)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function sandboxScript() {
  const workerSource = readFileSync(sandboxDir + "worker.js", "utf8");
  const hostSource = readFileSync(sandboxDir + "host.js", "utf8");
  if (/<\/script/i.test(hostSource)) throw new Error("host.js must not contain a closing script tag");
  return `const WORKER_SOURCE = ${scriptSafeStringLiteral(workerSource)};\n${hostSource}`;
}

export function sandboxCsp(script = sandboxScript()) {
  const hash = createHash("sha256").update(script, "utf8").digest("base64");
  return [
    "default-src 'none'",
    // Only the inline host script may run, plus code evaluation inside this
    // frame's workers. Nothing is loaded from the network.
    `script-src 'sha256-${hash}' 'unsafe-eval'`,
    "worker-src blob:",
    "connect-src 'none'",
    "img-src 'none'",
    "style-src 'none'",
    "font-src 'none'",
    "media-src 'none'",
    "object-src 'none'",
    "frame-src 'none'",
    "manifest-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
}

export function buildSandboxHtml() {
  const script = sandboxScript();
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${sandboxCsp(script)}">
<meta name="referrer" content="no-referrer">
<title>Data Detective code runner</title>
</head>
<body>
<script>${script}</script>
</body>
</html>
`;
}

// Content Security Policy for the main app page (production build only;
// the Vite dev server needs inline scripts for hot reloading).
export const appCsp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'self'",
  "worker-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

export function sandboxPagePlugin() {
  return {
    name: "data-detective-sandbox-page",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url || "").split("?")[0];
        if (!path.endsWith("/sandbox.html")) return next();
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.end(buildSandboxHtml());
      });
    },
    buildStart() {
      this.addWatchFile(sandboxDir + "worker.js");
      this.addWatchFile(sandboxDir + "host.js");
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "sandbox.html", source: buildSandboxHtml() });
    },
    transformIndexHtml: {
      order: "pre",
      handler(html, ctx) {
        if (ctx.server) return html; // dev server: no CSP
        if (!html.includes('<meta charset="UTF-8" />')) throw new Error("index.html: charset meta not found for CSP");
        return html.replace(
          '<meta charset="UTF-8" />',
          `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${appCsp}" />`,
        );
      },
    },
  };
}
