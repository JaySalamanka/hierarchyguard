// SPDX-FileCopyrightText: 2026 Mohammad Allatayfeh
// SPDX-License-Identifier: MPL-2.0

import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { open } from "node:fs/promises";
import { relative, resolve } from "node:path";

import { OperationalError } from "./errors";
import { normalizeRelativePath, rejectSymlinkPath, resolveInside } from "./security";
import {
  AssetTreeReport,
  BaselineComparison,
  FailOn,
  Finding,
  FindingCounts,
  GateMode,
  RULESET_VERSION,
  SEVERITY_ORDER,
  Severity,
  TOOL_NAME,
} from "./types";

export const BASELINE_MAX_BYTES = 10 * 1_024 * 1_024;

export interface LoadedBaseline {
  descriptor: NonNullable<BaselineComparison["baseline"]>;
  findings: ReadonlyMap<string, Severity>;
}

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new OperationalError(`${label} must be a JSON object.`);
  }
  return value as Record<string, unknown>;
}

function nonNegativeInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new OperationalError(`${label} must be a non-negative safe integer.`);
  }
  return value as number;
}

function requiredString(value: unknown, label: string, maximum = 256): string {
  if (typeof value !== "string" || !value || value.length > maximum) {
    throw new OperationalError(`${label} must be a non-empty string of at most ${maximum} characters.`);
  }
  return value;
}

function findingCounts(findings: Iterable<Pick<Finding, "severity">>): FindingCounts {
  const counts: FindingCounts = { total: 0, errors: 0, warnings: 0, notices: 0 };
  for (const finding of findings) {
    counts.total += 1;
    if (finding.severity === "error") counts.errors += 1;
    else if (finding.severity === "warning") counts.warnings += 1;
    else counts.notices += 1;
  }
  return counts;
}

function countsFromSeverityMap(findings: ReadonlyMap<string, Severity>, selected?: ReadonlySet<string>): FindingCounts {
  const values: Array<{ severity: Severity }> = [];
  for (const [fingerprint, severity] of findings) {
    if (!selected || selected.has(fingerprint)) values.push({ severity });
  }
  return findingCounts(values);
}

function validateBaseline(raw: unknown): { schemaVersion: string; toolVersion: string; findings: Map<string, Severity> } {
  const root = objectValue(raw, "Baseline result");
  const schemaVersion = requiredString(root.schema_version, "Baseline schema_version", 32);
  if (schemaVersion !== "1.0" && schemaVersion !== "1.1") {
    throw new OperationalError("Baseline schema_version must be 1.0 or 1.1.");
  }

  const tool = objectValue(root.tool, "Baseline tool");
  if (tool.name !== TOOL_NAME) throw new OperationalError(`Baseline tool.name must be ${TOOL_NAME}.`);
  const toolVersion = requiredString(tool.version, "Baseline tool.version", 128);
  if (tool.ruleset !== RULESET_VERSION) {
    throw new OperationalError(`Baseline ruleset must be ${RULESET_VERSION}.`);
  }

  const summary = objectValue(root.summary, "Baseline summary");
  const expected = {
    errors: nonNegativeInteger(summary.errors, "Baseline summary.errors"),
    warnings: nonNegativeInteger(summary.warnings, "Baseline summary.warnings"),
    notices: nonNegativeInteger(summary.notices, "Baseline summary.notices"),
  };
  if (nonNegativeInteger(summary.operational_errors, "Baseline summary.operational_errors") !== 0) {
    throw new OperationalError("Baseline result cannot contain operational errors.");
  }

  if (!Array.isArray(root.findings)) throw new OperationalError("Baseline findings must be an array.");
  const findings = new Map<string, Severity>();
  for (const [index, value] of root.findings.entries()) {
    const finding = objectValue(value, `Baseline finding ${index + 1}`);
    const ruleId = requiredString(finding.rule_id, `Baseline finding ${index + 1} rule_id`, 32);
    if (!/^ATC[0-9]{3}$/.test(ruleId)) {
      throw new OperationalError(`Baseline finding ${index + 1} has an invalid rule_id.`);
    }
    if (ruleId === "ATC999") {
      throw new OperationalError("Baseline finding details are truncated by ATC999; increase maxFindings and regenerate it.");
    }
    const fingerprint = requiredString(finding.fingerprint, `Baseline finding ${index + 1} fingerprint`, 80);
    if (!/^sha256:[a-f0-9]{64}$/.test(fingerprint)) {
      throw new OperationalError(`Baseline finding ${index + 1} has an invalid fingerprint.`);
    }
    if (finding.severity !== "error" && finding.severity !== "warning" && finding.severity !== "notice") {
      throw new OperationalError(`Baseline finding ${index + 1} has an invalid severity.`);
    }
    if (findings.has(fingerprint)) {
      throw new OperationalError(`Baseline contains a duplicate finding fingerprint: ${fingerprint}`);
    }
    findings.set(fingerprint, finding.severity);
  }

  const actual = countsFromSeverityMap(findings);
  if (
    actual.errors !== expected.errors
    || actual.warnings !== expected.warnings
    || actual.notices !== expected.notices
  ) {
    throw new OperationalError(
      "Baseline finding details are incomplete or inconsistent with its summary; increase maxFindings and regenerate it.",
    );
  }
  return { schemaVersion, toolVersion, findings };
}

