// SPDX-FileCopyrightText: 2026 Mohammad Allatayfeh
// SPDX-License-Identifier: MPL-2.0

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repository = resolve(import.meta.dirname, "..");
const workspace = await mkdtemp(resolve(tmpdir(), "hierarchyguard-action-"));

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
        INPUT_BASELINE: "",
        "INPUT_FAIL-ON": "",
        "INPUT_GATE-MODE": "all",
        "INPUT_MAX-ANNOTATIONS": "50",
        "INPUT_OUTPUT-DIR": "reports",
        "INPUT_PUBLISH-DETAILS": "false",
      },
    },
  );

  const processText = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (result.status !== 1) throw new Error(`Expected warning gate exit 1, received ${result.status}.\n${processText}`);
  if (processText.includes("HIERARCHYGUARD_NETWORK_EGRESS_BLOCKED")) {
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

  const regressionOutputPath = resolve(workspace, "github-regression-output.txt");
  const regressionSummaryPath = resolve(workspace, "github-regression-summary.md");
  await writeFile(regressionOutputPath, "", { mode: 0o600 });
  await writeFile(regressionSummaryPath, "", { mode: 0o600 });
  const regression = spawnSync(
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
        GITHUB_OUTPUT: regressionOutputPath,
        GITHUB_STEP_SUMMARY: regressionSummaryPath,
        GITHUB_WORKSPACE: workspace,
        INPUT_CONFIG: "config.json",
        INPUT_FILES: "",
        INPUT_BASELINE: "reports/results.json",
        "INPUT_FAIL-ON": "",
        "INPUT_GATE-MODE": "new",
        "INPUT_MAX-ANNOTATIONS": "50",
        "INPUT_OUTPUT-DIR": "regression-reports",
        "INPUT_PUBLISH-DETAILS": "false",
      },
    },
  );
  const regressionText = `${regression.stdout ?? ""}\n${regression.stderr ?? ""}`;
  if (regression.status !== 0) {
    throw new Error(`Expected unchanged baseline gate exit 0, received ${regression.status}.\n${regressionText}`);
  }
  if (regressionText.includes("HIERARCHYGUARD_NETWORK_EGRESS_BLOCKED")) {
    throw new Error(`The baseline Action attempted a blocked egress or subprocess operation.\n${regressionText}`);
  }
  const regressionOutput = await readFile(regressionOutputPath, "utf8");
  if (!/new-count<<[^\r\n]+\r?\n0\r?\n/.test(regressionOutput)) {
    throw new Error("The Action did not emit a zero new-count output for an unchanged baseline.");
  }
  if (!/resolved-count<<[^\r\n]+\r?\n0\r?\n/.test(regressionOutput)) {
    throw new Error("The Action did not emit a zero resolved-count output for an unchanged baseline.");
  }
  if (!/unchanged-count<<[^\r\n]+\r?\n1\r?\n/.test(regressionOutput)) {
    throw new Error("The Action did not emit the unchanged-count output for the baseline finding.");
  }

  await writeFile(
    resolve(workspace, "tree.csv"),
    "asset_id,parent_asset_id,name,path,level\nROOT,,Root ,,\nA,ROOT,@Formula,,\n",
    { encoding: "utf8", mode: 0o600 },
  );
  const annotationOutputPath = resolve(workspace, "github-annotation-output.txt");
  const annotationSummaryPath = resolve(workspace, "github-annotation-summary.md");
  await writeFile(annotationOutputPath, "", { mode: 0o600 });
  await writeFile(annotationSummaryPath, "", { mode: 0o600 });
  const annotatedRegression = spawnSync(
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
        GITHUB_OUTPUT: annotationOutputPath,
        GITHUB_STEP_SUMMARY: annotationSummaryPath,
        GITHUB_WORKSPACE: workspace,
        INPUT_CONFIG: "config.json",
        INPUT_FILES: "",
        INPUT_BASELINE: "reports/results.json",
        "INPUT_FAIL-ON": "",
        "INPUT_GATE-MODE": "new",
        "INPUT_MAX-ANNOTATIONS": "50",
        "INPUT_OUTPUT-DIR": "annotated-regression-reports",
        "INPUT_PUBLISH-DETAILS": "true",
      },
    },
  );
  const annotatedText = `${annotatedRegression.stdout ?? ""}\n${annotatedRegression.stderr ?? ""}`;
  if (annotatedRegression.status !== 1) {
    throw new Error(`Expected annotated new-finding gate exit 1, received ${annotatedRegression.status}.\n${annotatedText}`);
  }
  if (annotatedText.includes("HIERARCHYGUARD_NETWORK_EGRESS_BLOCKED")) {
    throw new Error(`The annotated baseline Action attempted a blocked egress or subprocess operation.\n${annotatedText}`);
  }
  if (!annotatedText.includes("may execute as a spreadsheet formula")) {
    throw new Error("The Action did not annotate the new baseline regression.");
  }
  if (annotatedText.includes("leading or trailing whitespace")) {
    throw new Error("The Action annotated an unchanged legacy finding in new-only mode.");
  }
  const annotatedReport = JSON.parse(
    await readFile(resolve(workspace, "annotated-regression-reports", "results.json"), "utf8"),
  );
  const statuses = annotatedReport.findings.map((finding) => finding.baseline_status).sort();
  if (JSON.stringify(statuses) !== JSON.stringify(["new", "unchanged"])) {
    throw new Error(`The Action report did not preserve per-finding baseline status: ${statuses.join(", ")}`);
  }
  const annotatedLocalSummary = await readFile(
    resolve(workspace, "annotated-regression-reports", "summary.md"),
    "utf8",
  );
  if (annotatedLocalSummary.indexOf("| NEW |") >= annotatedLocalSummary.indexOf("| UNCHANGED |")) {
    throw new Error("The Action report did not prioritize the new finding ahead of unchanged legacy findings.");
  }
  process.stdout.write(
    "Action config precedence, baseline gating, new-only annotations, redaction, and no-egress smoke test passed.\n",
  );
} finally {
  await rm(workspace, { force: true, recursive: true });
}
