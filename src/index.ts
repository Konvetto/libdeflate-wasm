/**
 * libdeflate compiled to WebAssembly: raw DEFLATE, zlib and gzip at levels 0 to 12.
 *
 * Call `init()` once (async), then every function below is synchronous. One compressor per
 * level is allocated on first use and reused; input and output buffers live in wasm memory only
 * for the duration of a call.
 */

/** What `init` accepts: a URL of the .wasm file, its bytes, a fetch `Response` or a compiled module. */
export type WasmSource = URL | string | Response | BufferSource | WebAssembly.Module;

interface Exports {
  memory: WebAssembly.Memory;
  _initialize: () => void;
  malloc: (n: number) => number;
  free: (p: number) => void;
  libdeflate_alloc_compressor: (level: number) => number;
  libdeflate_free_compressor: (c: number) => void;
  libdeflate_deflate_compress: (c: number, i: number, n: number, o: number, a: number) => number;
  libdeflate_zlib_compress: (c: number, i: number, n: number, o: number, a: number) => number;
  libdeflate_gzip_compress: (c: number, i: number, n: number, o: number, a: number) => number;
  libdeflate_deflate_compress_bound: (c: number, n: number) => number;
  libdeflate_zlib_compress_bound: (c: number, n: number) => number;
  libdeflate_gzip_compress_bound: (c: number, n: number) => number;
  libdeflate_alloc_decompressor: () => number;
  libdeflate_free_decompressor: (d: number) => void;
  libdeflate_deflate_decompress: Decompress;
  libdeflate_zlib_decompress: Decompress;
  libdeflate_gzip_decompress: Decompress;
}

type Decompress = (d: number, i: number, n: number, o: number, a: number, actual: number) => number;
type Format = 'deflate' | 'zlib' | 'gzip';

/** Highest level libdeflate supports. 12 is its slowest, smallest setting. */
export const MAX_LEVEL = 12;
/** Level used when none is given. */
export const DEFAULT_LEVEL = 12;

const DECOMPRESS_SUCCESS = 0;
const DECOMPRESS_INSUFFICIENT_SPACE = 3;
/** Largest input any function takes: 1 GiB. Compression needs about twice that in wasm memory. */
export const MAX_INPUT = 0x40000000;
/** Largest output the decompressors produce: 2 GiB minus 64 KiB. */
export const MAX_OUTPUT = 0x7fff0000;
/** DEFLATE expands at most about 1032:1, so no valid stream decodes to more than this. */
const MAX_RATIO = 1032;

let wasm: Exports | undefined;
let pending: Promise<void> | undefined;
const compressors = new Map<number, number>();
let decompressor = 0;

const imports: WebAssembly.Imports = {
  // Views on memory are re-created on every call, so growth needs no bookkeeping.
  env: { emscripten_notify_memory_growth: () => undefined },
};

function defaultUrl(): URL {
  return new URL('./libdeflate.wasm', import.meta.url);
}

function isNodeFileUrl(url: URL): boolean {
  return url.protocol === 'file:';
}

async function readFileUrl(url: URL): Promise<Uint8Array<ArrayBuffer>> {
  // `process.getBuiltinModule` (Node 20.16+, Deno, Bun) keeps `node:fs` out of browser bundles.
  const proc = (globalThis as { process?: { getBuiltinModule?: (id: string) => unknown } }).process;
  const fs = proc?.getBuiltinModule?.('node:fs/promises') as
    { readFile: (u: URL) => Promise<Uint8Array<ArrayBuffer>> } | undefined;
  if (!fs) throw new Error('libdeflate-wasm: cannot read a file: URL without node:fs');
  return fs.readFile(url);
}

async function compile(source: WasmSource): Promise<WebAssembly.Module> {
  if (source instanceof WebAssembly.Module) return source;
  if (typeof source === 'string' || source instanceof URL) {
    const url = new URL(source, typeof source === 'string' ? defaultUrl() : undefined);
    if (isNodeFileUrl(url)) return WebAssembly.compile(await readFileUrl(url));
    return compile(await fetch(url));
  }
  if (source instanceof Response) {
    if (!source.ok) throw new Error(`libdeflate-wasm: fetching the wasm failed (${source.status})`);
    if (
      typeof WebAssembly.compileStreaming === 'function' &&
      source.headers.get('content-type')?.startsWith('application/wasm')
    ) {
      return WebAssembly.compileStreaming(source);
    }
    return WebAssembly.compile(await source.arrayBuffer());
  }
  return WebAssembly.compile(source);
}

