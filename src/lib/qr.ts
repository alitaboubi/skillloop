/**
 * QR code encoder for the Pro card (no dependency): byte mode, error correction level M (15 % recovery — enough for a
 * printed card or sticker), versions 1–15 (up to 412 bytes; a profile link is ~80). Follows ISO/IEC 18004: Reed–Solomon
 * over GF(256), block interleaving, the 8 masks scored with the standard penalty rules. Tested in src/test/qr.test.ts.
 */

export type QrCode = { size: number; version: number; mask: number; dark: (x: number, y: number) => boolean };

// Level M per version: [EC codewords per block, blocks in group 1, data codewords each, blocks in group 2, data each].
const M_BLOCKS: readonly (readonly [number, number, number, number, number])[] = [
  [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0], [24, 2, 43, 0, 0],
  [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39], [22, 3, 36, 2, 37], [26, 4, 43, 1, 44],
  [30, 1, 50, 4, 51], [22, 6, 36, 2, 37], [22, 8, 37, 1, 38], [24, 4, 40, 5, 41], [24, 5, 41, 5, 42],
];
const ALIGN: readonly (readonly number[])[] = [
  [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
  [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70],
];
export const QR_MAX_VERSION = M_BLOCKS.length;
const EC_M_BITS = 0b00;

/* ---------- Reed–Solomon over GF(256), polynomial 0x11D ---------- */

function gfMul(a: number, b: number): number {
  let r = 0;
  for (let i = 7; i >= 0; i--) {
    r = (r << 1) ^ ((r >>> 7) * 0x11d);
    r ^= ((b >>> i) & 1) * a;
  }
  return r & 0xff;
}

function rsDivisor(degree: number): number[] {
  const out = new Array<number>(degree).fill(0);
  out[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      out[j] = gfMul(out[j]!, root);
      if (j + 1 < degree) out[j] = out[j]! ^ out[j + 1]!;
    }
    root = gfMul(root, 0x02);
  }
  return out;
}

/** Error-correction codewords for one block (exported for the known-vector test). */
export function rsRemainder(data: readonly number[], degree: number): number[] {
  const div = rsDivisor(degree);
  const out = new Array<number>(degree).fill(0);
  for (const b of data) {
    const factor = b ^ out.shift()!;
    out.push(0);
    for (let i = 0; i < degree; i++) out[i] = out[i]! ^ gfMul(div[i]!, factor);
  }
  return out;
}

/* ---------- Data codewords ---------- */

const dataCodewords = (v: number) => { const [, b1, d1, b2, d2] = M_BLOCKS[v - 1]!; return b1 * d1 + b2 * d2; };
const countBits = (v: number) => (v <= 9 ? 8 : 16);

/** Smallest version that holds `bytes` in byte mode at level M, or null when too long. */
export function qrVersionFor(bytes: number): number | null {
  for (let v = 1; v <= QR_MAX_VERSION; v++) if (4 + countBits(v) + bytes * 8 <= dataCodewords(v) * 8) return v;
  return null;
}

function buildCodewords(bytes: Uint8Array, v: number): number[] {
  const bits: number[] = [];
  const put = (val: number, len: number) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(0b0100, 4);
  put(bytes.length, countBits(v));
  for (const b of bytes) put(b, 8);
  const capacity = dataCodewords(v) * 8;
  put(0, Math.min(4, capacity - bits.length));
  put(0, (8 - (bits.length % 8)) % 8);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let pad = 0xec; data.length < capacity / 8; pad ^= 0xec ^ 0x11) data.push(pad);

  const [ec, b1, d1, b2, d2] = M_BLOCKS[v - 1]!;
  const blocks: { data: number[]; ecc: number[] }[] = [];
  let k = 0;
  for (let i = 0; i < b1 + b2; i++) {
    const len = i < b1 ? d1 : d2;
    const part = data.slice(k, k + len);
    k += len;
    blocks.push({ data: part, ecc: rsRemainder(part, ec) });
  }
  const out: number[] = [];
  for (let i = 0; i < Math.max(d1, d2); i++) for (const bl of blocks) if (i < bl.data.length) out.push(bl.data[i]!);
  for (let i = 0; i < ec; i++) for (const bl of blocks) out.push(bl.ecc[i]!);
  return out;
}

/* ---------- Matrix ---------- */

