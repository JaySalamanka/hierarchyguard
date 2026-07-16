// SPDX-FileCopyrightText: 2026 Mohammad Allatayfeh
// SPDX-License-Identifier: MPL-2.0

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const cliSource = resolve(root, "dist", "cli", "index.js");

const cli = await readFile(cliSource, "utf8");
await writeFile(cliSource, cli.startsWith("#!") ? cli : `#!/usr/bin/env node\n${cli}`, "utf8");
