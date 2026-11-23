import { expect, test } from 'vitest';
import { deflate, isReady, release, unzlib } from '../src/index.js';

test('every call before init throws a clear error', () => {
  expect(isReady()).toBe(false);
  expect(() => deflate(new Uint8Array(1))).toThrow(/call `await init\(\)`/);
  expect(() => unzlib(new Uint8Array(1))).toThrow(/call `await init\(\)`/);
  expect(() => {
    release();
  }).not.toThrow();
});
