import { generateRoomsCorridors } from './src/utils/generators/roomsCorridors';

function rectsOverlap(a:any,b:any,pad=0){return !(a.x+a.w+pad<=b.x||b.x+b.w+pad<=a.x||a.y+a.h+pad<=b.y||b.y+b.h+pad<=a.y);}

for (let s = 1; s < 200; s++) {
  const m = generateRoomsCorridors({ width: 32, height: 32, seed: s, density: 0.6, themeId: 'castle', labelRooms: true });
  // count notes per cell-cluster: look for note positions <=2 apart
  const ns = m.notes;
  for (let i=0;i<ns.length;i++) for (let j=i+1;j<ns.length;j++) {
    const dx=Math.abs(ns[i].x-ns[j].x), dy=Math.abs(ns[i].y-ns[j].y);
    if (dx+dy <= 2) {
      console.log(`seed=${s}: ${ns[i].label}(${ns[i].x},${ns[i].y}) + ${ns[j].label}(${ns[j].x},${ns[j].y})`);
    }
  }
}
