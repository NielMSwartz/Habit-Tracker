/**
 * scripts/generate-icons.mjs
 * ---------------------------------------------------------------------------
 * Generates the PWA icons.
 *
 * The icons are drawn from scratch — no image library is needed. The script
 * writes real PNG files by encoding the pixel buffer itself (PNG = signature
 * + IHDR + zlib-compressed IDAT + IEND), using only Node's built-in `zlib`.
 *
 * Run it with:
 *
 *     node scripts/generate-icons.mjs
 *
 * The output lands in `public/icons/`:
 *
 * | File                   | Size | Purpose                                  |
 * |------------------------|------|------------------------------------------|
 * | `icon-192.png`         | 192  | Android launcher / notification icon     |
 * | `icon-512.png`         | 512  | Splash screen / PWA icon                 |
 * | `maskable-512.png`     | 512  | Android adaptive icon (safe zone)        |
 * | `apple-touch-icon.png` | 180  | iOS home-screen icon                     |
 * | `badge.png`            | 96   | Monochrome status-bar badge              |
 */

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** The folder this script lives in. */
const HERE = dirname(fileURLToPath(import.meta.url));

/** The folder the icons are written to. */
const OUTPUT_DIR = join(HERE, "..", "public", "icons");

/** The hue the brand gradient starts at. */
const BASE_HUE = 265;

/* -------------------------------------------------------------------------- */
/* PNG encoding                                                               */
/* -------------------------------------------------------------------------- */

/** The CRC-32 lookup table, built once. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

/**
 * Computes the CRC-32 checksum of a buffer.
 *
 * @param {Buffer} buffer The bytes to checksum.
 * @returns {number} The checksum.
 */
