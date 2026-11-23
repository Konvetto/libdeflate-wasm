/**
 * Compresses every file of the Silesia corpus as one zlib stream per file and sums bytes and time.
 *
 *   ./bench/fetch-silesia.sh   # once: downloads the corpus into bench/silesia (gitignored)
 *   pnpm bench                 # or: pnpm bench -- <dir with the corpus files>
 *
 * Env: LIBDEFLATE_GZIP=<path> native libdeflate-gzip (default: libdeflate-gzip from PATH),
 * ZOPFLI_15=1 adds Zopfli at 15 iterations (default is 1; 15 takes very long on 211 MB).
 * Native libdeflate runs as one `libdeflate-gzip` process per file; its gzip size minus 12 bytes
 * is the zlib size (10 + 8 bytes of gzip framing, 2 + 4 bytes of zlib framing).
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { deflateSync } from 'node:zlib';
import { zlibAsync as zopfli } from '@gfx/zopfli';
import { zlibSync } from 'fflate';
import { deflate as pakoDeflate } from 'pako';
import { init, zlib } from '../src/index.js';

const dir = resolve(process.argv.slice(2).find((a) => a !== '--') ?? 'bench/silesia');
const nativeGzip = process.env.LIBDEFLATE_GZIP ?? 'libdeflate-gzip';
const files = readdirSync(dir)
  .filter((f) => statSync(join(dir, f)).isFile())
  .sort();
if (files.length === 0) {
  console.error('no files in', dir, '(run ./bench/fetch-silesia.sh)');
  process.exit(1);
}

type Contender = [name: string, run: (d: Uint8Array) => Uint8Array | Promise<Uint8Array>];

// CompressionStream('deflate') writes a zlib stream, like the browsers do (the output can differ
// slightly by engine; this is the one built into Node).
async function webStream(d: Uint8Array): Promise<Uint8Array> {
  const out = new Blob([d as BlobPart]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(out).arrayBuffer());
}

const NATIVE = 'native libdeflate 1.26, level 12';
await init();
const contenders: Contender[] = [
  ['fflate 0.8.3, level 9', (d) => zlibSync(d, { level: 9 })],
  ['pako 3.0.3, level 9', (d) => pakoDeflate(d, { level: 9 })],
  ['node:zlib, level 9', (d) => deflateSync(d, { level: 9 })],
  ['CompressionStream deflate (Node)', webStream],
  ['libdeflate-wasm, level 6', (d) => zlib(d, 6)],
  ['libdeflate-wasm, level 9', (d) => zlib(d, 9)],
  ['libdeflate-wasm, level 12', (d) => zlib(d, 12)],
  [NATIVE, () => new Uint8Array()], // measured by `native` below
  ['@gfx/zopfli 1.0.15, 1 iteration', (d) => zopfli(d, { numiterations: 1 })],
];
if (process.env.ZOPFLI_15) {
  contenders.push(['@gfx/zopfli 1.0.15, 15 iterations', (d) => zopfli(d, { numiterations: 15 })]);
}

function native(file: string): { bytes: number; ms: number } {
  const t = performance.now();
  const gz = execFileSync(nativeGzip, ['-12', '-c', file], {
    maxBuffer: 1 << 30,
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  return { bytes: gz.length - 12, ms: performance.now() - t };
}

const totals = new Map(contenders.map(([n]) => [n, { bytes: 0, ms: 0 }]));
const perFile: string[] = [];
let rawTotal = 0;

for (const f of files) {
  const data = new Uint8Array(readFileSync(join(dir, f)));
  rawTotal += data.length;
  const cells: string[] = [];
  for (const [name, run] of contenders) {
    let bytes: number;
    let ms: number;
    if (name === NATIVE) {
      ({ bytes, ms } = native(join(dir, f)));
    } else {
      const t = performance.now();
      bytes = (await run(data)).length;
      ms = performance.now() - t;
    }
    const tot = totals.get(name)!;
    tot.bytes += bytes;
    tot.ms += ms;
    cells.push(`${name}: ${bytes} B ${ms.toFixed(0)} ms`);
  }
  perFile.push(`${f}: ${data.length} B\n  ${cells.join('\n  ')}`);
  console.error(`${f} done`);
}

console.log(perFile.join('\n'));
console.log(`\nAll files: ${files.length} files, ${rawTotal} B\n`);
console.log('| Compressor | Bytes | vs fflate 9 | Time |');
console.log('|---|---:|---:|---:|');
const base = totals.get('fflate 0.8.3, level 9')!.bytes;
for (const [name, { bytes, ms }] of totals) {
  const pct = ((bytes / base - 1) * 100).toFixed(2);
  console.log(`| ${name} | ${bytes} | ${pct}% | ${ms.toFixed(0)} ms |`);
}
