import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

export const NATIVE_GZIP = process.env.LIBDEFLATE_GZIP ?? '/opt/homebrew/bin/libdeflate-gzip';
export const hasNative = existsSync(NATIVE_GZIP);

/** `libdeflate-gzip -<level> -c`: the reference output for the same library version. */
export function nativeGzip(data: Uint8Array, level: number): Uint8Array {
  return new Uint8Array(
    execFileSync(NATIVE_GZIP, [`-${level}`, '-c'], { input: data, maxBuffer: 1 << 30 }),
  );
}

/** Deterministic pseudo-random bytes (xorshift32), so failures reproduce. */
export function randomBytes(n: number, seed = 1): Uint8Array {
  const out = new Uint8Array(n);
  let x = seed >>> 0 || 1;
  for (let i = 0; i < n; i++) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    out[i] = x & 255;
  }
  return out;
}

export function text(n: number): Uint8Array {
  const words =
    'the quick brown fox jumps over a lazy dog while PDF content streams say BT Tf Tj ET q Q cm re f'.split(
      ' ',
    );
  let s = '';
  let x = 7;
  while (s.length < n) {
    x = (x * 1103515245 + 12345) >>> 0;
    s += words[x % words.length]! + (x % 11 === 0 ? '\n' : ' ');
  }
  return new TextEncoder().encode(s.slice(0, n));
}

/** Real data: the vendored libdeflate C sources, concatenated. */
export function realData(): Uint8Array {
  const dir = join(import.meta.dirname, '../vendor/libdeflate/lib');
  const parts = readdirSync(dir)
    .filter((f) => f.endsWith('.c') || f.endsWith('.h'))
    .sort()
    .map((f) => readFileSync(join(dir, f)));
  return new Uint8Array(Buffer.concat(parts));
}

export const wasmPath = join(import.meta.dirname, '../src/libdeflate.wasm');
