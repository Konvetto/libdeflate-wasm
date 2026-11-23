# Contributing

Thanks for helping. Bug reports with the input that shows the problem are the most useful thing
you can send.

## Setup

```sh
pnpm install
pnpm test          # Vitest (compares with native libdeflate-gzip when it is installed)
pnpm check         # types, lint, tests, build, publint, attw, size
pnpm bench -- a.pdf b.pdf
```

Node 20.16 or newer and pnpm (see `packageManager` in package.json). The byte-for-byte tests use
`libdeflate-gzip` 1.26 (`brew install libdeflate`, or set `LIBDEFLATE_GZIP`); without it they
are skipped.

## The wasm

- `vendor/libdeflate` is libdeflate's release tarball, unmodified. Never edit it by hand: change
  `VERSION` and `SHA256` in `scripts/fetch-libdeflate.sh` and run it.
- `src/libdeflate.wasm` is built by `pnpm build:wasm` (Emscripten 7.0.1) and committed. Commit the
  rebuilt file together with the change that caused it; CI rebuilds it and fails on a difference.
- A libdeflate upgrade needs the native `libdeflate-gzip` of the same version for the tests, a
  benchmark run and a CHANGELOG line about the size change.

## Rules of the house

- Output must match native libdeflate of the same version. A difference is a bug.
- No runtime dependencies, no Node-only APIs in `src/` except behind `process.getBuiltinModule`.
- No threads or `SharedArrayBuffer`: the module must work without cross-origin isolation.
- Keep the public API small.
- Commits in English, imperative mood, one change per commit.

## Pull requests

CI runs lint, types, tests on Node 20, 22 and 24, publint, arethetypeswrong, size-limit and a
rebuild of the wasm. Use a Conventional Commit title for the PR (it becomes the squash commit):
do not edit CHANGELOG.md by hand, the release PR generates it.

## Commits and releases

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`
(minor), `fix:` (patch), `docs:`, `chore:`, `test:`, `refactor:`, `perf:` (no release by
themselves), `feat!:` or a `BREAKING CHANGE:` footer (breaking; while on 0.x this bumps minor).

Releases are automated with [release-please](https://github.com/googleapis/release-please): it
keeps a "chore(main): release x.y.z" PR open; merging it tags the release, and
`.github/workflows/release.yml` runs `pnpm check` and `npm publish --provenance --access public`
(npm trusted publishing, environment `npm`).
