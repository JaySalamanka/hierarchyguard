# Release assurance record — v1.0.0

Release date: 2026-08-09  
Owner and maintainer: Mohammad Allatayfeh  
License: MPL-2.0

This is the repeatable release gate. A checked item records technical or owner
verification; it is not a legal certification.

## Identity and public boundary

- [x] Owner authorized commercialization and public release of this repository.
- [x] HierarchyGuard selected as the product name after an initial exact-name,
      GitHub and npm availability check.
- [x] No claim of trademark registration or CMMS-vendor endorsement is made.
- [x] Repository history begins with the reviewed clean-room source.
- [x] Public tree contains synthetic fixtures only and is path-allowlisted.
- [x] MPL-2.0 text, SPDX headers, ownership and third-party notices are present.
- [x] Proprietary application code, training assets, datasets and rulebooks are
      outside this repository.

## Product quality and security

- [x] Unit, parser, graph, baseline, path, symlink, resource-limit, report,
      injection, CLI and Action tests pass.
- [x] The Action runs on Node 24 with `contents: read` and no secret.
- [x] Default GitHub output contains counts only; detailed findings are opt-in.
- [x] Runtime no-egress and no-subprocess tests pass.
- [x] Compiled bundles reproduce from the source in the same commit.
- [x] Exact repository and npm-package path allowlists pass.
- [x] Clean tarball installation and CLI smoke tests pass offline.
- [x] `npm audit --audit-level=low` reports zero vulnerabilities.
- [x] CI, CodeQL, Dependabot and private vulnerability reporting are configured.
- [x] SBOM and package integrity hashes are generated for the release.

## Publication

- [x] Public README, rule reference, support, security, contribution,
      data-handling, marks and changelog documents are ready.
- [x] Repository issues use forms that prohibit sensitive/customer data.
- [x] Stable version `1.0.0`, immutable tag `v1.0.0`, and moving major tag `v1`
      identify the reviewed release.
- [x] GitHub release artifacts are built from the exact tagged commit.
- [x] Branch protection requires review, status checks and conversation
      resolution after public cutover.

## Deliberately separate from this source release

- npm publication requires the owner's npm authentication and is not necessary
  to use the GitHub Action.
- Paid data review, uploads, invoices, service terms and customer delivery are
  not offered through this repository.
- A comprehensive jurisdiction-specific trademark or legal opinion remains an
  optional owner decision; the repository makes no claim that one occurred.
