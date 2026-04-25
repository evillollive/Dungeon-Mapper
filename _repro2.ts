// Reimplement room placement to dump rooms list
import { makeRng } from './src/utils/generators/random';

function rectsOverlap(a:any,b:any,pad=1){return !(a.x+a.w+pad<=b.x||b.x+b.w+pad<=a.x||a.y+a.h+pad<=b.y||b.y+b.h+pad<=a.y);}

function gen(seed:number, width=32, height=32, density=0.6) {
  const rng = makeRng(seed);
  const minSide = 3;
  const maxSide = Math.max(minSide+2, Math.min(8, Math.floor(Math.min(width,height)/4)));
  const targetRooms = Math.max(3, Math.round((width*height)/60 * Math.max(0,Math.min(1,density))));
  const maxAttempts = targetRooms * 6;
  const rooms:any[] = [];
  for (let i=0;i<maxAttempts && rooms.length<targetRooms;i++){
    const w = rng.int(minSide,maxSide);
    const h = rng.int(minSide,maxSide);
    const x = rng.int(1, Math.max(1, width-w-2));
    const y = rng.int(1, Math.max(1, height-h-2));
    const c = {x,y,w,h};
    if (rooms.some(r=>rectsOverlap(r,c))) continue;
    rooms.push(c);
  }
  return rooms;
}

const rs = gen(8);
console.log('seed 8 rooms:');
for (const r of rs) console.log(r, 'center=',Math.floor(r.x+r.w/2),Math.floor(r.y+r.h/2));