function crc32(buffer) {
  let crc = 0xffffffff;
  for (let index = 0; index < buffer.length; index += 1) {
    crc = CRC_TABLE[(crc ^ buffer[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Builds one PNG chunk.
 *
 * @param {string} type The four character chunk type.
 * @param {Buffer} data The chunk payload.
 * @returns {Buffer} The complete chunk.
 */
function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

/**
 * Encodes an RGBA pixel buffer as a PNG file.
 *
 * @param {number} width  The image width in pixels.
 * @param {number} height The image height in pixels.
 * @param {Uint8Array} pixels The RGBA bytes, row by row.
 * @returns {Buffer} The PNG file.
 */
function encodePng(width, height, pixels) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);

  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter type: none
    Buffer.from(pixels.buffer, pixels.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    );
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: truecolour with alpha
  header[10] = 0; // compression
  header[11] = 0; // filter
  header[12] = 0; // interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* -------------------------------------------------------------------------- */
/* Drawing                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Converts an OKLCH colour to sRGB.
 *
 * @param {number} lightness The lightness, 0–1.
 * @param {number} chroma    The chroma, 0–0.4.
 * @param {number} hue       The hue in degrees.
 * @returns {[number, number, number]} The red, green and blue channels, 0–255.
 */
function oklchToRgb(lightness, chroma, hue) {
  const radians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);

  const lPrime = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = lightness - 0.0894841775 * a - 1.291485548 * b;

  const l = lPrime ** 3;
  const m = mPrime ** 3;
  const s = sPrime ** 3;

  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];

  return linear.map((value) => {
    const clamped = Math.max(0, Math.min(1, value));
    const encoded =
      clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055;
    return Math.round(Math.max(0, Math.min(1, encoded)) * 255);
  });
}

/**
 * Smoothly blends between two edges.
 *
 * @param {number} edge0 The inner edge.
 * @param {number} edge1 The outer edge.
 * @param {number} value The value to test.
 * @returns {number} 0 below the inner edge, 1 above the outer edge.
 */
function smoothstep(edge0, edge1, value) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Draws the app icon.
 *
 * The icon is a rounded square filled with a diagonal chromatic gradient, on
 * top of which a white "C" (an open ring) is drawn. A small dot in the gap
 * of the C completes the mark.
 *
 * @param {number} size The width and height of the icon in pixels.
 * @param {object} options
 * @param {boolean} options.maskable When true the background covers the full
 *   square and the mark is scaled into the 80% safe zone.
 * @param {boolean} options.monochrome When true only the white mark is drawn
 *   on a transparent background (used for the Android status-bar badge).
 * @returns {Uint8Array} The RGBA pixel buffer.
 */
function drawIcon(size, { maskable = false, monochrome = false } = {}) {
  const pixels = new Uint8Array(size * size * 4);
  const radius = maskable ? 0 : size * 0.22;
  const markScale = maskable ? 0.62 : 1;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const v = y / size;
      const offset = (size - 1) * 0.5;

      // --- background ---------------------------------------------------
      const dx = Math.max(radius - x, 0, x - (size - 1 - radius));
      const dy = Math.max(radius - y, 0, y - (size - 1 - radius));
      const cornerDistance = Math.hypot(dx, dy);
      const backgroundAlpha = maskable
        ? 1
        : 1 - smoothstep(radius - 1.5, radius + 0.5, cornerDistance);

      const t = Math.max(0, Math.min(1, (u + v) / 2));
      const [red, green, blue] = oklchToRgb(0.66 - 0.18 * t, 0.17, BASE_HUE + 55 * t);

      // --- the "C" ------------------------------------------------------
      const cx = (x - offset) * markScale;
      const cy = (y - offset) * markScale;
      const distance = Math.hypot(cx, cy);

      const outerRadius = size * 0.26;
      const innerRadius = size * 0.17;

      const ring = smoothstep(innerRadius - 1.2, innerRadius + 0.4, distance) *
        (1 - smoothstep(outerRadius - 0.4, outerRadius + 1.2, distance));

      // The gap on the right side turns the ring into a "C".
      const angle = Math.atan2(cy, cx);
      const inGap = Math.abs(angle) < 0.72;

      // The dot that closes the mark.
      const dotDistance = Math.hypot(cx - outerRadius * 0.92, cy);
      const dot = 1 - smoothstep(size * 0.028, size * 0.038, dotDistance);

      const mark = Math.max(inGap ? 0 : ring, dot);

      // --- compose ------------------------------------------------------
      let outRed = red;
      let outGreen = green;
      let outBlue = blue;
      let alpha = backgroundAlpha;

      if (monochrome) {
        outRed = 255;
        outGreen = 255;
        outBlue = 255;
        alpha = mark;
      } else {
        const mix = mark * backgroundAlpha;
        outRed = Math.round(red * (1 - mix) + 255 * mix);
        outGreen = Math.round(green * (1 - mix) + 255 * mix);
        outBlue = Math.round(blue * (1 - mix) + 255 * mix);
      }

      const index = (y * size + x) * 4;
      pixels[index] = outRed;
      pixels[index + 1] = outGreen;
      pixels[index + 2] = outBlue;
      pixels[index + 3] = Math.round(alpha * 255);
    }
  }

  return pixels;
}

/* -------------------------------------------------------------------------- */
/* Output                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Writes one icon to disk.
 *
 * @param {string} name The file name.
 * @param {number} size The size in pixels.
 * @param {object} options The drawing options.
 */
function writeIcon(name, size, options) {
  const pixels = drawIcon(size, options);
  const png = encodePng(size, size, pixels);
  const target = join(OUTPUT_DIR, name);
  writeFileSync(target, png);
  console.log(`✓ ${name} (${size}×${size}, ${(png.length / 1024).toFixed(1)} kB)`);
}

mkdirSync(OUTPUT_DIR, { recursive: true });

writeIcon("icon-192.png", 192, {});
writeIcon("icon-512.png", 512, {});
writeIcon("maskable-512.png", 512, { maskable: true });
writeIcon("apple-touch-icon.png", 180, {});
writeIcon("badge.png", 96, { monochrome: true });

console.log(`\nIcons written to ${OUTPUT_DIR}`);
