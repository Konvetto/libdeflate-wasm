import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import {
  MAX_INPUT,
  MAX_OUTPUT,
  gunzip,
  gzip,
  initSync,
  release,
  unzlib,
  zlib,
} from '../src/index.js';
import { randomBytes, text, wasmPath } from './helpers.js';

// Capture the instance's memory by instantiating through a wrapper module object.
const Original = WebAssembly.Instance;
let memory: WebAssembly.Memory | undefined;
class Spy extends Original {
  constructor(module: WebAssembly.Module, imports?: WebAssembly.Imports) {
    super(module, imports);
    memory = this.exports.memory as WebAssembly.Memory;
  }
}
WebAssembly.Instance = Spy;
initSync(readFileSync(wasmPath));
WebAssembly.Instance = Original;

test('repeated large calls reuse freed memory instead of growing', () => {
  const data = new Uint8Array(8 << 20);
  data.set(text(4 << 20));
  data.set(randomBytes(4 << 20), 4 << 20);
  for (const level of [1, 6, 9, 12]) zlib(data, level);
  unzlib(zlib(data, 6));
  const after = memory!.buffer.byteLength;
  for (let i = 0; i < 10; i++) {
    for (const level of [1, 6, 9, 12]) zlib(data, level);
    gzip(data, 12);
    unzlib(zlib(data, 6));
  }
  expect(memory!.buffer.byteLength).toBe(after);
  release();
  zlib(data, 12);
  expect(memory!.buffer.byteLength).toBe(after);
});

test('a corrupt gzip size trailer cannot reserve gigabytes', () => {
  const before = memory!.buffer.byteLength;
  const member = gzip(text(2_000), 6);
  const corrupt = member.slice();
  corrupt.set([0xff, 0xff, 0xff, 0xff], corrupt.length - 4); // ISIZE = 4 GiB - 1
  corrupt[20] = corrupt[20]! ^ 0xff; // and break the data, so the call fails after allocating
  expect(() => gunzip(corrupt)).toThrow(/invalid gzip data|larger than/);
  const wrongSize = member.slice();
  wrongSize.set([0xff, 0xff, 0xff, 0x7f], wrongSize.length - 4);
  expect(() => gunzip(wrongSize)).toThrow(/invalid gzip data/); // libdeflate checks ISIZE
  expect(() => unzlib(zlib(text(100), 6), MAX_OUTPUT)).toThrow(/expected/);
  expect(memory!.buffer.byteLength - before).toBeLessThan(16 << 20);
});

test('the decompressor growth loop reuses memory too', () => {
  const z = zlib(new Uint8Array(30 << 20), 1);
  unzlib(z);
  const after = memory!.buffer.byteLength;
  for (let i = 0; i < 5; i++) unzlib(z);
  expect(memory!.buffer.byteLength).toBe(after);
});

// Opt-in (LIBDEFLATE_WASM_LARGE=1, needs about 4 GB of RAM): pushes the heap past 2 GiB, where
// wasm pointers are negative as signed i32 and must be read as unsigned.
test.runIf(process.env.LIBDEFLATE_WASM_LARGE === '1')(
  'pointers above 2 GiB work',
  () => {
    const data = new Uint8Array(MAX_INPUT); // input + output bound > 2 GiB
    for (let i = 0; i < data.length; i += 4096) data[i] = i & 255;
    const z = zlib(data, 1);
    const same = (a: Uint8Array, b: Uint8Array) => Buffer.from(a).equals(Buffer.from(b));
    expect(same(unzlib(z, data.length), data)).toBe(true);
    expect(same(unzlib(z), data)).toBe(true); // the growth loop overshoots to 2 GiB
    expect(memory!.buffer.byteLength).toBeGreaterThan(2 ** 31);
    expect(same(zlib(data, 1), z)).toBe(true); // allocations now land above 2 GiB
  },
  600_000,
);