function attach(module: WebAssembly.Module): void {
  // The first instance wins: cached compressor pointers belong to it.
  if (wasm) return;
  const instance = new WebAssembly.Instance(module, imports);
  const exports = instance.exports as unknown as Exports;
  exports._initialize();
  wasm = exports;
}

/**
 * Loads and instantiates the wasm module. Safe to call many times; later calls return the first
 * promise. Without an argument the file next to this module (`libdeflate.wasm`) is used.
 */
export function init(source?: WasmSource): Promise<void> {
  if (wasm) return Promise.resolve();
  pending ??= compile(source ?? defaultUrl()).then(attach, (error: unknown) => {
    if (wasm) return; // `initSync` won the race; this load is no longer needed
    pending = undefined;
    throw error;
  });
  return pending;
}

/** Synchronous `init` for callers that already hold the bytes or a compiled module. */
export function initSync(source: BufferSource | WebAssembly.Module): void {
  if (wasm) return;
  attach(source instanceof WebAssembly.Module ? source : new WebAssembly.Module(source));
  // A later or still pending `init()` resolves without creating a second instance.
  pending ??= Promise.resolve();
}

/** True once `init` or `initSync` has finished. */
export function isReady(): boolean {
  return wasm !== undefined;
}

function api(): Exports {
  if (!wasm) throw new Error('libdeflate-wasm: call `await init()` before compressing');
  return wasm;
}

function checkInput(data: Uint8Array): void {
  if (!(data instanceof Uint8Array)) {
    throw new TypeError('libdeflate-wasm: data must be a Uint8Array');
  }
  if (data.length > MAX_INPUT) {
    throw new RangeError(`libdeflate-wasm: input is larger than ${MAX_INPUT} bytes`);
  }
}

function compressor(w: Exports, level: number): number {
  if (!Number.isInteger(level) || level < 0 || level > MAX_LEVEL) {
    throw new RangeError(`libdeflate-wasm: level must be an integer from 0 to ${MAX_LEVEL}`);
  }
  let c = compressors.get(level);
  if (c === undefined) {
    // Pointers are unsigned: above 2 GiB an i32 result arrives in JS as a negative number.
    c = w.libdeflate_alloc_compressor(level) >>> 0;
    if (!c) throw new RangeError('libdeflate-wasm: out of memory allocating the compressor');
    compressors.set(level, c);
  }
  return c;
}

function alloc(w: Exports, n: number): number {
  const p = w.malloc(Math.max(n, 1)) >>> 0;
  if (!p) throw new RangeError(`libdeflate-wasm: out of memory allocating ${n} bytes`);
  return p;
}

function compress(format: Format, data: Uint8Array, level: number): Uint8Array {
  checkInput(data);
  const w = api();
  const c = compressor(w, level);
  const bound = w[`libdeflate_${format}_compress_bound`](c, data.length) >>> 0;
  const input = alloc(w, data.length);
  let output = 0;
  try {
    output = alloc(w, bound);
    new Uint8Array(w.memory.buffer, input, data.length).set(data);
    const size = w[`libdeflate_${format}_compress`](c, input, data.length, output, bound) >>> 0;
    if (size === 0) throw new Error('libdeflate-wasm: compression failed');
    return new Uint8Array(w.memory.buffer, output, size).slice();
  } finally {
    w.free(input);
    if (output) w.free(output);
  }
}

/** Raw DEFLATE (RFC 1951), no header or checksum. */
export function deflate(data: Uint8Array, level: number = DEFAULT_LEVEL): Uint8Array {
  return compress('deflate', data, level);
}

/** zlib stream (RFC 1950): what PDF `/FlateDecode` and PNG `IDAT` expect. */
export function zlib(data: Uint8Array, level: number = DEFAULT_LEVEL): Uint8Array {
  return compress('zlib', data, level);
}

