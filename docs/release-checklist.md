# Release Checklist

Use this checklist for every phase commit and every published release.

## Before committing a phase

- [ ] Confirm the change scope and choose the correct SemVer impact (patch, minor, or major).
- [ ] Keep each coherent phase in a separate commit with an action-oriented message.
- [ ] Add or update tests for every new feature, API, bug fix, and changed behavior.
- [ ] Run the relevant focused tests and record results in the local `development-notes/` report.
- [ ] Confirm no local audit reports, build output, credentials, or environment files are staged.
- [ ] Review `git diff --check` and the staged diff.

## Before a release

- [ ] Update the version in `package.json` and `package-lock.json`.
- [ ] Update every published version reference in README files, CHANGELOG, API documentation, migration guides, examples, and license/source headers.
- [ ] Add a CHANGELOG entry describing features, fixes, API changes, and test coverage.
- [ ] Document every new or changed API in the API reference and README examples.
- [ ] Mark all breaking changes explicitly, explain the impact, and provide migration guidance.
- [ ] Verify wrapper exports, generated declarations, package entry points, and framework integrations.
- [ ] Run `npm run typecheck`, `npm test`, `npm run build`, and `npm run pack:check`.
- [ ] Confirm `npm pkg get version` matches the intended release.
- [ ] Inspect the `npm pack --dry-run` file list and package size.
- [ ] Confirm both local repositories have clean working trees and the intended commits are on the correct branches.
- [ ] Create and push the matching Git tag (for example, `v0.8.0`).
- [ ] Create or update the GitHub Release from that tag and verify the Latest designation.
- [ ] Push commits and tags before handing off the manual npm publish step.
- [ ] Publish to npm manually with maintainer credentials; verify the registry version afterward.
- [ ] Record all commands, results, release URLs, and follow-up items in local `development-notes/`.

## After publishing

- [ ] Verify the npm package page, tarball version, README, and package contents.
- [ ] Verify GitHub tag/release and the default branch point to the same release commit.
- [ ] Check that no deprecated or unreleased version is shown as Latest.
- [ ] Note any known warnings (for example, network/DNS or jsdom media warnings) separately from failures.
