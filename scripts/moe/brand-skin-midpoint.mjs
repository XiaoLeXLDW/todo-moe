// User-approved numerical brightness midpoint; preserve v4 Lab chroma and alpha.
import Jimp from 'jimp-compact';
import {writeFileSync,mkdirSync} from 'node:fs';
const base='apps/mobile/moe/brand/';
const original=await Jimp.read(base+'family-mascot-v2-transparent.png');
const dark=await Jimp.read(base+'family-mascot-v3-skin.png');
const light=await Jimp.read(base+'family-mascot-v4-light.png');
const output=light.clone(),{width:w,height:h}=light.bitmap;
const mask=new Uint8Array(w*h),queue=[880*w+600];
function skin(p){const [r,g,b,a]=original.bitmap.data.subarray(p*4,p*4+4);const x=p%w,y=Math.floor(p/w);return x>310&&x<880&&y>480&&y<960&&a===255&&r>175&&g>100&&b>75&&r-g>5&&g-b>2;}
mask[queue[0]]=1;
for(let k=0;k<queue.length;k++)for(const q of [queue[k]-1,queue[k]+1,queue[k]-w,queue[k]+w])if(q>=0&&q<w*h&&!mask[q]&&skin(q)){mask[q]=1;queue.push(q);}
const linear=v=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4;
const f=v=>v>216/24389?Math.cbrt(v):v*841/108+4/29;
const inverse=v=>v>6/29?v**3:(v-4/29)*108/841;
function lab(rgb){const [r,g,b]=Array.from(rgb,linear);const x=f((.4124564*r+.3575761*g+.1804375*b)/.95047),y=f(.2126729*r+.7151522*g+.072175*b),z=f((.0193339*r+.119192*g+.9503041*b)/1.08883);return [116*y-16,500*(x-y),200*(y-z)];}
function rgb([l,a,b]){const y=(l+16)/116,x=.95047*inverse(y+a/500),z=1.08883*inverse(y-b/200),v=inverse(y);return [3.2404542*x-1.5371385*v-.4985314*z,-.969266*x+1.8760108*v+.041556*z,.0556434*x-.2040259*v+1.0572252*z].map(c=>Math.round(255*Math.max(0,Math.min(1,c<=.0031308?12.92*c:1.055*c**(1/2.4)-.055))));}
const samples=queue.map(p=>{let weight=0;for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)weight+=mask[p+dy*w+dx]||0;return {p,weight:weight/49,dark:lab(dark.bitmap.data.subarray(p*4,p*4+3)),light:lab(light.bitmap.data.subarray(p*4,p*4+3))};});
const mean=key=>samples.reduce((sum,s)=>sum+s[key][0],0)/samples.length;
const darkL=mean('dark'),lightL=mean('light');
const delta=(darkL-lightL)/2/(samples.reduce((sum,s)=>sum+s.weight,0)/samples.length);
for(const s of samples){const color=[...s.light];color[0]+=delta*s.weight;output.bitmap.data.set(rgb(color),s.p*4);}
let outsideChanges=0,alphaChanges=0;
for(let p=0;p<w*h;p++){if(light.bitmap.data[p*4+3]!==output.bitmap.data[p*4+3])alphaChanges++;if(!mask[p]&&[0,1,2].some(c=>light.bitmap.data[p*4+c]!==output.bitmap.data[p*4+c]))outsideChanges++;}
if(outsideChanges||alphaChanges)throw Error('Unexpected non-skin edit');
const actualL=samples.reduce((sum,s)=>sum+lab(output.bitmap.data.subarray(s.p*4,s.p*4+3))[0],0)/samples.length;
const report={darkL,lightL,targetL:(darkL+lightL)/2,actualL,alphaChanges,outsideChanges,method:'CIELAB L midpoint; v4 a/b unchanged before 8-bit rounding'};
await output.writeAsync(base+'family-mascot-v5-mid.png');
mkdirSync('evidence/development/icon-skin-mid',{recursive:true});writeFileSync('evidence/development/icon-skin-mid/verification.json',JSON.stringify(report,null,2));console.log(report);
