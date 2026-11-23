# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [0.2.0](https://github.com/Konvetto/libdeflate-wasm/compare/v0.1.0...v0.2.0) (2026-11-23)


### Features

* libdeflate 1.26 compiled to WebAssembly with deflate, zlib and gzip up to level 12 ([f17d716](https://github.com/Konvetto/libdeflate-wasm/commit/f17d716a1df3f975f753b5749b8993616e35d591))


### Bug Fixes

* bound size hints, share one instance between init and initSync, unsigned pointers ([a48fe05](https://github.com/Konvetto/libdeflate-wasm/commit/a48fe0575ee8fc319163c7cea506f4c730a79e25))

## [0.1.0]

First release, made for the Compress PDF engine of konvetto.com.

### Added

- libdeflate 1.26 compiled to one standalone wasm file (Emscripten 7.0.1, `-O3 -flto`, emmalloc,
  no JS glue, no threads).
- `init` and `initSync`, sharing one instance even when they race: load from the file next to the module, a URL, a `Response`, bytes or a
  compiled module; Node reads `file:` URLs with `node:fs`.
- `deflate`, `zlib` and `gzip` at levels 0 to 12 (default 12), one cached compressor per level.
- `inflate`, `unzlib` and `gunzip`, with an optional exact `size`. Size hints, including the gzip
  trailer, are trusted only up to what the input can decode to. Decoding stops after the first
  stream or gzip member.
- `MAX_INPUT` (1 GiB) and `MAX_OUTPUT` (2 GiB minus 64 KiB), checked before any allocation.
- `release` to free the cached compressors.
- Tests: round trips through node:zlib, byte-for-byte equality with native `libdeflate-gzip` 1.26
  at levels 1 to 12 (CI builds the native reference from `vendor/`), empty and 50 MB inputs, memory
  reuse across calls, corrupt size hints, and an opt-in test past 2 GiB of wasm memory.
