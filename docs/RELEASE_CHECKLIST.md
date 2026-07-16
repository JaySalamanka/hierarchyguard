# Blocking release checklist

The source/Action launch, package/Marketplace release, and paid-service launch
are separate decisions. An unchecked item blocks only the section it belongs to,
unless that item explicitly says otherwise.

## Completed protected-staging decisions

- [x] Owner selected MPL-2.0 as the public source-code license.
- [x] Official MPL-2.0 text, SPDX package metadata, ownership, fixture licensing,
      and exact license hashing are recorded.
- [x] Paid audit intake, payment, uploads, and Action CTA remain disabled.

## Source and GitHub Action public visibility

- [ ] Owner approves the final public product name and trademark position.
- [ ] A qualified legal reviewer approves MPL-2.0 for the intended release and
      commercial model.
- [ ] Public support posture is finalized: an approved sanitized channel or an
      explicit documentation-only policy without a support SLA.
- [ ] Final `SECURITY.md`, supported-version policy, primary and backup advisory
      owners, notification settings, and a private-report test plan are ready.
- [ ] Public tree and npm tarball match their exact path manifests and contain no
      unreviewed binary, source map, symlink, submodule, LFS object, archive,
      secret, path, or PII.
- [ ] Private boundary scanner passes source, bundle, package tarball, Git
      metadata, refs, and every reachable history blob.
- [ ] Repository history starts at the reviewed clean root; every reachable
      commit uses only the approved GitHub noreply identity and contains no
      private remote, tag, path, or source reference.
- [ ] Unit, integration, CLI, Action, deterministic-output, parser, graph,
      resource-limit, path-containment, symlink, and injection tests pass.
- [ ] `npm audit`, dependency review, CodeQL when available, package allowlist,
      SBOM, license review, and bundle rebuild/diff pass.
- [ ] Action self-test proves `contents: read`, Node 24, counts-only reporting by
      default, no secrets, and no first-party network egress.
- [ ] GitHub server-side tree, history, archive, Actions settings, Dependabot,
      access, and secret protections are reverified immediately before cutover.
- [ ] Two-factor access policy is verified.
- [ ] Owner gives a separate explicit instruction to change visibility to public.

## Immediate post-visibility security cutover

The repository may be public but must remain unannounced and untagged until every
item in this section passes.

- [ ] Branch protection/ruleset is enabled and its required checks are tested.
- [ ] GitHub private vulnerability reporting is enabled, monitored, and tested
      from a non-administrator account.
- [ ] Final public `SECURITY.md`, supported versions, and reporting instructions
      match the tested private-report workflow.
- [ ] Public server tree, history, source archive, access, and security settings
      are reverified after the visibility change.

## npm and GitHub Marketplace release

- [ ] All source/Action and immediate post-visibility gates above are complete.
- [ ] Package metadata is deliberately transitioned from `private:true` and
      `0.1.0-private.0` to a reviewed stable version with approved `bugs` and
      support fields; npm scope ownership is verified.
- [ ] A reviewed semantic tag and immutable GitHub release are created from the
      exact green commit.
- [ ] Marketplace terms, unique naming, branding, release metadata, and listing
      copy are reviewed and approved.

## Paid-service activation

- [ ] Owner gives a separate explicit instruction to activate the paid offer.
- [ ] Secure HTTPS intake, privacy and retention notices, service terms,
      confidentiality, payment/invoice and tax process, cancellation/refund
      policy, support route, and delivery workflow are live and tested.
- [ ] Public offer copy, final scope, price, capacity, and seller identity are
      reviewed immediately before activation.
