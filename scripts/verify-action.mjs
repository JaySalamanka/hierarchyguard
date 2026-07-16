// SPDX-FileCopyrightText: 2026 Mohammad Allatayfeh
// SPDX-License-Identifier: MPL-2.0

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repository = resolve(import.meta.dirname, "..");
const workspace = await mkdtemp(resolve(tmpdir(), "assettree-ci-action-"));

try {
  await writeFile(
    resolve(workspace, "tree.csv"),
    "asset_id,parent_asset_id,name,path,level\nROOT,,Root ,,\n",
    { encoding: "utf8", mode: 0o600 },
  );
  await writeFile(
    resolve(workspace, "config.json"),
    `${JSON.stringify({ version: 1, files: ["tree.csv"], gate: { failOn: "warning" } })}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  const outputPath = resolve(workspace, "github-output.txt");
  const summaryPath = resolve(workspace, "github-summary.md");
  await writeFile(outputPath, "", { mode: 0o600 });
  await writeFile(summaryPath, "", { mode: 0o600 });

  const result = spawnSync(
    process.execPath,
    [
      "--import",
      pathToFileURL(resolve(repository, "scripts", "deny-network.mjs")).href,
      resolve(repository, "dist", "action", "index.js"),
    ],
    {
      cwd: workspace,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_OUTPUT: outputPath,
        GITHUB_STEP_SUMMARY: summaryPath,
        GITHUB_WORKSPACE: workspace,
        INPUT_CONFIG: "config.json",
        INPUT_FILES: "",
        "INPUT_FAIL-ON": "",
        "INPUT_MAX-ANNOTATIONS": "50",
        "INPUT_OUTPUT-DIR": "reports",
        "INPUT_PUBLISH-DETAILS": "false",
      },
    },
  );

  const processText = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (result.status !== 1) throw new Error(`Expected warning gate exit 1, received ${result.status}.\n${processText}`);
  if (processText.includes("ASSETTREE_NETWORK_EGRESS_BLOCKED")) {
    throw new Error(`The Action attempted a blocked egress or subprocess operation.\n${processText}`);
  }

  const reportPath = resolve(workspace, "reports", "results.json");
  if (!existsSync(reportPath)) throw new Error(`The Action did not create its report.\n${processText}`);
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  if (report.summary.passed !== false || report.summary.warnings !== 1) {
    throw new Error("The Action did not honor config-only file and warning-gate settings.");
  }
  const output = await readFile(outputPath, "utf8");
  if (!output.includes("passed") || !output.includes("false")) throw new Error("The Action did not emit a failed passed output.");

  const githubSummary = await readFile(summaryPath, "utf8");
  if (githubSummary.includes("tree.csv") || githubSummary.includes("ATC012")) {
    throw new Error("The default GitHub summary exposed detailed finding data.");
  }
  if (!githubSummary.includes("were not published to GitHub")) throw new Error("The default GitHub summary lacks its privacy notice.");

  const localSummary = await readFile(resolve(workspace, "reports", "summary.md"), "utf8");
  if (!localSummary.includes("tree.csv") || !localSummary.includes("ATC012")) {
    throw new Error("The detailed runner-local Markdown report is incomplete.");
  }
  process.stdout.write("Action config precedence, redaction, and no-egress smoke test passed.\n");
} finally {
  await rm(workspace, { force: true, recursive: true });
}
