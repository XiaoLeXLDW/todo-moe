#!/usr/bin/env node
// Package the generated family artwork with Expo's pinned image tooling.
// The mascot stays a bitmap; the system monochrome mark is a real vector.
import { deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const target = new URL('../../apps/mobile/moe/brand/', import.meta.url);
const sourcePath = fileURLToPath(new URL('family-mascot-v2-transparent.png', target));
const { default: Jimp } = await import('jimp-compact');
const source = await Jimp.read(sourcePath);
let left=source.bitmap.width, top=source.bitmap.height, right=0, bottom=0, transparent=0;
source.scan(0,0,source.bitmap.width,source.bitmap.height,(x,y,i)=>{
  if(source.bitmap.data[i+3]===0){transparent++;return;}
  left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
});
if(transparent < source.bitmap.width*source.bitmap.height*0.1) throw new Error('Mascot source must have real transparent alpha.');
const cropped=source.clone().crop(left,top,right-left+1,bottom-top+1);
// Match Lan Moe's visible tile, not its 9% desktop transparent outer margin.
// Lan Android uses that legacy PNG; this app retains independent adaptive layers.
// Layout is expressed in the visible 72dp viewport inside the 108dp layer.
const layout = { left: 0.13, top: 0.12, height: 0.80 };
const gradient = { top: [44,54,63], bottom: [9,14,18] };
function background(adaptive=false) {
  const canvas = new Jimp(1024,1024,0x000000ff);
  canvas.scan(0,0,1024,1024,(_x,y,i)=>{
    const t = Math.max(0,Math.min(1,adaptive ? (y-1024/6)/(1024*2/3) : y/1023));
    for(let c=0;c<3;c++)canvas.bitmap.data[i+c]=Math.round(gradient.top[c]*(1-t)+gradient.bottom[c]*t);
  });
  return canvas;
}
function mascot(adaptive=false) {
  const viewport = adaptive ? 1024*2/3 : 1024;
  const inset = (1024-viewport)/2;
  const height = Math.round(viewport*layout.height);
  const fg = cropped.clone().resize(Math.round(height*cropped.bitmap.width/cropped.bitmap.height),height);
  return new Jimp(1024,1024,0x00000000).composite(fg,
    Math.round(inset+viewport*layout.left),Math.round(inset+viewport*layout.top));
}
await mascot(true).writeAsync(fileURLToPath(new URL('foreground.png',target)));
await background().composite(mascot(),0,0).writeAsync(fileURLToPath(new URL('icon.png',target)));
await background(true).writeAsync(fileURLToPath(new URL('background.png',target)));
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
const files = ['family-mascot-v1-source.png','family-mascot-v2-transparent.png','icon.png','foreground.png','background.png','monochrome.png','monochrome.svg'];
writeFileSync(fileURLToPath(new URL('asset-manifest.json', target)), JSON.stringify({ artwork: 'family-mascot-checklist-v2-alpha', generator: 'built-in image_gen + user-authorized boundary-connected alpha extraction', packaging: 'Node 22 / pinned Expo image-utils Jimp backend', files: files.map(file => { const b = readFileSync(fileURLToPath(new URL(file,target))); return { file, bytes:b.length, sha256:createHash('sha256').update(b).digest('hex') }; }) }, null, 2)+'\n');
console.log('Packaged Todo Moe family icon, adaptive foreground and monochrome check mark.');
