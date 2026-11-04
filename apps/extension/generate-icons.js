import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CRC-32 table generator
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4);
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function generatePng(size) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR: width, height, bitDepth (8), colorType (6: RGBA), comp (0), filter (0), interlace (0)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = createChunk('IHDR', ihdr);

  // Raw RGBA image data with scanline filter byte 0
  const scanlineLength = 1 + size * 4;
  const rawData = Buffer.alloc(size * scanlineLength);

  const radius = size / 2;
  const center = size / 2;

  for (let y = 0; y < size; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter None

    for (let x = 0; x < size; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Rounded emerald background badge with inner flame shape
      if (dist <= radius - 1) {
        // Emerald green: #10B981 (16, 185, 129)
        if (dist > radius - 2) {
          // Antialiased edge
          rawData[pxOffset] = 16;
          rawData[pxOffset + 1] = 185;
          rawData[pxOffset + 2] = 129;
          rawData[pxOffset + 3] = 180;
        } else {
          // Inside emblem: draw bright inner glyph
          const innerDy = dy + (size * 0.1);
          const innerDist = Math.sqrt(dx * dx + innerDy * innerDy);
          if (innerDist < radius * 0.45 && y > size * 0.25) {
            // Dark inner contrast
            rawData[pxOffset] = 15;
            rawData[pxOffset + 1] = 23;
            rawData[pxOffset + 2] = 42;
            rawData[pxOffset + 3] = 255;
          } else {
            rawData[pxOffset] = 16;
            rawData[pxOffset + 1] = 185;
            rawData[pxOffset + 2] = 129;
            rawData[pxOffset + 3] = 255;
          }
        }
      } else {
        // Transparent outside
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.resolve(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 48, 128].forEach((size) => {
  const pngBuf = generatePng(size);
  const filePath = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(filePath, pngBuf);
  console.log(`Generated ${filePath} (${pngBuf.length} bytes)`);
});
