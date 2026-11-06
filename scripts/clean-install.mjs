import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const target = fs.mkdtempSync(path.join(os.tmpdir(), "sea-train-clean-"));
try {
  const listed = spawnSync("git", ["ls-files", "-z"], { encoding: "utf8" });
  if (listed.status !== 0) throw new Error("A Git checkout is required.");
  for (const file of listed.stdout.split("\0").filter(Boolean)) {
    if (!fs.existsSync(file)) continue;
    const dest = path.join(target, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(file, dest);
  }
  for (const args of [
    ["ci", "--ignore-scripts", "--no-audit", "--no-fund"],
    ["run", "build"],
    ["test"],
  ]) {
    const result = spawnSync("npm", args, {
      cwd: target,
      stdio: "inherit",
      timeout: 120_000,
    });
    if (result.status !== 0)
      throw new Error(`Clean check failed: npm ${args.join(" ")}`);
  }
  console.log("Clean checkout install, build and unit/protocol checks passed.");
} finally {
  fs.rmSync(target, { recursive: true, force: true });
}
