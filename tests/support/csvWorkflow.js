import { cp, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// Offline equivalent of installing the exact declared parser: copy only the
// dependency already installed by normal project setup into an isolated export.
export async function installCsvParser(dir) {
  const require = createRequire(import.meta.url);
  const source = dirname(require.resolve("papaparse/package.json"));
  await mkdir(join(dir, "node_modules"), { recursive: true });
  await cp(source, join(dir, "node_modules/papaparse"), { recursive: true });
}

export async function writeWorkflow(dir, files) {
  for (const file of files) await writeFile(join(dir, file.name), file.text);
  await installCsvParser(dir);
}
