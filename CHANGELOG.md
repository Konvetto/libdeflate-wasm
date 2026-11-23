# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [0.1.0]

First release, made for the Compress PDF engine of konvetto.com.

### Added

- libdeflate 1.26 compiled to one standalone wasm file (Emscripten 7.0.1, `-O3 -flto`, emmalloc,
  no JS glue, no threads).
- `init` and `initSync`: load from the file next to the module, a URL, a `Response`, bytes or a
  compiled module; Node reads `file:` URLs with `node:fs`.
- `deflate`, `zlib` and `gzip` at levels 0 to 12 (default 12), one cached compressor per level.
- `inflate`, `unzlib` and `gunzip`, with an optional exact `size`.
- `release` to free the cached compressors.
- Tests: round trips through node:zlib, byte-for-byte equality with native `libdeflate-gzip` 1.26
  at levels 1 to 12, empty and 50 MB inputs, memory reuse across calls.
