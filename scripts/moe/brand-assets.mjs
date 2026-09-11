#!/usr/bin/env node
// Package the generated family artwork with Expo's pinned image tooling.
// The mascot stays a bitmap; the system monochrome mark is a real vector.
import { deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const target = new URL('../../apps/mobile/moe/brand/', import.meta.url);
const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const sourcePath = fileURLToPath(new URL('family-mascot-v1-source.png', target));
process.env.EXPO_IMAGE_UTILS_NO_SHARP = '1';
const { generateImageAsync, generateImageBackgroundAsync, compositeImagesAsync } = await import('@expo/image-utils');
const options = { projectRoot, cacheType: 'todo-moe-family-v1' };
const backgroundColor = '#0D141B';
const icon = await generateImageAsync(options, { src: sourcePath, width: 1024, height: 1024, resizeMode: 'contain', backgroundColor, removeTransparency: true });
writeFileSync(fileURLToPath(new URL('icon.png', target)), icon.source);
// Adaptive foreground is an inset artwork, preserving the bell and clipboard
// under the launcher's circular/squircle masks (108dp layer / 72dp mask).
const foreground = await generateImageAsync(options, { src: sourcePath, width: 676, height: 676, resizeMode: 'contain', backgroundColor, removeTransparency: true });
const background = await generateImageBackgroundAsync({ width: 1024, height: 1024, resizeMode: 'contain', backgroundColor });
writeFileSync(fileURLToPath(new URL('foreground.png', target)), await compositeImagesAsync({ foreground: foreground.source, background, x: 174, y: 174 }));
function crc32(data) { let crc = 0xffffffff; for (const byte of data) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const name = Buffer.from(type); const n = Buffer.alloc(4); n.writeUInt32BE(data.length); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([name, data]))); return Buffer.concat([n, name, data, crc]); }
function distance(x, y, ax, ay, bx, by) { const t = Math.max(0, Math.min(1, ((x-ax)*(bx-ax)+(y-ay)*(by-ay))/((bx-ax)**2+(by-ay)**2))); return Math.hypot(x-ax-t*(bx-ax), y-ay-t*(by-ay)); }
const size = 512; const bytes = Buffer.alloc((size * 4 + 1) * size);
for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
  const ink = Math.hypot(x - 341, y - 164) < 23 || Math.min(distance(x,y,170,260,231,321), distance(x,y,231,321,342,213)) < 23;
  bytes.set(ink ? [0,0,0,255] : [0,0,0,0], y * (size * 4 + 1) + 1 + x * 4);
}
const header = Buffer.alloc(13); header.writeUInt32BE(size); header.writeUInt32BE(size,4); header[8]=8; header[9]=6;
writeFileSync(fileURLToPath(new URL('monochrome.png', target)), Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(bytes)),chunk('IEND',Buffer.alloc(0))]));
writeFileSync(fileURLToPath(new URL('monochrome.svg', target)), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="m170 260 61 61 111-108" fill="none" stroke="black" stroke-width="46" stroke-linecap="round" stroke-linejoin="round"/><circle cx="341" cy="164" r="23"/></svg>\n');
const files = ['family-mascot-v1-source.png','icon.png','foreground.png','monochrome.png','monochrome.svg'];
writeFileSync(fileURLToPath(new URL('asset-manifest.json', target)), JSON.stringify({ artwork: 'family-mascot-checklist-v1', generator: 'built-in image_gen', packaging: 'Node 22 / pinned Expo image-utils Jimp backend', files: files.map(file => { const b = readFileSync(fileURLToPath(new URL(file,target))); return { file, bytes:b.length, sha256:createHash('sha256').update(b).digest('hex') }; }) }, null, 2)+'\n');
console.log('Packaged Todo Moe family icon, adaptive foreground and monochrome check mark.');