/** gzip member (RFC 1952) with an empty header (no name, mtime 0), like `libdeflate-gzip -c`. */
export function gzip(data: Uint8Array, level: number = DEFAULT_LEVEL): Uint8Array {
  return compress('gzip', data, level);
}

function gzipSizeHint(data: Uint8Array): number | undefined {
  if (data.length < 18) return undefined;
  const n = data.length;
  return (data[n - 4]! | (data[n - 3]! << 8) | (data[n - 2]! << 16) | (data[n - 1]! << 24)) >>> 0;
}

function decompress(format: Format, data: Uint8Array, size?: number): Uint8Array {
  checkInput(data);
  if (size !== undefined && (!Number.isInteger(size) || size < 0)) {
    throw new RangeError('libdeflate-wasm: size must be a non-negative integer');
  }
  if (size !== undefined && size > MAX_OUTPUT) {
    throw new RangeError(`libdeflate-wasm: size must be at most ${MAX_OUTPUT} bytes`);
  }
  const w = api();
  if (!decompressor) {
    decompressor = w.libdeflate_alloc_decompressor() >>> 0;
    if (!decompressor) throw new RangeError('libdeflate-wasm: out of memory');
  }
  const exact = size !== undefined;
  // Size hints (the caller's `size`, the gzip ISIZE trailer) are trusted only up to what the
  // input can possibly decode to, so a 100-byte corrupt stream cannot reserve gigabytes.
  const plausible = Math.min(data.length * MAX_RATIO + 1024, MAX_OUTPUT);
  const limit = exact ? Math.min(size, plausible) : plausible;
  const gzipHint = format === 'gzip' ? gzipSizeHint(data) : undefined;
  const hint = size ?? (gzipHint !== undefined && gzipHint <= plausible ? gzipHint : undefined);
  let avail = Math.min(Math.max(hint ?? data.length * 4, 1024), limit);
  const actualAt = (data.length + 3) & ~3; // 4-byte slot after the input for the output length
  const input = alloc(w, actualAt + 4);
  const actual = input + actualAt;
  try {
    new Uint8Array(w.memory.buffer, input, data.length).set(data);
    for (;;) {
      const output = alloc(w, avail);
      try {
        const run = w[`libdeflate_${format}_decompress`];
        const status = run(decompressor, input, data.length, output, avail, actual);
        if (status === DECOMPRESS_SUCCESS) {
          const n = new DataView(w.memory.buffer).getUint32(actual, true);
          if (exact && n !== size)
            throw new Error(`libdeflate-wasm: expected ${size} bytes, got ${n}`);
          return new Uint8Array(w.memory.buffer, output, n).slice();
        }
        if (status !== DECOMPRESS_INSUFFICIENT_SPACE || avail >= limit) {
          throw new Error(
            status !== DECOMPRESS_INSUFFICIENT_SPACE
              ? `libdeflate-wasm: invalid ${format} data`
              : exact
                ? 'libdeflate-wasm: output larger than the given size'
                : `libdeflate-wasm: output larger than ${limit} bytes`,
          );
        }
      } finally {
        w.free(output);
      }
      avail = Math.min(avail * 2, limit);
    }
  } finally {
    w.free(input);
  }
}

/**
 * Decompresses raw DEFLATE. Pass `size` when the exact output length is known (faster).
 * Decoding stops at the end of the first stream; bytes after it are ignored.
 */
export function inflate(data: Uint8Array, size?: number): Uint8Array {
  return decompress('deflate', data, size);
}

/** Decompresses a zlib stream. Bytes after its Adler-32 are ignored (PDF streams often have an EOL). */
export function unzlib(data: Uint8Array, size?: number): Uint8Array {
  return decompress('zlib', data, size);
}

/** Decompresses the first gzip member; further members and trailing bytes are ignored. */
export function gunzip(data: Uint8Array, size?: number): Uint8Array {
  return decompress('gzip', data, size);
}

/**
 * Frees the cached compressors and decompressor (levels 10 to 12 hold about 8.6 MB each). wasm
 * memory never shrinks, but freed space is reused by later calls.
 */
export function release(): void {
  if (!wasm) return;
  for (const c of compressors.values()) wasm.libdeflate_free_compressor(c);
  compressors.clear();
  if (decompressor) wasm.libdeflate_free_decompressor(decompressor);
  decompressor = 0;
}
