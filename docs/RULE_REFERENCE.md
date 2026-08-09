# Rule reference

HierarchyGuard reports a stable rule ID, severity, exact CSV line, field,
message, suggestion and fingerprint for every finding.

| Rule | Default severity | Meaning | Typical correction |
|---|---:|---|---|
| `ATC001` | Error | Required ID or name is blank | Supply a stable ID and clear name |
| `ATC002` | Error | Duplicate or normalized ID collision | Assign distinct IDs that remain unique case-insensitively |
| `ATC003` | Error | Referenced parent does not exist | Correct the parent ID or add its row |
| `ATC004` | Error | Row is its own parent | Choose another parent or make it a root |
| `ATC005` | Error | One or more parent links form a cycle | Break the cycle at the intended boundary |
| `ATC006` | Error | Root count violates `rootPolicy` | Select one root or configure `any` |
| `ATC007` | Warning | Parent appears after its child | Sort parents before children for import readiness |
| `ATC008` | Error | Computed depth exceeds `maxDepth` | Re-parent the row or revise the explicit limit |
| `ATC009` | Warning | Declared level is invalid or mismatched | Use the computed positive graph depth |
| `ATC010` | Warning | Path does not match name or parent path | Rebuild the path from the parent hierarchy |
| `ATC011` | Warning | Sibling names are duplicated | Differentiate names or confirm intent |
| `ATC012` | Warning | Field has boundary whitespace | Trim without changing intended content |
| `ATC013` | Warning | Field contains control characters | Remove non-printing characters |
| `ATC014` | Warning | Cell may execute as a spreadsheet formula | Store the value as inert text |
| `ATC999` | Notice | Finding limit truncated report details | Correct severe findings, then rerun |

Severity controls whether a run fails; it does not replace operational review.
Use `gate.failOn` or the `fail-on` Action input with `error`, `warning`, or
`none`. Resource limits are configurable but remain validated and bounded.
