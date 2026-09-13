// Pixel-measured Lan Moe palette, approved by the user on 2026-09-14.
// Reference: local-lan-device-peeker/assets/branding/lan-moe-source.png.
// 17x17 median samples: base (610,881), forehead (760,660), blush (495,820).
// Corresponding Todo v5 samples: (570,905), (760,620), (402,840).
import Jimp from 'jimp-compact';
import {mkdirSync,writeFileSync} from 'node:fs';
const base='apps/mobile/moe/brand/';
const original=await Jimp.read(base+'family-mascot-v2-transparent.png');
const before=await Jimp.read(base+'family-mascot-v5-mid.png');
const output=before.clone(),{width:w,height:h}=before.bitmap;
const mask=new Uint8Array(w*h),queue=[880*w+600];
function skin(p){const [r,g,b,a]=original.bitmap.data.subarray(p*4,p*4+4);const x=p%w,y=Math.floor(p/w);return x>310&&x<880&&y>480&&y<960&&a===255&&r>175&&g>100&&b>75&&r-g>5&&g-b>2;}
mask[queue[0]]=1;
for(let k=0;k<queue.length;k++)for(const q of [queue[k]-1,queue[k]+1,queue[k]-w,queue[k]+w])if(q>=0&&q<w*h&&!mask[q]&&skin(q)){mask[q]=1;queue.push(q);}
for(const p of queue){const i=p*4,g=before.bitmap.data[i+1];
 // Base delta (+6,-6,-6); blush delta (+5,-7,-8). Smooth interpolation
 // retains the original shading and blush placement instead of repainting it.
 const blush=Math.max(0,Math.min(1,(235-g)/23));
 const delta=[6-blush,-6-blush,-6-2*blush];
 let interior=0;for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)interior+=mask[p+dy*w+dx]||0;
 for(let c=0;c<3;c++)output.bitmap.data[i+c]=Math.max(0,Math.min(255,Math.round(before.bitmap.data[i+c]+delta[c]*interior/49)));
}
const patches=[{name:'base',xy:[570,905],target:[253,229,214]},{name:'forehead',xy:[760,620],target:[253,228,213]},{name:'blush',xy:[402,840],target:[252,205,190]}];
function sample(im,[x,y]){const channels=[[],[],[]];for(let dy=-8;dy<=8;dy++)for(let dx=-8;dx<=8;dx++){const i=im.getPixelIndex(x+dx,y+dy);for(let c=0;c<3;c++)channels[c].push(im.bitmap.data[i+c]);}return channels.map(v=>v.sort((a,b)=>a-b)[Math.floor(v.length/2)]);}
const samples=patches.map(p=>({...p,before:sample(before,p.xy),after:sample(output,p.xy)}));
let outsideChanges=0,alphaChanges=0;
for(let p=0;p<w*h;p++){if(before.bitmap.data[p*4+3]!==output.bitmap.data[p*4+3])alphaChanges++;if(!mask[p]&&[0,1,2].some(c=>before.bitmap.data[p*4+c]!==output.bitmap.data[p*4+c]))outsideChanges++;}
if(outsideChanges||alphaChanges||samples.some(s=>s.after.some((v,c)=>Math.abs(v-s.target[c])>1)))throw Error('Reference matching failed');
await output.writeAsync(base+'family-mascot-v6-reference.png');
const report={samples,alphaChanges,outsideChanges,scope:'Measured 17x17 median skin patches, not whole-image identity'};
mkdirSync('evidence/development/icon-skin-pixels',{recursive:true});writeFileSync('evidence/development/icon-skin-pixels/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
