#!/usr/bin/env node
// Original code-drawn placeholder. This is not the user's missing family logo.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const target = new URL('../../apps/mobile/moe/brand/', import.meta.url);
function crc32(data) { let crc = 0xffffffff; for (const byte of data) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const name = Buffer.from(type); const n = Buffer.alloc(4); n.writeUInt32BE(data.length); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([name, data]))); return Buffer.concat([n, name, data, crc]); }
function distance(x, y, ax, ay, bx, by) { const t = Math.max(0, Math.min(1, ((x-ax)*(bx-ax)+(y-ay)*(by-ay))/((bx-ax)**2+(by-ay)**2))); return Math.hypot(x-ax-t*(bx-ax), y-ay-t*(by-ay)); }
for (const [name, transparent, mono] of [['icon.png', false, false], ['foreground.png', true, false], ['monochrome.png', true, true]]) {
    const size = 512; const bytes = Buffer.alloc((size * 4 + 1) * size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const dot = Math.hypot(x - 341, y - 164) < 23;
        const check = Math.min(distance(x,y,170,260,231,321), distance(x,y,231,321,342,213)) < 23;
        const circle = Math.hypot(x - 256,y - 256) < 183;
        const p = y * (size * 4 + 1) + 1 + x * 4;
        const color = check || dot ? (mono ? [0,0,0,255] : [109,86,210,255]) : circle && !mono ? [255,255,255,transparent ? 230 : 255] : transparent ? [0,0,0,0] : [238,239,250,255];
        bytes.set(color, p);
    }
    const header = Buffer.alloc(13); header.writeUInt32BE(size); header.writeUInt32BE(size,4); header[8]=8; header[9]=6;
    writeFileSync(fileURLToPath(new URL(name, target)), Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(bytes)),chunk('IEND',Buffer.alloc(0))]));
}
writeFileSync(fileURLToPath(new URL('icon.svg', target)), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#eeeffa"/><circle cx="256" cy="256" r="183" fill="white"/><path d="m170 260 61 61 111-108" fill="none" stroke="#6d56d2" stroke-width="46" stroke-linecap="round" stroke-linejoin="round"/><circle cx="341" cy="164" r="23" fill="#6d56d2"/></svg>\n');
