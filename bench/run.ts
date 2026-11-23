/**
 * Recompresses every /FlateDecode stream of the given PDFs and sums the bytes and the time.
 *
 *   pnpm bench -- a.pdf b.pdf ...
 *
 * PDFs are parsed with @cantoo/pdf-lib (PDF_LIB_FROM=<dir with node_modules/@cantoo/pdf-lib>, it
 * is not a dependency of this package). Streams are inflated with node:zlib, then each contender
 * makes a zlib stream of every one. Native libdeflate runs as one `libdeflate-gzip` process over
 * all streams written to a temp dir (LIBDEFLATE_GZIP=<path>), its gzip size minus 12 bytes is the
 * zlib size (10 + 8 bytes of gzip framing, 2 + 4 bytes of zlib framing).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { deflateSync, inflateSync } from 'node:zlib';
import { zlibSync } from 'fflate';
import { init, zlib } from '../src/index.js';

interface PdfLib {
  PDFDocument: {
    load: (
      b: Uint8Array,
      o: object,
    ) => Promise<{
      context: { enumerateIndirectObjects: () => [unknown, unknown][] };
    }>;
  };
  PDFName: { of: (s: string) => unknown };
  PDFRawStream: new (...a: never[]) => {
    dict: { get: (k: unknown) => unknown };
    contents: Uint8Array;
  };
}

const files = process.argv.slice(2).filter((a) => a !== '--');
if (files.length === 0) {
  console.error('usage: pnpm bench -- file.pdf [...]');
  process.exit(1);
}
const pdfLibFrom = process.env.PDF_LIB_FROM ?? '../handy-tools-2';
const nativeGzip = process.env.LIBDEFLATE_GZIP ?? 'libdeflate-gzip';
const require = createRequire(join(resolve(pdfLibFrom), 'package.json'));
const { PDFDocument, PDFName, PDFRawStream } = require('@cantoo/pdf-lib') as PdfLib;

async function streamsOf(file: string): Promise<{ original: number; raw: Uint8Array[] }> {
  const doc = await PDFDocument.load(readFileSync(file), { ignoreEncryption: true });
  let original = 0;
  const raw: Uint8Array[] = [];
  for (const [, o] of doc.context.enumerateIndirectObjects()) {
    if (!(o instanceof PDFRawStream)) continue;
    if (String(o.dict.get(PDFName.of('Filter'))) !== '/FlateDecode') continue;
    try {
      raw.push(new Uint8Array(inflateSync(o.contents)));
      original += o.contents.length;
    } catch {
      // Broken or predictor-only streams are skipped, like the Compress PDF engine does.
    }
  }
  return { original, raw };
}

type Contender = [name: string, run: (d: Uint8Array) => Uint8Array];

await init();
const contenders: Contender[] = [
  ['fflate 0.8.3 level 9', (d) => zlibSync(d, { level: 9 })],
  ['node:zlib level 9', (d) => deflateSync(d, { level: 9 })],
  ['libdeflate-wasm level 6', (d) => zlib(d, 6)],
  ['libdeflate-wasm level 9', (d) => zlib(d, 9)],
  ['libdeflate-wasm level 12', (d) => zlib(d, 12)],
];

function native(raw: Uint8Array[]): { bytes: number; ms: number } {
  const dir = mkdtempSync(join(tmpdir(), 'ldw-bench-'));
  try {
    mkdirSync(dir, { recursive: true });
    const paths = raw.map((d, i) => {
      const p = join(dir, `s${i}`);
      writeFileSync(p, d);
      return p;
    });
    const t = performance.now();
    execFileSync(nativeGzip, ['-12', '-k', '-f', ...paths]);
    const ms = performance.now() - t;
    const bytes = paths.reduce((sum, p) => sum + statSync(`${p}.gz`).size - 12, 0);
    return { bytes, ms };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const totals = new Map<string, { bytes: number; ms: number }>();
const add = (name: string, bytes: number, ms: number): void => {
  const t = totals.get(name) ?? { bytes: 0, ms: 0 };
  totals.set(name, { bytes: t.bytes + bytes, ms: t.ms + ms });
};
const rows: string[] = [];
let originalTotal = 0;
let rawTotal = 0;

for (const file of files) {
  const { original, raw } = await streamsOf(file);
  const rawBytes = raw.reduce((s, d) => s + d.length, 0);
  originalTotal += original;
  rawTotal += rawBytes;
  const cells: string[] = [];
  for (const [name, run] of contenders) {
    for (const d of raw.slice(0, 3)) run(d); // warm up the JIT and the cached compressor
    let bytes = 0;
    const t = performance.now();
    for (const d of raw) bytes += run(d).length;
    const ms = performance.now() - t;
    add(name, bytes, ms);
    cells.push(`${name}: ${bytes} B ${ms.toFixed(0)} ms`);
  }
  const n = native(raw);
  add('native libdeflate 1.26 level 12', n.bytes, n.ms);
  rows.push(
    `${basename(file)}: ${raw.length} streams, ${original} B in the file, ${rawBytes} B raw`,
  );
  rows.push(`  ${cells.join(' | ')} | native 12: ${n.bytes} B ${n.ms.toFixed(0)} ms`);
}

console.log(rows.join('\n'));
console.log(
  `\nAll files: ${originalTotal} B of Flate streams in the PDFs, ${rawTotal} B inflated\n`,
);
console.log('| Compressor | Bytes | vs fflate 9 | Time |');
console.log('|---|---:|---:|---:|');
const base = totals.get('fflate 0.8.3 level 9')!.bytes;
for (const [name, { bytes, ms }] of totals) {
  const pct = ((bytes / base - 1) * 100).toFixed(2);
  console.log(`| ${name} | ${bytes} | ${pct}% | ${ms.toFixed(0)} ms |`);
}
