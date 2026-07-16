// SPDX-FileCopyrightText: 2026 Mohammad Allatayfeh
// SPDX-License-Identifier: MPL-2.0

import { mkdir, rm } from "node:fs/promises";
import { resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const target = resolve(root, "dist");

if (!target.startsWith(`${root}${sep}`) || target === root) {
  throw new Error("Refusing to clean a path outside the repository");
}

await rm(target, { force: true, recursive: true });
await mkdir(target, { recursive: true });
