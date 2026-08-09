// SPDX-FileCopyrightText: 2026 Mohammad Allatayfeh
// SPDX-License-Identifier: MPL-2.0

import { createHash } from "node:crypto";

import { Finding, Severity } from "./types";

interface FindingInput {
  ruleId: string;
  severity: Severity;
  message: string;
  suggestion: string;
  file: string;
  line: number;
  field: string;
  assetId?: string;
  fingerprintVariant?: string;
  fingerprintIdentity?: string;
}

export function makeFinding(input: FindingInput): Finding {
  const variant = input.fingerprintVariant ?? "default";
  const identity = input.fingerprintIdentity
    ?? (input.assetId ? `asset:${input.assetId}` : `line:${input.line}`);
  const stable = [input.ruleId, variant, input.file, input.field, identity].join("\u0000");
  const fingerprint = `sha256:${createHash("sha256").update(stable).digest("hex")}`;
  const legacyStable = [input.ruleId, variant, input.file, String(input.line), input.field, input.assetId ?? ""].join("\u0000");
  const legacyFingerprintV1 = `sha256:${createHash("sha256").update(legacyStable).digest("hex")}`;
  const {
    fingerprintVariant: _fingerprintVariant,
    fingerprintIdentity: _fingerprintIdentity,
    ...finding
  } = input;
  return { ...finding, fingerprint, legacyFingerprintV1, baselineStatus: "new" };
}
