import {
  gunzipSync,
  inflateRawSync,
  inflateSync,
  deflateRawSync,
  deflateSync,
  gzipSync,
} from 'node:zlib';
import { beforeAll, describe, expect, test } from 'vitest';
import {
  DEFAULT_LEVEL,
  MAX_LEVEL,
  deflate,
  gunzip,
  gzip,
  inflate,
  init,
  isReady,
  release,
  unzlib,
  zlib,
} from '../src/index.js';
import { hasNative, nativeGzip, randomBytes, realData, text } from './helpers.js';

const levels = Array.from({ length: MAX_LEVEL + 1 }, (_, i) => i);
const inputs: [string, Uint8Array][] = [
  ['empty', new Uint8Array(0)],
  ['one byte', new Uint8Array([42])],
  ['random 300 kB', randomBytes(300_000)],
  ['text 1 MB', text(1_000_000)],
  ['real C sources', realData()],
  ['zeros 2 MB', new Uint8Array(2_000_000)],
];

beforeAll(async () => {
  await init();
});

test('init is idempotent', async () => {
  expect(isReady()).toBe(true);
  await init();
  await Promise.all([init(), init()]);
  expect(DEFAULT_LEVEL).toBe(12);
});

describe.each(inputs)('%s', (_, data) => {
  test.each(levels)('round-trips through node:zlib at level %i', (level) => {
    expect(new Uint8Array(inflateRawSync(deflate(data, level)))).toEqual(data);
    expect(new Uint8Array(inflateSync(zlib(data, level)))).toEqual(data);
    expect(new Uint8Array(gunzipSync(gzip(data, level)))).toEqual(data);
  });

  // The libdeflate-gzip CLI has no -0, so level 0 is checked as stored blocks below.
  test.runIf(hasNative).each(levels.slice(1))(
    'equals native libdeflate byte for byte at level %i',
    (level) => {
      expect(gzip(data, level)).toEqual(nativeGzip(data, level));
    },
  );

  test('decompresses node:zlib output', () => {
    expect(inflate(new Uint8Array(deflateRawSync(data)))).toEqual(data);
    expect(unzlib(new Uint8Array(deflateSync(data)))).toEqual(data);
    expect(gunzip(new Uint8Array(gzipSync(data)))).toEqual(data);
    expect(unzlib(new Uint8Array(deflateSync(data)), data.length)).toEqual(data);
  });
});

test('raw deflate equals the zlib stream minus its framing', () => {
  const data = realData();
  const z = zlib(data, 9);
  expect(z[0]).toBe(0x78);
  expect(z.subarray(2, z.length - 4)).toEqual(deflate(data, 9));
});

test('level 0 writes stored blocks', () => {
  const data = randomBytes(200_000);
  const d = deflate(data, 0);
  const blocks = Math.ceil(data.length / 65535);
  expect(d.length).toBe(data.length + 5 * blocks);
  expect(d[0]! & 0b110).toBe(0);
});

test('the default level is 12', () => {
  const data = text(200_000);
  expect(zlib(data)).toEqual(zlib(data, 12));
  expect(deflate(data)).toEqual(deflate(data, 12));
  expect(gzip(data)).toEqual(gzip(data, 12));
});

test('level 12 is smaller than node:zlib level 9 on text', () => {
  const data = realData();
  expect(zlib(data, 12).length).toBeLessThan(deflateSync(data, { level: 9 }).length);
});

test('output does not alias wasm memory', () => {
  const a = zlib(text(10_000), 6);
  const copy = a.slice();
  zlib(randomBytes(100_000), 6);
  expect(a).toEqual(copy);
  expect(a.byteOffset).toBe(0);
  expect(a.buffer.byteLength).toBe(a.length);
});

test('accepts a subarray view', () => {
  const big = text(50_000);
  const view = big.subarray(1000, 9000);
  expect(new Uint8Array(inflateSync(zlib(view)))).toEqual(view.slice());
});

test('rejects bad levels and inputs', () => {
  for (const level of [-1, 13, 1.5, Number.NaN]) {
    expect(() => zlib(new Uint8Array(1), level)).toThrow(RangeError);
  }
  expect(() => zlib([1, 2, 3] as unknown as Uint8Array)).toThrow(TypeError);
  expect(() => unzlib('x' as unknown as Uint8Array)).toThrow(TypeError);
});

test('decompression grows the buffer when the output is much larger than the input', () => {
  const zeros = new Uint8Array(20_000_000);
  const z = zlib(zeros, 1);
  expect(z.length).toBeLessThan(zeros.length / 500);
  expect(unzlib(z)).toEqual(zeros);
  expect(inflate(deflate(zeros, 1))).toEqual(zeros);
});

test('gunzip uses the size in the gzip trailer', () => {
  const data = text(3_000_000);
  expect(gunzip(gzip(data, 6))).toEqual(data);
});

test('decompression errors', () => {
  const z = zlib(text(10_000), 6);
  expect(() => unzlib(new Uint8Array([1, 2, 3, 4, 5]))).toThrow(/invalid zlib data/);
  expect(() => inflate(new Uint8Array([0xff, 0xff, 0xff]))).toThrow(/invalid deflate data/);
  expect(() => gunzip(z)).toThrow(/invalid gzip data/);
  expect(() => unzlib(z, 100)).toThrow(/larger than the given size/);
  expect(() => unzlib(z, 20_000)).toThrow(/expected 20000 bytes, got 10000/);
  expect(() => unzlib(z, -1)).toThrow(RangeError);
  expect(() => unzlib(z, 0.5)).toThrow(RangeError);
});

test('release frees the cached state and later calls allocate it again', () => {
  const data = text(100_000);
  const before = zlib(data, 12);
  unzlib(before);
  release();
  release();
  expect(zlib(data, 12)).toEqual(before);
  expect(unzlib(before)).toEqual(data);
});

test('compresses 50 MB without trouble', () => {
  const data = new Uint8Array(50 * 1024 * 1024);
  const chunk = text(1 << 20);
  for (let i = 0; i < 50; i++) data.set(i % 5 === 4 ? randomBytes(1 << 20, i + 1) : chunk, i << 20);
  for (const level of [6, 12]) {
    const z = zlib(data, level);
    expect(z.length).toBeLessThan(data.length * 0.25);
    expect(new Uint8Array(inflateSync(z))).toEqual(data);
    expect(unzlib(z, data.length)).toEqual(data);
  }
  if (hasNative) expect(gzip(data, 12)).toEqual(nativeGzip(data, 12));
});
