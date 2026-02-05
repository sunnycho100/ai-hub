/**
 * Quick script to generate placeholder PNG icons for the Chrome extension.
 * Run: node extension/icons/generate.js
 *
 * Creates simple solid-color PNG files at 16x16, 48x48, and 128x128.
 * Uses raw PNG binary (no dependencies).
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function createPNG(size) {
  // Create a simple single-color PNG (dark gray #111827)
  const r = 17, g = 24, b = 39; // #111827

  // Raw pixel data: each row starts with filter byte (0 = None)
  const rawData = [];
  for (let y = 0; y < size; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < size; x++) {
      // Rounded corner effect
      const margin = Math.floor(size * 0.15);
      const cornerRadius = Math.floor(size * 0.2);
      const inBounds =
        x >= margin - 1 && x < size - margin + 1 &&
        y >= margin - 1 && y < size - margin + 1;

      if (inBounds) {
        rawData.push(r, g, b, 255); // RGBA
      } else {
        rawData.push(0, 0, 0, 0); // transparent
      }
    }
  }

  const deflated = zlib.deflateSync(Buffer.from(rawData));

  // Build PNG file
  const chunks = [];

  // Signature
  chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);  // width
  ihdr.writeUInt32BE(size, 4);  // height
  ihdr.writeUInt8(8, 8);         // bit depth
  ihdr.writeUInt8(6, 9);         // color type (RGBA)
  ihdr.writeUInt8(0, 10);        // compression
  ihdr.writeUInt8(0, 11);        // filter
  ihdr.writeUInt8(0, 12);        // interlace
  chunks.push(makeChunk("IHDR", ihdr));

  // IDAT
  chunks.push(makeChunk("IDAT", deflated));

  // IEND
  chunks.push(makeChunk("IEND", Buffer.alloc(0)));

  return Buffer.concat(chunks);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, "ascii");
  const crcData = Buffer.concat([typeBuffer, data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);

  return Buffer.concat([len, typeBuffer, data, crc]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc >>>= 1;
      }
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Generate icons
const dir = path.dirname(__filename || __dirname);
for (const size of [16, 48, 128]) {
  const png = createPNG(size);
  const filePath = path.join(dir, `icon${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Created ${filePath} (${png.length} bytes)`);
}
