// SPDX-FileCopyrightText: 2026 Mohammad Allatayfeh
// SPDX-License-Identifier: MPL-2.0

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const windows = process.platform === "win32";
const command = windows ? process.env.ComSpec || "cmd.exe" : "npm";
const arguments_ = windows
  ? ["/d", "/s", "/c", "npm.cmd pack --dry-run --json --ignore-scripts"]
  : ["pack", "--dry-run", "--json", "--ignore-scripts"];
const result = spawnSync(command, arguments_, { encoding: "utf8", shell: false });
if (result.status !== 0) {
  process.stderr.write(result.stderr || "npm pack inspection failed.\n");
  process.exitCode = 1;
} else {
  const payload = JSON.parse(result.stdout);
  const files = (payload[0]?.files?.map((item) => item.path) ?? []).sort();
  const manifest = JSON.parse(readFileSync(new URL("../release-allowlist.json", import.meta.url), "utf8"));
  const expected = [...manifest.packagePaths].sort();
  if (JSON.stringify(files) !== JSON.stringify(expected)) {
    const missing = expected.filter((path) => !files.includes(path));
    const unexpected = files.filter((path) => !expected.includes(path));
    process.stderr.write(`Package allowlist mismatch. Missing: ${missing.join(", ") || "none"}. Unexpected: ${unexpected.join(", ") || "none"}.\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(`Exact package allowlist passed (${files.length} files).\n`);
  }
}