const MASKS: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/** 15 format bits for level M and a mask: BCH(15,5) with generator 0x537, XORed with 0x5412. */
export function formatBits(mask: number): number {
  const data = (EC_M_BITS << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

/** 18 version bits (versions ≥ 7): BCH(18,6) with generator 0x1F25. */
export function versionBits(v: number): number {
  let rem = v;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  return (v << 12) | rem;
}

class Grid {
  readonly cells: boolean[][];
  readonly fixed: boolean[][];
  constructor(readonly size: number) {
    this.cells = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
    this.fixed = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  }
  set(x: number, y: number, dark: boolean) { this.cells[y]![x] = dark; this.fixed[y]![x] = true; }
}

function drawFunctionPatterns(g: Grid, v: number) {
  const n = g.size;
  for (let i = 0; i < n; i++) { g.set(6, i, i % 2 === 0); g.set(i, 6, i % 2 === 0); }
  for (const [cx, cy] of [[3, 3], [n - 4, 3], [3, n - 4]] as const) {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= n || y >= n) continue;
      const d = Math.max(Math.abs(dx), Math.abs(dy));
      g.set(x, y, d !== 2 && d !== 4);
    }
  }
  const pos = ALIGN[v - 1]!;
  const last = pos.length - 1;
  pos.forEach((cx, i) => pos.forEach((cy, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) g.set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));
  drawFormat(g, 0); // reserves the format areas; redrawn with the chosen mask
  if (v >= 7) {
    const bits = versionBits(v);
    for (let i = 0; i < 18; i++) {
      const bit = ((bits >>> i) & 1) === 1;
      const a = n - 11 + (i % 3), b = Math.floor(i / 3);
      g.set(a, b, bit);
      g.set(b, a, bit);
    }
  }
}

function drawFormat(g: Grid, mask: number) {
  const n = g.size;
  const bits = formatBits(mask);
  const bit = (i: number) => ((bits >>> i) & 1) === 1;
  for (let i = 0; i <= 5; i++) g.set(8, i, bit(i));
  g.set(8, 7, bit(6));
  g.set(8, 8, bit(7));
  g.set(7, 8, bit(8));
  for (let i = 9; i < 15; i++) g.set(14 - i, 8, bit(i));
  for (let i = 0; i < 8; i++) g.set(n - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) g.set(8, n - 15 + i, bit(i));
  g.set(8, n - 8, true); // the always-dark module
}

function drawCodewords(g: Grid, words: readonly number[]) {
  const n = g.size;
  let i = 0;
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < n; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const y = ((right + 1) & 2) === 0 ? n - 1 - vert : vert;
        if (g.fixed[y]![x] || i >= words.length * 8) continue;
        g.cells[y]![x] = ((words[i >>> 3]! >>> (7 - (i & 7))) & 1) === 1;
        i++;
      }
    }
  }
}

function applyMask(g: Grid, mask: number) {
  const f = MASKS[mask]!;
  for (let y = 0; y < g.size; y++) for (let x = 0; x < g.size; x++) if (!g.fixed[y]![x] && f(x, y)) g.cells[y]![x] = !g.cells[y]![x];
}

/** Standard penalty score (lower is easier to scan). */
export function penalty(cells: readonly (readonly boolean[])[]): number {
  const n = cells.length;
  const at = (x: number, y: number, col: boolean) => (col ? cells[x]![y]! : cells[y]![x]!);
  let score = 0;
  const finderA = [true, false, true, true, true, false, true, false, false, false, false];
  const finderB = [...finderA].reverse();
  for (const col of [false, true]) {
    for (let y = 0; y < n; y++) {
      let run = 1;
      for (let x = 1; x <= n; x++) {
        if (x < n && at(x, y, col) === at(x - 1, y, col)) { run++; continue; }
        if (run >= 5) score += 3 + (run - 5);
        run = 1;
      }
      for (let x = 0; x + 11 <= n; x++) {
        for (const p of [finderA, finderB]) if (p.every((v, k) => at(x + k, y, col) === v)) score += 40;
      }
    }
  }
  for (let y = 0; y + 1 < n; y++) for (let x = 0; x + 1 < n; x++) {
    const c = cells[y]![x];
    if (c === cells[y]![x + 1] && c === cells[y + 1]![x] && c === cells[y + 1]![x + 1]) score += 3;
  }
  const dark = cells.reduce((a, row) => a + row.filter(Boolean).length, 0);
  score += 10 * Math.floor(Math.abs((dark * 100) / (n * n) - 50) / 5);
  return score;
}

/** Encodes text (UTF-8). Throws "qr_too_long" past version 15. */
export function encodeQr(text: string): QrCode {
  const bytes = new TextEncoder().encode(text);
  const version = qrVersionFor(bytes.length);
  if (version === null) throw new Error("qr_too_long");
  const size = version * 4 + 17;
  const words = buildCodewords(bytes, version);
  let best: { grid: Grid; mask: number; score: number } | null = null;
  for (let mask = 0; mask < 8; mask++) {
    const g = new Grid(size);
    drawFunctionPatterns(g, version);
    drawCodewords(g, words);
    applyMask(g, mask);
    drawFormat(g, mask);
    const score = penalty(g.cells);
    if (!best || score < best.score) best = { grid: g, mask, score };
  }
  const cells = best!.grid.cells;
  return { size, version, mask: best!.mask, dark: (x, y) => x >= 0 && y >= 0 && x < size && y < size && cells[y]![x]! };
}

/** One SVG path ("M x y h1 v1 h-1 z" per dark module) in module units, offset by a quiet zone of `margin` modules. */
export function qrPath(qr: QrCode, margin = 4): string {
  let d = "";
  for (let y = 0; y < qr.size; y++) for (let x = 0; x < qr.size; x++) if (qr.dark(x, y)) d += `M${x + margin} ${y + margin}h1v1h-1z`;
  return d;
}
