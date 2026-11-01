import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { appCsp, buildSandboxHtml } from "../../build/sandboxPage.js";

describe("sandbox.html", () => {
  const html = buildSandboxHtml();
  const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);

  it("has exactly one inline script, allowed by its hash", () => {
    expect(scripts).toHaveLength(1);
    const hash = createHash("sha256").update(scripts[0], "utf8").digest("base64");
    expect(csp).toContain(`'sha256-${hash}'`);
    expect(html).not.toMatch(/<script[^>]+src=/);
  });

  it("blocks network access and confines eval to the sandbox", () => {
    const directives = Object.fromEntries(csp.split(";").map((d) => d.trim().split(/\s+/)).map(([k, ...v]) => [k, v]));
    expect(directives["default-src"]).toEqual(["'none'"]);
    expect(directives["connect-src"]).toEqual(["'none'"]);
    expect(directives["worker-src"]).toEqual(["blob:"]);
    expect(directives["script-src"]).toContain("'unsafe-eval'");
    expect(directives["script-src"]).not.toContain("'unsafe-inline'");
    expect(directives["script-src"]).not.toContain("'self'");
    expect(directives["form-action"]).toEqual(["'none'"]);
  });

  it("the app page never allows eval", () => {
    expect(appCsp).not.toContain("unsafe-eval");
    expect(appCsp).not.toContain("unsafe-inline");
    expect(appCsp).toContain("frame-src 'self'");
  });

  it("host and worker are classic scripts with no imports", () => {
    for (const file of ["host.js", "worker.js"]) {
      const source = readFileSync(new URL(`../../src/runner/sandbox/${file}`, import.meta.url), "utf8");
      expect(source, file).not.toMatch(/^\s*(import|export)\s/m);
    }
  });
});
