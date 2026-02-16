/**
 * Quick script to generate PNG icons for the Chrome extension.
 * Run: node extension/icons/generate.js
 *
 * Creates AI Hub branded icons at 16x16, 48x48, and 128x128.
 * Matches the app's top-left logo: indigo rounded box with letter "A".
 * Uses raw PNG binary (no dependencies).
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function createPNG(size) {
  // AI Hub brand colors matching the sidebar logo
  // Background: indigo/primary tone (#6366f1 with slight darkening for icon clarity)
  const bgR = 99, bgG = 102, bgB = 241; // #6366f1 (primary indigo)
  // Letter "A" color: white
  const fgR = 255, fgG = 255, fgB = 255;

  const radius = Math.floor(size * 0.18); // rounded corner radius

  // Raw pixel data: each row starts with filter byte (0 = None)
  const rawData = [];
  for (let y = 0; y < size; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < size; x++) {
      // Check if pixel is inside rounded rectangle
      const inRoundedRect = isInsideRoundedRect(x, y, size, size, radius);

      if (inRoundedRect) {
        // Check if pixel is part of the letter "A"
        if (isLetterA(x, y, size)) {
          rawData.push(fgR, fgG, fgB, 255); // white letter
        } else {
          rawData.push(bgR, bgG, bgB, 255); // indigo background
        }
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

// Check if point (x,y) is inside a rounded rectangle
function isInsideRoundedRect(x, y, w, h, r) {
  // Check four corners
  if (x < r && y < r) {
    return (r - x) * (r - x) + (r - y) * (r - y) <= r * r;
  }
  if (x >= w - r && y < r) {
    return (x - (w - r - 1)) * (x - (w - r - 1)) + (r - y) * (r - y) <= r * r;
  }
  if (x < r && y >= h - r) {
    return (r - x) * (r - x) + (y - (h - r - 1)) * (y - (h - r - 1)) <= r * r;
  }
  if (x >= w - r && y >= h - r) {
    return (x - (w - r - 1)) * (x - (w - r - 1)) + (y - (h - r - 1)) * (y - (h - r - 1)) <= r * r;
  }
  return true; // inside the non-corner area
}

// Check if point (x,y) is part of a bold "A" letter centered in the icon
function isLetterA(x, y, size) {
  // Normalize to 0-1 coordinate space
  const nx = x / size;
  const ny = y / size;

  // Letter region (centered, with padding)
  const padX = 0.22;
  const padTop = 0.18;
  const padBot = 0.82;

  // Only draw within the letter bounding box
  if (nx < padX || nx > 1 - padX || ny < padTop || ny > padBot) return false;

  // Relative position within the letter box
  const lx = (nx - padX) / (1 - 2 * padX); // 0..1 within letter width
  const ly = (ny - padTop) / (padBot - padTop); // 0..1 within letter height

  // Stroke thickness (relative to letter size, bold)
  const stroke = size <= 16 ? 0.22 : 0.16;

  // Left leg of A: line from (0.1, 1.0) to (0.5, 0.0)
  const leftCenter = 0.1 + (0.5 - 0.1) * (1 - ly);
  const onLeft = Math.abs(lx - leftCenter) < stroke;

  // Right leg of A: line from (0.9, 1.0) to (0.5, 0.0)
  const rightCenter = 0.9 + (0.5 - 0.9) * (1 - ly);
  const onRight = Math.abs(lx - rightCenter) < stroke;

  // Crossbar of A: horizontal bar at ~55% height
  const barY = 0.55;
  const barThickness = size <= 16 ? 0.14 : 0.10;
  const barLeft = 0.1 + (0.5 - 0.1) * (1 - barY) - stroke * 0.3;
  const barRight = 0.9 + (0.5 - 0.9) * (1 - barY) + stroke * 0.3;
  const onBar = Math.abs(ly - barY) < barThickness && lx > barLeft && lx < barRight;

  return onLeft || onRight || onBar;
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