function validateBaselinePath(value: string): string {
  if (
    !value
    || value !== value.trim()
    || value.length > 1_024
    || value.includes(":")
    || /[\u0000-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/.test(value)
  ) {
    throw new OperationalError(
      "Baseline path must be a trimmed relative path of at most 1024 printable characters without colon syntax.",
    );
  }
  return value;
}

export function parseGateMode(value: unknown, fallback: GateMode = "all"): GateMode {
  if (value === undefined || value === "") return fallback;
  if (value === "all" || value === "new") return value;
  throw new OperationalError("gate-mode must be all or new.");
}

export function qualityGateFails(errors: number, warnings: number, failOn: FailOn): boolean {
  if (failOn === "none") return false;
  if (failOn === "warning") return errors > 0 || warnings > 0;
  return errors > 0;
}

export async function loadBaseline(workspace: string, relativePath: string): Promise<LoadedBaseline> {
  const root = resolve(workspace);
  const requestedPath = validateBaselinePath(relativePath);
  const absolutePath = resolveInside(root, requestedPath, "Baseline path");
  await rejectSymlinkPath(root, absolutePath, "Baseline path");

  let handle: Awaited<ReturnType<typeof open>>;
  try {
    handle = await open(absolutePath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  } catch {
    throw new OperationalError(`Unable to read baseline result: ${requestedPath}`);
  }

  let bytes: Buffer;
  try {
    const stat = await handle.stat();
    if (!stat.isFile()) throw new OperationalError(`Baseline path is not a regular file: ${requestedPath}`);
    if (stat.size > BASELINE_MAX_BYTES) {
      throw new OperationalError(`Baseline result exceeds the ${BASELINE_MAX_BYTES}-byte limit: ${requestedPath}`);
    }
    bytes = await handle.readFile();
  } finally {
    await handle.close();
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new OperationalError(`Baseline result is not valid UTF-8: ${requestedPath}`);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    throw new OperationalError(`Baseline result is not valid JSON: ${requestedPath}`);
  }
  const validated = validateBaseline(raw);
  return {
    descriptor: {
      path: normalizeRelativePath(relative(root, absolutePath)),
      sha256: createHash("sha256").update(bytes).digest("hex"),
      schemaVersion: validated.schemaVersion,
      toolVersion: validated.toolVersion,
      ruleset: RULESET_VERSION,
    },
    findings: validated.findings,
  };
}

export function initialComparison(errors: number, warnings: number, notices: number): BaselineComparison {
  return {
    baseline: null,
    newFindings: { total: errors + warnings + notices, errors, warnings, notices },
    resolvedFindings: { total: 0, errors: 0, warnings: 0, notices: 0 },
    unchangedFindings: { total: 0, errors: 0, warnings: 0, notices: 0 },
  };
}

export function compareWithBaseline(report: AssetTreeReport, baseline: LoadedBaseline, mode: GateMode): AssetTreeReport {
  const expectedDetails = report.summary.errors + report.summary.warnings + report.summary.notices;
  if (report.findings.length !== expectedDetails || report.findings.some((finding) => finding.ruleId === "ATC999")) {
    throw new OperationalError(
      "Current finding details are incomplete; increase maxFindings before using baseline comparison.",
    );
  }

  const comparisonFingerprint = (finding: Finding): string => baseline.descriptor.schemaVersion === "1.0"
    ? finding.legacyFingerprintV1
    : finding.fingerprint;
  const current = new Map<string, Severity>();
  for (const finding of report.findings) {
    const fingerprint = comparisonFingerprint(finding);
    if (current.has(fingerprint)) {
      throw new OperationalError(`Current result contains a duplicate finding fingerprint: ${fingerprint}`);
    }
    current.set(fingerprint, finding.severity);
  }
  const newFingerprints = new Set(
    [...current].filter(([fingerprint, severity]) => {
      const baselineSeverity = baseline.findings.get(fingerprint);
      return baselineSeverity === undefined || SEVERITY_ORDER[severity] < SEVERITY_ORDER[baselineSeverity];
    }).map(([fingerprint]) => fingerprint),
  );
  const resolvedFingerprints = new Set([...baseline.findings.keys()].filter((fingerprint) => !current.has(fingerprint)));
  const unchangedFingerprints = new Set(
    [...current].filter(([fingerprint, severity]) => {
      const baselineSeverity = baseline.findings.get(fingerprint);
      return baselineSeverity !== undefined && SEVERITY_ORDER[severity] >= SEVERITY_ORDER[baselineSeverity];
    }).map(([fingerprint]) => fingerprint),
  );
  const comparison: BaselineComparison = {
    baseline: baseline.descriptor,
    newFindings: countsFromSeverityMap(current, newFingerprints),
    resolvedFindings: countsFromSeverityMap(baseline.findings, resolvedFingerprints),
    unchangedFindings: countsFromSeverityMap(current, unchangedFingerprints),
  };
  const gateErrors = mode === "new" ? comparison.newFindings.errors : report.summary.errors;
  const gateWarnings = mode === "new" ? comparison.newFindings.warnings : report.summary.warnings;
  const passed = report.summary.operationalErrors === 0 && !qualityGateFails(gateErrors, gateWarnings, report.gate.failOn);
  return {
    ...report,
    gate: { ...report.gate, mode },
    comparison,
    summary: { ...report.summary, passed },
    findings: report.findings.map((finding) => ({
      ...finding,
      baselineStatus: newFingerprints.has(comparisonFingerprint(finding)) ? "new" : "unchanged",
    })),
  };
}
