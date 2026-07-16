# AssetTree CI

> **Maintainer status: private launch candidate.** Do not change this
> owner-controlled repository's visibility or publish its npm package yet. The
> source is licensed under MPL-2.0; support, paid intake, and official release
> channels remain separate owner-controlled gates.

AssetTree CI stops structurally broken asset hierarchies before they reach a
CMMS. It checks CSV files locally, reports exact rows, and runs as both a Node.js
CLI and a GitHub Action without uploading customer data.

## What V1 catches

- Missing required IDs and names.
- Duplicate and case-colliding IDs.
- Missing parents, self-parenting, and hierarchy cycles.
- Explicit root-count and maximum-depth violations.
- Parent-after-child import ordering.
- Declared level and optional path mismatches.
- Duplicate sibling names, boundary whitespace, control characters, and
  spreadsheet-formula hazards.

The generic score is transparent and useful for triage. It is not target-CMMS
certification or an import guarantee.

## CLI preview

Requires Node.js 22 or newer.

```powershell
npm ci
npm run build
node dist/cli/index.js check "fixtures/synthetic/valid.csv" `
  --config fixtures/synthetic/config.json `
  --output-dir .assettree
```

Exit codes are `0` for a passing gate, `1` for validation findings at the
configured threshold, and `2` for malformed input/configuration or an
operational error. Reports are always written before exit code `1`.

## GitHub Action preview

```yaml
name: Asset hierarchy quality

on:
  pull_request:
    paths:
      - "asset-data/**"
      - ".assettree.json"

permissions:
  contents: read

jobs:
  validate:
    runs-on: ubuntu-24.04
    steps:
      - name: Check out repository
        uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
        with:
          persist-credentials: false

      - name: Validate hierarchy
        uses: JaySalamanka/assettree-ci@REPLACE_WITH_RELEASE_COMMIT_SHA
        with:
          files: asset-data/**/*.csv
          config: .assettree.json
          fail-on: error
```

The Action uses Node 24 and creates a counts-only job summary by default. Set
`publish-details: true` only when repository policy permits finding paths and
messages to be stored in GitHub annotations and the job summary. It always
writes deterministic JSON, Markdown, and SARIF files under `.assettree/`. It
never requires `pull_request_target`, write permissions, a secret, telemetry, or
an external application request initiated by AssetTree CI.

## Configuration

Create `.assettree.json`:

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

Only asset ID, parent asset ID, and name columns are required. Blank parent IDs
denote roots. Maximum depth is always an explicit customer configuration; the
public engine does not impose a proprietary hierarchy convention.

Each matched CSV is evaluated as a separate hierarchy. Parent references do not
cross file boundaries in V1.

The score is `round(100 * (1 - row_penalties / parsed_rows))`, clamped to
0-100. A row's highest-severity finding contributes `1` for error, `0.25` for
warning, or `0.05` for notice; multiple findings on one row do not stack.

## Data handling

The runtime reads selected files inside the current repository workspace and
writes reports to a contained local directory. AssetTree CI initiates no
external application request, telemetry, or file upload. The Action's GitHub
integration library contains transport-capable code, and GitHub stores workflow
logs and any summary or annotations the workflow enables. See [the data-handling
statement](docs/DATA_HANDLING.md).

## Human-reviewed audit

A potential fixed-scope USD 750 Hierarchy Health Audit is documented for future
planning. It is not currently offered: orders, payments, customer files, and
audit intake are not accepted. See [the commercial boundary](docs/PAID_AUDIT.md).

## Development

```powershell
npm ci
npm run check
npm run pack:inspect
```

The compiled `dist/` bundles are committed release artifacts. CI rebuilds them
from the corresponding source in the same commit and fails if the result
differs. Each future release must identify an immutable source commit or tag;
third-party notices are shipped beside each bundle in `licenses.txt`.

## License and ownership

Copyright 2026 Mohammad Allatayfeh. The source code is licensed under the
[Mozilla Public License 2.0](LICENSE). MPL-2.0 applies to covered source files,
not to product names, logos, service marks, hosted services, private datasets,
or code that is not contained in this repository. See [the marks policy](TRADEMARKS.md).

## Release status

The owner has selected MPL-2.0, but maintainers are not authorized to change this
owner-controlled repository's visibility, publish the owner-controlled npm
package, or create an official GitHub release or Marketplace listing until the
remaining items in the [blocking release checklist](docs/RELEASE_CHECKLIST.md)
are completed. These staging controls do not add restrictions to recipients'
rights under MPL-2.0.
