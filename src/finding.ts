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
}

export function makeFinding(input: FindingInput): Finding {
  const stable = [input.ruleId, input.fingerprintVariant ?? "default", input.file, String(input.line), input.field, input.assetId ?? ""].join("\u0000");
  const fingerprint = `sha256:${createHash("sha256").update(stable).digest("hex")}`;
  const { fingerprintVariant: _fingerprintVariant, ...finding } = input;
  return { ...finding, fingerprint };
}
