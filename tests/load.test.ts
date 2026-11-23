import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { afterEach, expect, test, vi } from 'vitest';
import { wasmPath } from './helpers.js';

const bytes = readFileSync(wasmPath);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function fresh() {
  return import('../src/index.js');
}

test('loads from a file: URL, a path string and the default location', async () => {
  for (const source of [pathToFileURL(wasmPath), wasmPath, undefined]) {
    vi.resetModules();
    const m = await fresh();
    await m.init(source);
    expect(m.unzlib(m.zlib(new Uint8Array([1, 2, 3])))).toEqual(new Uint8Array([1, 2, 3]));
  }
});

test('loads from bytes, a module and a Response with or without the wasm MIME type', async () => {
  const sources = [
    () => bytes,
    () => new WebAssembly.Module(bytes),
    () => new Response(bytes, { headers: { 'content-type': 'application/wasm' } }),
    () => new Response(bytes, { headers: { 'content-type': 'application/octet-stream' } }),
  ];
  for (const source of sources) {
    vi.resetModules();
    const m = await fresh();
    await m.init(source());
    expect(m.isReady()).toBe(true);
  }
});

test('initSync takes bytes or a module and is idempotent', async () => {
  const m = await fresh();
  m.initSync(bytes);
  m.initSync(new WebAssembly.Module(bytes));
  await m.init();
  expect(m.gunzip(m.gzip(new Uint8Array(10)))).toEqual(new Uint8Array(10));
});

test('fetches http URLs and retries after a failed load', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response('nope', { status: 404 }))
    .mockResolvedValueOnce(
      new Response(bytes, { headers: { 'content-type': 'application/wasm' } }),
    );
  vi.stubGlobal('fetch', fetchMock);
  const m = await fresh();
  await expect(m.init('https://cdn.example/libdeflate.wasm')).rejects.toThrow(/failed \(404\)/);
  expect(m.isReady()).toBe(false);
  await m.init(new URL('https://cdn.example/libdeflate.wasm'));
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(m.isReady()).toBe(true);
});

test('a file: URL without node:fs gives a clear error', async () => {
  vi.stubGlobal('process', { ...process, getBuiltinModule: undefined });
  const m = await fresh();
  await expect(m.init(pathToFileURL(wasmPath))).rejects.toThrow(/without node:fs/);
});

test('init and initSync in the same tick share one instance', async () => {
  const m = await fresh();
  const data = new TextEncoder().encode('the quick brown fox '.repeat(5000));
  const loading = m.init(bytes);
  m.initSync(bytes);
  const first = m.zlib(data, 12);
  await loading;
  await m.init();
  expect(m.zlib(data, 12)).toEqual(first);
  expect(first.length).toBeLessThan(1000);
});

test('initSync first, then init, does not load again', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  const m = await fresh();
  m.initSync(bytes);
  await m.init('https://cdn.example/libdeflate.wasm');
  expect(fetchMock).not.toHaveBeenCalled();
});

test('a failing init after initSync succeeded does not reject', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('x', { status: 500 })));
  const m = await fresh();
  const loading = m.init('https://cdn.example/libdeflate.wasm');
  m.initSync(bytes);
  await expect(loading).resolves.toBeUndefined();
  expect(m.isReady()).toBe(true);
});
