/**
 * Draws the README chart from the totals table in bench/results.md: compressed size against time
 * on the Silesia corpus, time on a log axis, libdeflate-wasm highlighted. Writes two SVGs, one per
 * color scheme, which the README shows through <picture>. No dependencies, no network.
 *
 *   pnpm bench:chart   # after pnpm bench has updated bench/results.md
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OURS = 'libdeflate-wasm';

interface Point {
  name: string;
  label: string;
  mb: number;
  s: number;
  ours: boolean;
  native: boolean;
  /** Where the label sits relative to the dot. */
  anchor: 'start' | 'end';
  dy: number;
}

/** Short labels and label placement per benchmark row (names as printed by bench/run.ts). */
const LABELS: Record<string, [label: string, anchor: Point['anchor'], dy: number]> = {
  'fflate 0.8.3, level 9': ['fflate 9', 'start', -8],
  'pako 3.0.3, level 9': ['pako 9', 'start', 14],
  'node:zlib, level 9': ['node:zlib 9', 'start', 14],
  'CompressionStream deflate (Node)': ['CompressionStream', 'start', -8],
  'libdeflate-wasm, level 6': ['libdeflate-wasm 6', 'start', -8],
  'libdeflate-wasm, level 9': ['libdeflate-wasm 9', 'start', -8],
  'libdeflate-wasm, level 12': ['libdeflate-wasm 12', 'start', -8],
  'native libdeflate 1.26, level 12': ['native libdeflate 12', 'end', 16],
  '@gfx/zopfli 1.0.15, 1 iteration': ['Zopfli, 1 iteration', 'end', -8],
  '@gfx/zopfli 1.0.15, 15 iterations': ['Zopfli, 15 iterations', 'end', 16],
};

function parse(md: string): Point[] {
  const points: Point[] = [];
  const row = /^\| (.+?) \| +(\d+) \| +(-?[\d.]+)% \| +(\d+) ms \|$/;
  for (const line of md.split('\n')) {
    const m = row.exec(line);
    if (!m) continue;
    const name = m[1]!.trim();
    const meta = LABELS[name];
    if (!meta) throw new Error(`no label for "${name}" in bench/chart.ts`);
    points.push({
      name,
      label: meta[0],
      mb: Number(m[2]) / 1e6,
      s: Number(m[4]) / 1000,
      ours: name.startsWith(OURS),
      native: name.startsWith('native'),
      anchor: meta[1],
      dy: meta[2],
    });
  }
  if (points.length === 0) throw new Error('no totals table found in bench/results.md');
  return points;
}

interface Theme {
  bg: string;
  text: string;
  muted: string;
  grid: string;
  other: string;
  ours: string;
}

const THEMES: Record<'light' | 'dark', Theme> = {
  light: {
    bg: '#fcfcfb',
    text: '#0b0b0b',
    muted: '#52514e',
    grid: '#e4e3df',
    other: '#9a9994',
    ours: '#2a78d6',
  },
  dark: {
    bg: '#1a1a19',
    text: '#f0efec',
    muted: '#c3c2b7',
    grid: '#33332f',
    other: '#75746e',
    ours: '#3987e5',
  },
};

const W = 760;
const H = 430;
const PAD = { top: 56, right: 28, bottom: 58, left: 64 };
const FONT = 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';

function svg(points: Point[], t: Theme): string {
  const x0 = PAD.left;
  const x1 = W - PAD.right;
  const y0 = PAD.top;
  const y1 = H - PAD.bottom;
  const minS = 2;
  const maxS = 1000;
  const minMb = Math.floor(Math.min(...points.map((p) => p.mb)));
  const maxMb = Math.ceil(Math.max(...points.map((p) => p.mb)));
  const x = (s: number) =>
    x0 + ((Math.log10(s) - Math.log10(minS)) / Math.log10(maxS / minS)) * (x1 - x0);
  const y = (mb: number) => y1 - ((mb - minMb) / (maxMb - minMb)) * (y1 - y0);
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const out: string[] = [];

  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family='${FONT}' font-size="13">`,
    `<title>Silesia corpus: compressed size against time, one thread</title>`,
    `<rect width="${W}" height="${H}" rx="12" fill="${t.bg}"/>`,
    `<text x="${x0}" y="26" font-size="16" font-weight="500" fill="${t.text}">Silesia corpus, 211.9 MB, one zlib stream per file</text>`,
    `<text x="${x0}" y="44" fill="${t.muted}">Compressed size against time, one thread (Apple M2 Pro). Lower left is better.</text>`,
  );

  // Horizontal grid and the size axis.
  for (let mb = minMb; mb <= maxMb; mb++) {
    const yy = y(mb);
    out.push(
      `<line x1="${x0}" x2="${x1}" y1="${yy}" y2="${yy}" stroke="${t.grid}" stroke-width="1"/>`,
      `<text x="${x0 - 10}" y="${yy + 4}" text-anchor="end" fill="${t.muted}">${mb} MB</text>`,
    );
  }
  // Time axis, log scale.
  for (const s of [2, 5, 10, 20, 50, 100, 200, 500, 1000]) {
    const xx = x(s);
    out.push(
      `<line x1="${xx}" x2="${xx}" y1="${y1}" y2="${y1 + 5}" stroke="${t.muted}" stroke-width="1"/>`,
      `<text x="${xx}" y="${y1 + 20}" text-anchor="middle" fill="${t.muted}">${s} s</text>`,
    );
  }
  out.push(
    `<line x1="${x0}" x2="${x1}" y1="${y1}" y2="${y1}" stroke="${t.muted}" stroke-width="1"/>`,
    `<text x="${(x0 + x1) / 2}" y="${H - 14}" text-anchor="middle" fill="${t.muted}">Time for all 12 files, log scale</text>`,
  );

  // Our three levels joined by a thin line, then every point with its label.
  const ours = points.filter((p) => p.ours).sort((a, b) => a.s - b.s);
  out.push(
    `<polyline fill="none" stroke="${t.ours}" stroke-width="1.5" stroke-dasharray="3 3" points="${ours
      .map((p) => `${x(p.s).toFixed(1)},${y(p.mb).toFixed(1)}`)
      .join(' ')}"/>`,
  );
  for (const p of points) {
    const cx = x(p.s).toFixed(1);
    const cy = y(p.mb).toFixed(1);
    const fill = p.ours ? t.ours : p.native ? t.bg : t.other;
    const stroke = p.native ? t.other : t.bg;
    out.push(
      `<circle cx="${cx}" cy="${cy}" r="${p.ours ? 6 : 5}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`,
    );
    const lx = Number(cx) + (p.anchor === 'start' ? 9 : -9);
    out.push(
      `<text x="${lx}" y="${Number(cy) + p.dy}" text-anchor="${p.anchor}" fill="${p.ours ? t.text : t.muted}" font-weight="${p.ours ? 500 : 400}">${esc(p.label)}</text>`,
      `<text x="${lx}" y="${Number(cy) + p.dy + 13}" text-anchor="${p.anchor}" fill="${t.muted}" font-size="11">${p.mb.toFixed(2)} MB, ${p.s < 100 ? p.s.toFixed(1) : p.s.toFixed(0)} s</text>`,
    );
  }
  out.push('</svg>', '');
  return out.join('\n');
}

const points = parse(readFileSync(join(here, 'results.md'), 'utf8'));
for (const [scheme, theme] of Object.entries(THEMES)) {
  const file = join(here, `silesia-${scheme}.svg`);
  writeFileSync(file, svg(points, theme));
  console.log(`wrote ${file}`);
}
