<p align="center">
  <img src="docs/assets/hierarchyguard-banner.svg" alt="HierarchyGuard — CMMS Asset Hierarchy Quality Gate" width="900">
</p>

<p align="center">
  <a href="https://github.com/JaySalamanka/hierarchyguard/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/JaySalamanka/hierarchyguard/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="License: MPL-2.0" src="https://img.shields.io/badge/license-MPL--2.0-0b7285.svg"></a>
  <img alt="Node.js 22+" src="https://img.shields.io/badge/node-%3E%3D22-339933.svg">
  <img alt="Network egress: none" src="https://img.shields.io/badge/runtime%20egress-none-1f6feb.svg">
</p>

**HierarchyGuard catches structural defects in CMMS asset hierarchies before import.**
It validates CSV files locally, points to exact rows, produces deterministic
JSON/Markdown/SARIF evidence, and runs as either a GitHub Action or Node.js CLI.

No account. No telemetry. No customer-data upload. No vendor lock-in.

## Why teams use it

Hierarchy data can look reasonable in a spreadsheet and still fail an import,
create orphaned assets, hide maintenance history, or produce a misleading
equipment structure. HierarchyGuard turns those risks into a repeatable quality
gate that engineering, maintenance, data and implementation teams can review
before a CMMS is touched.

It detects:

- missing, duplicate and case-colliding asset IDs;
- missing parents, self-parenting and graph cycles;
- invalid root counts and configured depth violations;
- parent-after-child import ordering;
- declared-level and path inconsistencies;
- duplicated sibling names and boundary whitespace;
- control characters and spreadsheet-formula hazards.

The score is transparent and designed for triage. It is not target-CMMS
certification and does not guarantee acceptance by a third-party importer.

## GitHub Action — five-minute setup

Create `.hierarchyguard.json` using the configuration below, then add:

```yaml
name: Asset hierarchy quality

on:
  pull_request:
    paths:
      - "asset-data/**"
      - ".hierarchyguard.json"

permissions:
  contents: read

jobs:
  hierarchy:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - id: hierarchyguard
        uses: JaySalamanka/hierarchyguard@v1
        with:
          files: asset-data/**/*.csv
          config: .hierarchyguard.json
          fail-on: error
```

The Action needs no secret and no write permission. It publishes aggregate
counts only by default. Detailed annotations are opt-in with
`publish-details: true` because file paths and finding messages may reveal
operational information.

## CLI

Requires Node.js 22 or newer.

```bash
npm install --global https://github.com/JaySalamanka/hierarchyguard/releases/download/v1.0.0/hierarchyguard-1.0.0.tgz

hierarchyguard check "asset-data/**/*.csv" \
  --config .hierarchyguard.json \
  --output-dir .hierarchyguard
```

Exit codes are `0` for a passing gate, `1` when findings reach the configured
threshold, and `2` for malformed input, configuration or operational errors.
Reports are written before exit code `1`.

## Configuration

```json
{
  "version": 1,
  "files": ["asset-data/**/*.csv"],
  "columns": {
    "id": "asset_id",
    "parent": "parent_asset_id",
    "name": "name",
    "path": "path",
    "level": "level"
  },
  "rules": {
    "rootPolicy": "one",
    "maxDepth": 8,
    "requireParentBeforeChild": true,
    "pathSeparator": "/"
  },
  "gate": { "failOn": "error" }
}
```

Only ID, parent ID and name are required. Blank parent IDs represent roots.
Each matched CSV is treated as an independent hierarchy in V1. See the
[rule reference](docs/RULE_REFERENCE.md) for every finding and remediation.

## Adopt it without fixing every legacy finding first

Capture an approved result as a baseline and fail only on new or more-severe
finding fingerprints:

```bash
hierarchyguard check "asset-data/**/*.csv" \
  --config .hierarchyguard.json \
  --baseline .hierarchyguard-baselines/main.json \
  --gate-mode new
```

Reports include deterministic `new`, `resolved`, and `unchanged` counts. A
baseline stays inside the workspace, is never retrieved by the tool, must use
the same ruleset, and cannot be overwritten by the current run.

## Outputs

Every run creates:

- `results.json` — deterministic machine-readable evidence;
- `results.sarif` — compatible with SARIF consumers;
- `summary.md` — human-readable findings and correction guidance.

Input hashes, configuration hashes and stable finding fingerprints make changes
reviewable across runs. Generated reports may contain identifiers and paths, so
treat the output directory as operational data.

## Security and privacy by design

- Runtime network and subprocess access are blocked in verification tests.
- Absolute paths, traversal, symlinks and workspace escapes are rejected.
- CSV size, row, column, field and finding counts are bounded.
- Output writes are contained, atomic and owner-only where supported.
- Compiled Action and CLI bundles are rebuilt and diffed in CI.
- Dependencies are pinned and automatically reviewed.

Read the complete [data-handling statement](docs/DATA_HANDLING.md),
[security policy](SECURITY.md), and [support policy](SUPPORT.md).

## Development

```bash
npm ci --ignore-scripts
npm run check
npm run pack:inspect
```

`dist/` contains reviewed release artifacts committed alongside their source.
CI rebuilds them and fails when the bundle differs. Third-party notices ship in
the adjacent `licenses.txt` files.

## Project stewardship

HierarchyGuard is created and maintained by **Mohammad Allatayfeh**. External
contributions are welcome under the [contribution policy](CONTRIBUTING.md).

Copyright 2026 Mohammad Allatayfeh. Source code is licensed under the
[Mozilla Public License 2.0](LICENSE). Product names and marks are governed by
the [marks policy](TRADEMARKS.md).
