import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { gzip, initSync, release, unzlib, zlib } from '../src/index.js';
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
