/**
 * One-off generator for the PWA raster icons.
 *
 * The repo previously shipped 70-byte 1x1 PNGs, which break install prompts and
 * splash screens. This script rasterises the same "sun over a solar panel" mark
 * used in public/icon.svg into real PNGs with zero external dependencies (raw
 * zlib + CRC32 PNG encoding, so it runs in any plain Node environment).
 *
 * Usage: node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'apps', 'web', 'public');

const BG = [15, 23, 42]; // #0f172a slate-900
const AMBER = [245, 158, 11]; // #f59e0b
const LIGHT = [252, 211, 77]; // #fcd34d

/** 4x supersampling for smooth edges without a canvas dependency. */
const SS = 4;

function roundedRectContains(x, y, w, h, r) {
  if (x < 0 || y < 0 || x >= w || y >= h) return false;
  const cx = Math.min(Math.max(x, r), w - r);
  const cy = Math.min(Math.max(y, r), h - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r + 0.0001 || (x >= r && x <= w - r) || (y >= r && y <= h - r);
}

function pointInPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** Renders the mark at `size` into an RGBA Buffer. */
function render(size) {
  const s = size; // design space is 512 -> scale to size
  const k = (v) => (v / 512) * s;

  const rays = [
    [256, 56, 256, 100],
    [256, 412, 256, 456],
    [56, 256, 100, 256],
    [412, 256, 456, 256],
    [115, 115, 146, 146],
    [366, 366, 397, 397],
    [115, 397, 146, 366],
    [366, 146, 397, 115],
  ].map((r) => r.map(k));

  const panel = [
    [190, 210],
    [322, 210],
    [342, 302],
    [170, 302],
  ].map(([x, y]) => [k(x), k(y)]);

  const sunCx = k(256);
  const sunCy = k(256);
  const sunR = k(110);
  const rayW = k(28) / 2;
  const panelStroke = k(8) / 2;

  const out = Buffer.alloc(size * size * 4);
  const denom = SS * SS;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let aSum = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;

          let [r, g, b, a] = [0, 0, 0, 0];

          // Background rounded square
          if (roundedRectContains(px, py, size, size, k(128))) {
            [r, g, b, a] = [...BG, 255];
          } else {
            [r, g, b, a] = [0, 0, 0, 0];
          }

          // Rays
          if (a > 0) {
            for (const [x1, y1, x2, y2] of rays) {
              if (distToSegment(px, py, x1, y1, x2, y2) <= rayW) {
                [r, g, b] = AMBER;
                break;
              }
            }
          }

          // Sun disc
          if (a > 0 && Math.hypot(px - sunCx, py - sunCy) <= sunR) {
            [r, g, b] = AMBER;
          }

          // Panel outline + grid (dark fill, light strokes)
          if (a > 0 && pointInPolygon(px, py, panel)) {
            [r, g, b] = BG;
            const edges = [
              [panel[0], panel[1]],
              [panel[1], panel[2]],
              [panel[2], panel[3]],
              [panel[3], panel[0]],
            ];
            for (const [p1, p2] of edges) {
              if (distToSegment(px, py, p1[0], p1[1], p2[0], p2[1]) <= panelStroke) {
                [r, g, b] = LIGHT;
                break;
              }
            }
            // Vertical + horizontal grid lines
            if (distToSegment(px, py, k(256), k(210), k(256), k(302)) <= panelStroke) {
              [r, g, b] = LIGHT;
            }
            if (distToSegment(px, py, k(180), k(256), k(332), k(256)) <= panelStroke) {
              [r, g, b] = LIGHT;
            }
          }

          rSum += r;
          gSum += g;
          bSum += b;
          aSum += a;
        }
      }

      const idx = (y * size + x) * 4;
      out[idx] = Math.round(rSum / denom);
      out[idx + 1] = Math.round(gSum / denom);
      out[idx + 2] = Math.round(bSum / denom);
      out[idx + 3] = Math.round(aSum / denom);
    }
  }
  return out;
}

// ---- Minimal PNG encoder ---------------------------------------------------
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(rgba, size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512, 180]) {
  const png = encodePng(render(size), size);
  const name = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
  writeFileSync(join(PUBLIC_DIR, name), png);
  console.log(`wrote ${name} (${size}x${size}, ${png.length} bytes)`);
}
